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

    // Use anon key with Authorization header to authenticate user
    const authClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization") || "" }
        }
      }
    );

    const { data: { user }, error: userError } = await authClient.auth.getUser();
    if (userError || !user?.id) {
      throw new Error(`Authentication error: ${userError?.message || 'Auth session missing!'}`);
    }

    console.log("[CHECK-SUBSCRIPTION] Checking for user:", user.id);

    // Use service role for DB query to bypass RLS safely in function
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Query subscriptions table for active subscription
    const { data: subscriptions, error: subError } = await serviceClient
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
