import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[KIWIFY-WEBHOOK] ${step}${detailsStr}`);
};

// Normalize event types from Kiwify
function normalizeEvent(rawEvent: string): string {
  const event = rawEvent?.toLowerCase().replace(/[\s_-]+/g, '_') || '';
  
  // Activation events
  if (event.includes('compra_aprovada') || 
      event.includes('pagamento_aprovado') ||
      event.includes('assinatura_renovada') ||
      event.includes('order_approved') ||
      event.includes('payment_approved') ||
      event.includes('subscription_activated') ||
      event === 'approved' || event === 'paid' || event === 'pago') {
    return 'ativo';
  }
  
  // Cancellation events
  if (event.includes('assinatura_cancelada') ||
      event.includes('subscription_canceled') ||
      event.includes('chargeback') ||
      event.includes('refund')) {
    return 'cancelado';
  }
  
  // Late payment
  if (event.includes('assinatura_atrasada') ||
      event.includes('payment_overdue') ||
      event.includes('late')) {
    return 'em_atraso';
  }
  
  // Pending payment (PIX generated, boleto, etc)
  if (event.includes('pix_gerado') ||
      event.includes('boleto_gerado') ||
      event.includes('pending') ||
      event.includes('aguardando')) {
    return 'pendente';
  }
  
  return 'unknown';
}

// Map product name to plan
function normalizePlan(rawProduct: string): { plan: string; durationDays: number } {
  const product = rawProduct?.toLowerCase() || '';
  
  if (product.includes('anual') || product.includes('yearly') || product.includes('12')) {
    return { plan: 'anual', durationDays: 365 };
  }
  
  if (product.includes('semestral') || product.includes('6')) {
    return { plan: 'semestral', durationDays: 180 };
  }
  
  // Default to monthly
  return { plan: 'mensal', durationDays: 30 };
}

// Calculate expiration date
function calculateExpiration(durationDays: number): Date {
  const now = new Date();
  now.setDate(now.getDate() + durationDays);
  return now;
}

Deno.serve(async (req) => {
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  // Prepare headers for extraction
  const headersObj: Record<string, string> = {};
  req.headers.forEach((value, key) => {
    headersObj[key] = value;
  });

  // Helper to log request
  const logRequest = async (statusCode: number, reason: string, rawBody: string) => {
    try {
      await supabaseClient.from('webhook_requests').insert({
        status_code: statusCode,
        reason,
        headers: headersObj,
        raw_body: rawBody,
        source: 'kiwify',
      });
    } catch (err) {
      console.error('Failed to log webhook request:', err);
    }
  };

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    await logRequest(405, 'Method not allowed', '');
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let rawBody = '';
  
  try {
    logStep("Webhook received");
    rawBody = await req.text();

    // Validate webhook secret
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      await logRequest(500, 'KIWIFY_WEBHOOK_SECRET not configured', rawBody);
      throw new Error("KIWIFY_WEBHOOK_SECRET is not configured");
    }

    // Get signature from header or body
    const authHeader = req.headers.get("authorization") || '';
    const signature = req.headers.get("x-kiwify-signature") || authHeader.replace("Bearer ", "");
    
    // Also check for token in body
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      await logRequest(400, 'Invalid JSON body', rawBody);
      return new Response(JSON.stringify({ error: "Invalid JSON" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const bodyToken = (payload.token as string) || '';
    
    // Allow simulation from admin panel with special token
    const isAdminSimulation = bodyToken === 'SIMULATION_FROM_ADMIN';
    const validToken = signature === webhookSecret || bodyToken === webhookSecret || isAdminSimulation;
    
    if (!validToken) {
      logStep("Invalid token", { signatureProvided: !!signature, bodyTokenProvided: !!bodyToken });
      await logRequest(403, 'Invalid token', rawBody);
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (isAdminSimulation) {
      logStep("Admin simulation mode");
    }

    logStep("Token validated");

    // Extract email and event
    const customerEmail = (
      (payload.Customer as Record<string, string>)?.email || 
      (payload.customer as Record<string, string>)?.email || 
      (payload.buyer as Record<string, string>)?.email ||
      (payload.email as string) ||
      ''
    ).toLowerCase().trim();

    const rawEvent = (
      (payload.event as string) || 
      (payload.evento as string) ||
      (payload.status as string) || 
      (payload.order_status as string) ||
      ''
    );

    const rawProduct = (
      (payload.Product as Record<string, string>)?.name || 
      (payload.product as Record<string, string>)?.name || 
      (payload.produto as string) ||
      (payload.plan_name as string) ||
      (payload.offer_name as string) ||
      ''
    );

    logStep("Payload parsed", { email: customerEmail, rawEvent, rawProduct });

    if (!customerEmail) {
      await logRequest(400, 'Customer email not found', rawBody);
      return new Response(JSON.stringify({ error: "Customer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize event and plan
    const normalizedEvent = normalizeEvent(rawEvent);
    const { plan: normalizedPlan, durationDays } = normalizePlan(rawProduct);

    logStep("Normalized", { normalizedEvent, normalizedPlan, durationDays });

    if (normalizedEvent === 'unknown') {
      await logRequest(200, `Unhandled event: ${rawEvent}`, rawBody);
      
      // Still log the event
      await supabaseClient.from('webhook_events').insert({
        email: customerEmail,
        raw_event: rawEvent,
        normalized_event: 'unknown',
        raw_product: rawProduct,
        normalized_plan: normalizedPlan,
        subscription_status_applied: 'none',
        success: true,
        error_message: 'Event type not processed',
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Event type not processed" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Find user by email in profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", customerEmail)
      .maybeSingle();

    if (profileError) {
      logStep("Error finding profile", { error: profileError.message });
      await logRequest(500, `Database error: ${profileError.message}`, rawBody);
      throw new Error(`Database error: ${profileError.message}`);
    }

    if (!profile) {
      logStep("No profile found for email", { email: customerEmail });
      await logRequest(200, 'User not found', rawBody);
      
      // Log event anyway
      await supabaseClient.from('webhook_events').insert({
        email: customerEmail,
        raw_event: rawEvent,
        normalized_event: normalizedEvent,
        raw_product: rawProduct,
        normalized_plan: normalizedPlan,
        subscription_status_applied: normalizedEvent,
        success: false,
        error_message: 'User not found in system',
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not found, will be processed on signup" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Profile found", { profileId: profile.id, userId: profile.user_id });

    // Prepare update data based on normalized event
    const now = new Date();
    let updateData: Record<string, unknown> = {};
    let expirationDate: Date | null = null;

    if (normalizedEvent === 'ativo') {
      expirationDate = calculateExpiration(durationDays);
      updateData = {
        subscription_status: 'ativo',
        subscription_plan: normalizedPlan,
        subscription_start_date: now.toISOString(),
        subscription_expiration_date: expirationDate.toISOString(),
        // Also update legacy fields for compatibility
        plan_type: 'paid',
        paid_until: expirationDate.toISOString(),
      };
      logStep("Activating subscription", { plan: normalizedPlan, expiresAt: expirationDate.toISOString() });
      
    } else if (normalizedEvent === 'cancelado') {
      updateData = {
        subscription_status: 'cancelado',
        plan_type: 'free',
      };
      logStep("Canceling subscription");
      
    } else if (normalizedEvent === 'em_atraso') {
      updateData = {
        subscription_status: 'em_atraso',
      };
      logStep("Marking subscription as overdue");
      
    } else if (normalizedEvent === 'pendente') {
      updateData = {
        subscription_status: 'pendente',
      };
      logStep("Marking subscription as pending");
    }

    // Update profile
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("user_id", profile.user_id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError.message });
      await logRequest(500, `Update error: ${updateError.message}`, rawBody);
      
      // Log failed event
      await supabaseClient.from('webhook_events').insert({
        email: customerEmail,
        raw_event: rawEvent,
        normalized_event: normalizedEvent,
        raw_product: rawProduct,
        normalized_plan: normalizedPlan,
        subscription_status_applied: normalizedEvent,
        expiration_date_applied: expirationDate?.toISOString(),
        profile_id: profile.id,
        success: false,
        error_message: updateError.message,
      });

      throw new Error(`Update error: ${updateError.message}`);
    }

    logStep("Profile updated successfully", { userId: profile.user_id });

    // Log successful request
    await logRequest(200, 'Success', rawBody);

    // Log successful event
    await supabaseClient.from('webhook_events').insert({
      email: customerEmail,
      raw_event: rawEvent,
      normalized_event: normalizedEvent,
      raw_product: rawProduct,
      normalized_plan: normalizedPlan,
      subscription_status_applied: normalizedEvent,
      expiration_date_applied: expirationDate?.toISOString(),
      profile_id: profile.id,
      success: true,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Subscription updated",
      status: normalizedEvent,
      plan: normalizedPlan,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("[KIWIFY-WEBHOOK] ERROR:", error instanceof Error ? error.message : error);
    await logRequest(500, error instanceof Error ? error.message : 'Internal error', rawBody);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
