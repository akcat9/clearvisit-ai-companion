import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[CHECK-SUBSCRIPTION] Function started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`);
    }
    
    const user = userData.user;
    if (!user?.id) {
      throw new Error("User not authenticated");
    }

    console.log("[CHECK-SUBSCRIPTION] Checking for user:", user.id);

    // Query subscriptions table for active subscription
    const { data: subscriptions, error: subError } = await supabaseClient
      .from('subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .order('current_period_end', { ascending: false })
      .limit(1);

    if (subError) {
      console.error("[CHECK-SUBSCRIPTION] Database error:", subError);
      throw new Error(`Database error: ${subError.message}`);
    }

    const hasActiveSub = subscriptions && subscriptions.length > 0;
    const subscription = hasActiveSub ? subscriptions[0] : null;

    console.log("[CHECK-SUBSCRIPTION] Active subscription:", hasActiveSub);

    return new Response(
      JSON.stringify({
        subscribed: hasActiveSub,
        plan_id: subscription?.plan_id || null,
        expires_at: subscription?.current_period_end || null,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("[CHECK-SUBSCRIPTION] ERROR:", errorMessage);
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
