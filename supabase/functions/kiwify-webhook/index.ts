import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-kiwify-signature",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[KIWIFY-WEBHOOK] ${step}${detailsStr}`);
};

// Validate Kiwify signature
function validateSignature(payload: string, signature: string, secret: string): boolean {
  // Kiwify uses a simple token-based validation
  // In production, implement proper HMAC validation if Kiwify supports it
  return signature === secret;
}

// Calculate paid_until based on subscription period
function calculatePaidUntil(plan: string): Date {
  const now = new Date();
  
  // Common Kiwify plan patterns (adjust based on actual plan names)
  if (plan?.toLowerCase().includes('anual') || plan?.toLowerCase().includes('yearly')) {
    now.setFullYear(now.getFullYear() + 1);
  } else if (plan?.toLowerCase().includes('semestral') || plan?.toLowerCase().includes('6')) {
    now.setMonth(now.getMonth() + 6);
  } else {
    // Default to monthly
    now.setMonth(now.getMonth() + 1);
  }
  
  return now;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only accept POST
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    logStep("Webhook received");

    // Validate webhook secret
    const webhookSecret = Deno.env.get("KIWIFY_WEBHOOK_SECRET");
    if (!webhookSecret) {
      throw new Error("KIWIFY_WEBHOOK_SECRET is not configured");
    }

    const signature = req.headers.get("x-kiwify-signature") || req.headers.get("authorization");
    const rawBody = await req.text();
    
    // Validate signature (token-based for now)
    if (!signature || !validateSignature(rawBody, signature.replace("Bearer ", ""), webhookSecret)) {
      logStep("Invalid signature", { signature: signature?.substring(0, 10) + "..." });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Signature validated");

    // Parse payload
    const payload = JSON.parse(rawBody);
    logStep("Payload parsed", { 
      event: payload.event || payload.status,
      email: payload.Customer?.email || payload.customer?.email 
    });

    // Extract event type and customer info
    // Kiwify webhook structure can vary, handle common patterns
    const eventType = payload.event || payload.status || payload.order_status;
    const customerEmail = 
      payload.Customer?.email || 
      payload.customer?.email || 
      payload.buyer?.email ||
      payload.email;
    const planName = 
      payload.Product?.name || 
      payload.product?.name || 
      payload.plan_name ||
      payload.offer_name ||
      '';

    if (!customerEmail) {
      logStep("No customer email found in payload");
      return new Response(JSON.stringify({ error: "Customer email not found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create Supabase client with service role for updates
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Find user by email in profiles
    const { data: profile, error: profileError } = await supabaseClient
      .from("profiles")
      .select("id, user_id, email")
      .eq("email", customerEmail.toLowerCase())
      .maybeSingle();

    if (profileError) {
      logStep("Error finding profile", { error: profileError.message });
      throw new Error(`Database error: ${profileError.message}`);
    }

    if (!profile) {
      logStep("No profile found for email", { email: customerEmail });
      // Return success anyway - user might sign up later
      return new Response(JSON.stringify({ 
        success: true, 
        message: "User not found, will be processed on signup" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    logStep("Profile found", { userId: profile.user_id });

    // Determine action based on event type
    const activationEvents = [
      'order_approved', 
      'order_completed',
      'payment_approved',
      'pagamento_aprovado',
      'subscription_activated',
      'assinatura_ativa',
      'approved',
      'paid',
      'pago'
    ];

    const cancellationEvents = [
      'order_refunded',
      'subscription_canceled',
      'subscription_cancelled',
      'assinatura_cancelada',
      'cancelamento',
      'refunded',
      'chargeback',
      'expired'
    ];

    const normalizedEvent = eventType?.toLowerCase().replace(/[_\s]/g, '_');
    
    let updateData: Record<string, unknown>;

    if (activationEvents.some(e => normalizedEvent?.includes(e.toLowerCase()))) {
      // Activate subscription
      const paidUntil = calculatePaidUntil(planName);
      updateData = {
        plan_type: 'paid',
        subscription_status: 'active',
        subscription_source: 'kiwify',
        paid_until: paidUntil.toISOString(),
      };
      logStep("Activating subscription", { paidUntil: paidUntil.toISOString(), plan: planName });
      
    } else if (cancellationEvents.some(e => normalizedEvent?.includes(e.toLowerCase()))) {
      // Cancel subscription
      updateData = {
        plan_type: 'free',
        subscription_status: 'inactive',
        paid_until: new Date().toISOString(),
      };
      logStep("Canceling subscription");
      
    } else {
      logStep("Unhandled event type", { eventType });
      return new Response(JSON.stringify({ 
        success: true, 
        message: "Event type not processed" 
      }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update profile
    const { error: updateError } = await supabaseClient
      .from("profiles")
      .update(updateData)
      .eq("user_id", profile.user_id);

    if (updateError) {
      logStep("Error updating profile", { error: updateError.message });
      throw new Error(`Update error: ${updateError.message}`);
    }

    logStep("Profile updated successfully", { userId: profile.user_id });

    return new Response(JSON.stringify({ 
      success: true, 
      message: "Subscription updated",
      user_id: profile.user_id 
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
