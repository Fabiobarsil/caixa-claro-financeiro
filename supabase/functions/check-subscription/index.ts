import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // First check local subscription table
    const { data: subscription, error: subError } = await supabaseClient
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError) {
      logStep("Error fetching subscription", { error: subError.message });
    }

    // Calculate trial days used
    let trialDaysUsed = 0;
    let firstActivityDate = subscription?.first_activity_date;
    
    if (!subscription) {
      // Create subscription record if it doesn't exist
      const { error: insertError } = await supabaseClient
        .from("subscriptions")
        .insert({
          user_id: user.id,
          first_activity_date: new Date().toISOString().split('T')[0],
        });
      
      if (insertError) {
        logStep("Error creating subscription", { error: insertError.message });
      } else {
        firstActivityDate = new Date().toISOString().split('T')[0];
        logStep("Created new subscription record");
      }
    } else if (firstActivityDate) {
      const firstDate = new Date(firstActivityDate);
      const today = new Date();
      trialDaysUsed = Math.floor((today.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24));
      logStep("Trial days calculated", { trialDaysUsed, firstActivityDate });
    }

    // Check Stripe for active subscription
    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No Stripe customer found");
      
      // Update local subscription if needed
      if (subscription && (subscription.plan_type !== 'free' || subscription.subscription_status !== 'inactive')) {
        await supabaseClient
          .from("subscriptions")
          .update({
            plan_type: 'free',
            subscription_status: 'inactive',
            trial_days_used: trialDaysUsed,
          })
          .eq("user_id", user.id);
      } else if (subscription) {
        await supabaseClient
          .from("subscriptions")
          .update({ trial_days_used: trialDaysUsed })
          .eq("user_id", user.id);
      }

      return new Response(JSON.stringify({
        subscribed: false,
        plan_type: 'free',
        trial_days_used: trialDaysUsed,
        trial_days_remaining: Math.max(0, 14 - trialDaysUsed),
        trial_expired: trialDaysUsed > 14,
        first_activity_date: firstActivityDate,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionEnd = null;
    let productId = null;

    if (hasActiveSub) {
      const stripeSub = subscriptions.data[0];
      subscriptionEnd = new Date(stripeSub.current_period_end * 1000).toISOString();
      productId = stripeSub.items.data[0]?.price?.product as string;
      logStep("Active subscription found", { subscriptionId: stripeSub.id, endDate: subscriptionEnd });

      // Update local subscription
      await supabaseClient
        .from("subscriptions")
        .update({
          plan_type: 'paid',
          subscription_status: 'active',
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSub.id,
          current_period_end: subscriptionEnd,
          trial_days_used: trialDaysUsed,
        })
        .eq("user_id", user.id);
    } else {
      logStep("No active Stripe subscription found");
      
      // Update to inactive
      await supabaseClient
        .from("subscriptions")
        .update({
          plan_type: 'free',
          subscription_status: 'inactive',
          stripe_customer_id: customerId,
          trial_days_used: trialDaysUsed,
        })
        .eq("user_id", user.id);
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: hasActiveSub ? 'paid' : 'free',
      product_id: productId,
      subscription_end: subscriptionEnd,
      trial_days_used: trialDaysUsed,
      trial_days_remaining: hasActiveSub ? null : Math.max(0, 14 - trialDaysUsed),
      trial_expired: !hasActiveSub && trialDaysUsed > 14,
      first_activity_date: firstActivityDate,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
