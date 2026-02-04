import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    // Create admin client with service role
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });

    // Get the authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the caller is a system admin
    const token = authHeader.replace("Bearer ", "");
    const { data: { user: callerUser }, error: authError } = await supabaseAdmin.auth.getUser(token);
    
    if (authError || !callerUser) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if caller is system admin
    const { data: callerProfile, error: profileError } = await supabaseAdmin
      .from("profiles")
      .select("is_system_admin")
      .eq("user_id", callerUser.id)
      .single();

    if (profileError || !callerProfile?.is_system_admin) {
      return new Response(
        JSON.stringify({ error: "Acesso negado. Apenas administradores do sistema podem excluir usuários." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get the user_id to delete from request body
    const { user_id } = await req.json();
    
    if (!user_id) {
      return new Response(
        JSON.stringify({ error: "ID do usuário é obrigatório" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent self-deletion
    if (user_id === callerUser.id) {
      return new Response(
        JSON.stringify({ error: "Você não pode excluir sua própria conta" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if target user exists and is not a system admin
    const { data: targetProfile, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id, is_system_admin, name, email, account_id")
      .eq("user_id", user_id)
      .single();

    if (targetError) {
      return new Response(
        JSON.stringify({ error: "Usuário não encontrado" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (targetProfile?.is_system_admin) {
      return new Response(
        JSON.stringify({ error: "Não é possível excluir outro administrador do sistema" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETE-USER] Starting deletion of user ${user_id} (${targetProfile.email})`);

    // Step 1: Nullify webhook_events profile_id reference (preserves audit history)
    const { error: webhookError } = await supabaseAdmin
      .from("webhook_events")
      .update({ profile_id: null })
      .eq("profile_id", targetProfile.id);
    
    if (webhookError) {
      console.error("[DELETE-USER] Error nullifying webhook_events:", webhookError);
    } else {
      console.log("[DELETE-USER] Webhook events profile references nullified");
    }

    // Step 2: Delete smart_states
    const { error: smartStatesError } = await supabaseAdmin
      .from("smart_states")
      .delete()
      .eq("user_id", user_id);
    
    if (smartStatesError) {
      console.error("[DELETE-USER] Error deleting smart_states:", smartStatesError);
    }

    // Step 3: Delete entry_schedules
    const { error: schedulesError } = await supabaseAdmin
      .from("entry_schedules")
      .delete()
      .eq("user_id", user_id);
    
    if (schedulesError) {
      console.error("[DELETE-USER] Error deleting entry_schedules:", schedulesError);
    }

    // Step 4: Delete transactions
    const { error: transactionsError } = await supabaseAdmin
      .from("transactions")
      .delete()
      .eq("user_id", user_id);
    
    if (transactionsError) {
      console.error("[DELETE-USER] Error deleting transactions:", transactionsError);
    }

    // Step 5: Delete expenses
    const { error: expensesError } = await supabaseAdmin
      .from("expenses")
      .delete()
      .eq("user_id", user_id);
    
    if (expensesError) {
      console.error("[DELETE-USER] Error deleting expenses:", expensesError);
    }

    // Step 6: Delete clients
    const { error: clientsError } = await supabaseAdmin
      .from("clients")
      .delete()
      .eq("user_id", user_id);
    
    if (clientsError) {
      console.error("[DELETE-USER] Error deleting clients:", clientsError);
    }

    // Step 7: Delete services_products
    const { error: servicesError } = await supabaseAdmin
      .from("services_products")
      .delete()
      .eq("user_id", user_id);
    
    if (servicesError) {
      console.error("[DELETE-USER] Error deleting services_products:", servicesError);
    }

    // Step 8: Delete terms_acceptance
    const { error: termsError } = await supabaseAdmin
      .from("terms_acceptance")
      .delete()
      .eq("user_id", user_id);
    
    if (termsError) {
      console.error("[DELETE-USER] Error deleting terms_acceptance:", termsError);
    }

    // Step 9: Delete subscriptions
    const { error: subscriptionsError } = await supabaseAdmin
      .from("subscriptions")
      .delete()
      .eq("user_id", user_id);
    
    if (subscriptionsError) {
      console.error("[DELETE-USER] Error deleting subscriptions:", subscriptionsError);
    }

    // Step 10: Delete user_roles
    const { error: rolesError } = await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", user_id);
    
    if (rolesError) {
      console.error("[DELETE-USER] Error deleting user_roles:", rolesError);
    }

    // Step 11: Delete profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("user_id", user_id);
    
    if (profileDeleteError) {
      console.error("[DELETE-USER] Error deleting profile:", profileDeleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir perfil do usuário" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("[DELETE-USER] All related data deleted, now deleting auth user");

    // Step 12: Delete user from auth
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user_id);

    if (deleteError) {
      console.error("[DELETE-USER] Error deleting auth user:", deleteError);
      return new Response(
        JSON.stringify({ error: "Erro ao excluir usuário da autenticação" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[DELETE-USER] User ${user_id} (${targetProfile.email}) deleted successfully by system admin ${callerUser.id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Usuário ${targetProfile.name || targetProfile.email} excluído com sucesso` 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[DELETE-USER] Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
