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

// Get customer name from payload
function getCustomerName(payload: Record<string, unknown>): string {
  return (
    (payload.Customer as Record<string, string>)?.name ||
    (payload.customer as Record<string, string>)?.name ||
    (payload.buyer as Record<string, string>)?.name ||
    (payload.nome as string) ||
    'Usuário'
  );
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

  // Helper to log webhook event
  const logWebhookEvent = async (data: {
    email: string;
    rawEvent: string;
    normalizedEvent: string;
    rawProduct?: string;
    normalizedPlan?: string;
    subscriptionStatusApplied: string;
    expirationDate?: Date | null;
    profileId?: string | null;
    success: boolean;
    errorMessage?: string;
    emailSent?: boolean;
    emailType?: string;
  }) => {
    try {
      await supabaseClient.from('webhook_events').insert({
        email: data.email,
        raw_event: data.rawEvent,
        normalized_event: data.normalizedEvent,
        raw_product: data.rawProduct,
        normalized_plan: data.normalizedPlan,
        subscription_status_applied: data.subscriptionStatusApplied,
        expiration_date_applied: data.expirationDate?.toISOString(),
        profile_id: data.profileId,
        success: data.success,
        error_message: data.errorMessage,
        email_sent: data.emailSent ?? false,
        email_type: data.emailType ?? 'none',
      });
    } catch (err) {
      console.error('Failed to log webhook event:', err);
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

    // Parse payload first to check body.token
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

    // Extract token from multiple sources (in priority order)
    const bodyToken = ((payload.token as string) || '').trim();
    const xKiwifyToken = (req.headers.get("x-kiwify-token") || '').trim();
    const xWebhookToken = (req.headers.get("x-webhook-token") || '').trim();
    const authHeader = req.headers.get("authorization") || '';
    const bearerToken = authHeader.startsWith("Bearer ") 
      ? authHeader.substring(7).trim() 
      : '';
    
    // Get first non-empty token
    const tokenReceived = bodyToken || xKiwifyToken || xWebhookToken || bearerToken;
    const tokenPresent = !!tokenReceived;
    
    logStep("Token sources", { 
      bodyTokenPresent: !!bodyToken,
      xKiwifyTokenPresent: !!xKiwifyToken,
      xWebhookTokenPresent: !!xWebhookToken,
      bearerTokenPresent: !!bearerToken,
      tokenPresent,
    });

    // Allow simulation from admin panel with special token
    const isAdminSimulation = bodyToken === 'SIMULATION_FROM_ADMIN';
    const validToken = isAdminSimulation || (tokenReceived === webhookSecret.trim());
    
    if (!validToken) {
      logStep("Invalid token", { tokenPresent, isAdminSimulation });
      await logRequest(403, 'Invalid token', rawBody);
      
      // Log failed attempt in webhook_events
      const customerEmail = (
        (payload.Customer as Record<string, string>)?.email || 
        (payload.customer as Record<string, string>)?.email || 
        (payload.buyer as Record<string, string>)?.email ||
        (payload.email as string) ||
        'unknown'
      ).toLowerCase().trim();
      
      const rawEvent = (
        (payload.event as string) || 
        (payload.evento as string) ||
        (payload.status as string) || 
        'unknown'
      );
      
      await logWebhookEvent({
        email: customerEmail,
        rawEvent: rawEvent,
        normalizedEvent: 'auth_failed',
        subscriptionStatusApplied: 'none',
        success: false,
        errorMessage: 'invalid_token',
        emailSent: false,
        emailType: 'none',
      });
      
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    
    if (isAdminSimulation) {
      logStep("Admin simulation mode");
    }

    logStep("Token validated");

    // Extract email, event and customer name
    const customerEmail = (
      (payload.Customer as Record<string, string>)?.email || 
      (payload.customer as Record<string, string>)?.email || 
      (payload.buyer as Record<string, string>)?.email ||
      (payload.email as string) ||
      ''
    ).toLowerCase().trim();

    const customerName = getCustomerName(payload);

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

    logStep("Payload parsed", { email: customerEmail, rawEvent, rawProduct, customerName });

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
      
      await logWebhookEvent({
        email: customerEmail,
        rawEvent,
        normalizedEvent: 'unknown',
        rawProduct,
        normalizedPlan,
        subscriptionStatusApplied: 'none',
        success: true,
        errorMessage: 'Event type not processed',
        emailSent: false,
        emailType: 'none',
      });

      return new Response(JSON.stringify({ 
        success: true, 
        message: "Event type not processed" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process activation events for email sending
    if (normalizedEvent !== 'ativo') {
      // Handle non-activation events (cancelado, em_atraso, pendente)
      return await handleNonActivationEvent({
        supabaseClient,
        customerEmail,
        rawEvent,
        normalizedEvent,
        rawProduct,
        normalizedPlan,
        rawBody,
        logRequest,
        logWebhookEvent,
      });
    }

    // ACTIVATION EVENT: Check if user exists in Supabase Auth
    logStep("Processing activation event");
    
    const { data: existingUsers, error: listError } = await supabaseClient.auth.admin.listUsers();
    
    if (listError) {
      logStep("Error listing users", { error: listError.message });
      throw new Error(`Failed to list users: ${listError.message}`);
    }

    const existingUser = existingUsers.users.find(
      u => u.email?.toLowerCase() === customerEmail
    );

    const expirationDate = calculateExpiration(durationDays);
    let emailSent = false;
    let emailType = 'none';
    let profileId: string | null = null;

    if (!existingUser) {
      // NEW USER: Create via invite (sends email automatically)
      logStep("Creating new user via invite", { email: customerEmail, name: customerName });

      const { data: inviteData, error: inviteError } = await supabaseClient.auth.admin.inviteUserByEmail(
        customerEmail,
        {
          data: {
            name: customerName,
            role: 'admin',
            subscription_plan: normalizedPlan,
          },
          redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.supabase.co')}/auth/v1/callback`,
        }
      );

      if (inviteError) {
        logStep("Error inviting user", { error: inviteError.message });
        
        await logRequest(500, `Invite error: ${inviteError.message}`, rawBody);
        await logWebhookEvent({
          email: customerEmail,
          rawEvent,
          normalizedEvent,
          rawProduct,
          normalizedPlan,
          subscriptionStatusApplied: normalizedEvent,
          expirationDate,
          success: false,
          errorMessage: `Failed to invite user: ${inviteError.message}`,
          emailSent: false,
          emailType: 'invite_failed',
        });

        throw new Error(`Failed to invite user: ${inviteError.message}`);
      }

      logStep("User invited successfully", { userId: inviteData.user?.id });
      emailSent = true;
      emailType = 'invite';

      // Wait a moment for the trigger to create profile
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Update the profile with subscription data
      if (inviteData.user?.id) {
        const { data: profile } = await supabaseClient
          .from("profiles")
          .select("id")
          .eq("user_id", inviteData.user.id)
          .maybeSingle();

        if (profile) {
          profileId = profile.id;
          
          await supabaseClient
            .from("profiles")
            .update({
              subscription_status: 'ativo',
              subscription_plan: normalizedPlan,
              subscription_start_date: new Date().toISOString(),
              subscription_expiration_date: expirationDate.toISOString(),
              plan_type: 'paid',
              paid_until: expirationDate.toISOString(),
            })
            .eq("user_id", inviteData.user.id);

          logStep("Profile updated with subscription", { profileId });
        }
      }

    } else {
      // EXISTING USER: Update subscription AND send access email
      logStep("Updating existing user subscription", { userId: existingUser.id });

      const { data: profile, error: profileError } = await supabaseClient
        .from("profiles")
        .select("id, user_id")
        .eq("user_id", existingUser.id)
        .maybeSingle();

      if (profileError) {
        throw new Error(`Profile lookup error: ${profileError.message}`);
      }

      if (profile) {
        profileId = profile.id;

        const { error: updateError } = await supabaseClient
          .from("profiles")
          .update({
            subscription_status: 'ativo',
            subscription_plan: normalizedPlan,
            subscription_start_date: new Date().toISOString(),
            subscription_expiration_date: expirationDate.toISOString(),
            plan_type: 'paid',
            paid_until: expirationDate.toISOString(),
          })
          .eq("user_id", existingUser.id);

        if (updateError) {
          throw new Error(`Profile update error: ${updateError.message}`);
        }

        logStep("Existing user subscription updated", { profileId });
      }

      // Send password reset email to existing user so they can access the system
      const siteUrl = Deno.env.get("SITE_URL") || "https://caixaclaro.app";
      const { error: resetError } = await supabaseClient.auth.resetPasswordForEmail(
        customerEmail,
        {
          redirectTo: `${siteUrl}/reset-password`,
        }
      );

      if (resetError) {
        logStep("Error sending reset email", { error: resetError.message });
        // Don't fail the whole request, just log it
        emailType = 'reset_failed';
      } else {
        logStep("Reset email sent to existing user", { email: customerEmail });
        emailSent = true;
        emailType = 'reset';
      }
    }

    // Log success
    await logRequest(200, 'Success', rawBody);
    await logWebhookEvent({
      email: customerEmail,
      rawEvent,
      normalizedEvent,
      rawProduct,
      normalizedPlan,
      subscriptionStatusApplied: normalizedEvent,
      expirationDate,
      profileId,
      success: true,
      emailSent,
      emailType,
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: emailSent ? "User invited and subscription activated" : "Subscription updated",
      status: normalizedEvent,
      plan: normalizedPlan,
      emailSent,
      emailType,
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

// Handle non-activation events (cancelado, em_atraso, pendente)
// deno-lint-ignore no-explicit-any
async function handleNonActivationEvent(params: {
  supabaseClient: any;
  customerEmail: string;
  rawEvent: string;
  normalizedEvent: string;
  rawProduct: string;
  normalizedPlan: string;
  rawBody: string;
  logRequest: (statusCode: number, reason: string, rawBody: string) => Promise<void>;
  logWebhookEvent: (data: {
    email: string;
    rawEvent: string;
    normalizedEvent: string;
    rawProduct?: string;
    normalizedPlan?: string;
    subscriptionStatusApplied: string;
    expirationDate?: Date | null;
    profileId?: string | null;
    success: boolean;
    errorMessage?: string;
    emailSent?: boolean;
    emailType?: string;
  }) => Promise<void>;
}) {
  const { 
    supabaseClient, 
    customerEmail, 
    rawEvent, 
    normalizedEvent, 
    rawProduct, 
    normalizedPlan, 
    rawBody,
    logRequest,
    logWebhookEvent,
  } = params;

  logStep("Processing non-activation event", { event: normalizedEvent });

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
    
    await logWebhookEvent({
      email: customerEmail,
      rawEvent,
      normalizedEvent,
      rawProduct,
      normalizedPlan,
      subscriptionStatusApplied: normalizedEvent,
      success: false,
      errorMessage: 'User not found in system',
      emailSent: false,
      emailType: 'none',
    });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "User not found" 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Prepare update data
  let updateData: Record<string, unknown> = {};

  if (normalizedEvent === 'cancelado') {
    updateData = {
      subscription_status: 'cancelado',
      plan_type: 'free',
    };
  } else if (normalizedEvent === 'em_atraso') {
    updateData = {
      subscription_status: 'em_atraso',
    };
  } else if (normalizedEvent === 'pendente') {
    updateData = {
      subscription_status: 'pendente',
    };
  }

  // Update profile
  const { error: updateError } = await supabaseClient
    .from("profiles")
    .update(updateData)
    .eq("user_id", profile.user_id as string);

  if (updateError) {
    logStep("Error updating profile", { error: updateError.message });
    await logRequest(500, `Update error: ${updateError.message}`, rawBody);
    
    await logWebhookEvent({
      email: customerEmail,
      rawEvent,
      normalizedEvent,
      rawProduct,
      normalizedPlan,
      subscriptionStatusApplied: normalizedEvent,
      profileId: profile.id as string,
      success: false,
      errorMessage: updateError.message,
      emailSent: false,
      emailType: 'none',
    });

    throw new Error(`Update error: ${updateError.message}`);
  }

  logStep("Profile updated successfully", { userId: profile.user_id, status: normalizedEvent });

  await logRequest(200, 'Success', rawBody);
  await logWebhookEvent({
    email: customerEmail,
    rawEvent,
    normalizedEvent,
    rawProduct,
    normalizedPlan,
    subscriptionStatusApplied: normalizedEvent,
    profileId: profile.id as string,
    success: true,
    emailSent: false,
    emailType: 'none',
  });

  return new Response(JSON.stringify({ 
    success: true, 
    message: "Subscription status updated",
    status: normalizedEvent,
  }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
