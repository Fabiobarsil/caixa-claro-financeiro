import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface SmartState {
  type: "alert" | "insight";
  severity: "attention" | "info";
  message: string;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Validate authentication - require valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("Missing or invalid authorization header");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create client with user token to validate authentication
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseAuth.auth.getClaims(token);
    
    if (claimsError || !claimsData?.claims) {
      console.error("Authentication failed:", claimsError?.message || "Invalid claims");
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Authenticated user:", claimsData.claims.sub);
    
    // Use service role for database operations after authentication is validated
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get all active users (profiles)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("is_active", true);

    if (profilesError) throw profilesError;

    const today = new Date().toISOString().split("T")[0];
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0];

    const results = [];

    for (const profile of profiles || []) {
      const userId = profile.user_id;

      // Check if smart_state already exists for today
      const { data: existingState } = await supabase
        .from("smart_states")
        .select("id")
        .eq("user_id", userId)
        .eq("generated_at", today)
        .maybeSingle();

      if (existingState) {
        results.push({ userId, status: "already_exists" });
        continue;
      }

      // Fetch user's paid entries (income)
      const { data: paidEntries } = await supabase
        .from("entries")
        .select("value")
        .eq("user_id", userId)
        .eq("status", "pago");

      // Fetch user's expenses
      const { data: allExpenses } = await supabase
        .from("expenses")
        .select("value, date")
        .eq("user_id", userId);

      // Calculate current balance
      const totalReceived = (paidEntries || []).reduce(
        (sum, e) => sum + Number(e.value),
        0
      );
      const totalExpenses = (allExpenses || []).reduce(
        (sum, e) => sum + Number(e.value),
        0
      );
      const currentBalance = totalReceived - totalExpenses;

      let smartState: SmartState | null = null;

      // PRIORITY 1: ALERT - Negative balance
      if (currentBalance < 0) {
        smartState = {
          type: "alert",
          severity: "attention",
          message:
            "O saldo ficou negativo hoje. Acompanhar isso de perto pode evitar surpresas.",
        };
      }

      // PRIORITY 2: INSIGHTS (only if no alert)
      if (!smartState) {
        // Get expenses from last 7 days
        const recentExpenses = (allExpenses || []).filter(
          (e) => e.date >= sevenDaysAgo
        );

        // Calculate daily expense totals
        const dailyExpenseMap = new Map<string, number>();
        recentExpenses.forEach((exp) => {
          const current = dailyExpenseMap.get(exp.date) || 0;
          dailyExpenseMap.set(exp.date, current + Number(exp.value));
        });

        const dailyExpenses = Array.from(dailyExpenseMap.values());
        const avgDailyExpense =
          dailyExpenses.length > 0
            ? dailyExpenses.reduce((a, b) => a + b, 0) / dailyExpenses.length
            : 0;

        const todayExpense = dailyExpenseMap.get(today) || 0;

        // INSIGHT: Excessive daily spending
        if (avgDailyExpense > 0 && todayExpense > avgDailyExpense * 1.25) {
          smartState = {
            type: "insight",
            severity: "info",
            message: "Hoje seus gastos ficaram acima do que tem sido comum.",
          };
        }

        // INSIGHT: Inactivity (check if no movement today)
        if (!smartState) {
          // Check for any entry or expense today
          const { count: todayEntriesCount } = await supabase
            .from("entries")
            .select("*", { count: "exact", head: true })
            .eq("user_id", userId)
            .eq("date", today);

          const todayExpenseCount = recentExpenses.filter(
            (e) => e.date === today
          ).length;

          if ((todayEntriesCount || 0) === 0 && todayExpenseCount === 0) {
            // Check if there was any previous activity
            const { count: totalActivityCount } = await supabase
              .from("entries")
              .select("*", { count: "exact", head: true })
              .eq("user_id", userId);

            const hasHistory =
              (totalActivityCount || 0) > 0 || (allExpenses || []).length > 0;

            if (hasHistory) {
              smartState = {
                type: "insight",
                severity: "info",
                message: "Hoje não houve movimentações registradas.",
              };
            }
          }
        }
      }

      // Insert smart_state (or null = silence)
      if (smartState) {
        const { error: insertError } = await supabase
          .from("smart_states")
          .upsert(
            {
              user_id: userId,
              type: smartState.type,
              severity: smartState.severity,
              message: smartState.message,
              generated_at: today,
            },
            { onConflict: "user_id,generated_at" }
          );

        if (insertError) {
          results.push({ userId, status: "error", error: insertError.message });
        } else {
          results.push({ userId, status: "generated", type: smartState.type });
        }
      } else {
        // Silence - no smart_state for today
        results.push({ userId, status: "silence" });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        date: today,
        processed: results.length,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    console.error("Error generating smart states:", error instanceof Error ? error.message : error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
