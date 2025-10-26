import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[SEND-SUBSCRIPTION-EMAIL] Function started");

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
    if (!user?.email) {
      throw new Error("User email not found");
    }

    console.log("[SEND-SUBSCRIPTION-EMAIL] Sending to:", user.email);

    // Get user's first name from profiles
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('first_name')
      .eq('user_id', user.id)
      .single();

    const firstName = profile?.first_name || 'there';

    // Send email via Resend
    const emailResponse = await resend.emails.send({
      from: "tadoc <onboarding@resend.dev>",
      to: [user.email],
      subject: "Purchase subscription for tadoc for full access",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #333;">Hi ${firstName},</h1>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            Welcome to tadoc!
          </p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #555;">
            To unlock full access to all features, please subscribe to tadoc by clicking the link below:
          </p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="https://tadoc-engage-connect.lovable.app/" 
               style="background-color: #4CAF50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 4px; font-size: 16px; display: inline-block;">
              Subscribe to tadoc →
            </a>
          </div>
          
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            Click on the website link to subscribe to tadoc for full access. Instructions are on the website.
          </p>
          
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            Once you've subscribed, return to the tadoc app and all features will be unlocked automatically.
          </p>
          
          <p style="font-size: 14px; line-height: 1.6; color: #666; margin-top: 30px;">
            Questions? Just reply to this email.
          </p>
          
          <p style="font-size: 14px; line-height: 1.6; color: #666;">
            Best,<br>
            The tadoc Team
          </p>
        </div>
      `,
    });

    console.log("[SEND-SUBSCRIPTION-EMAIL] Email sent successfully:", emailResponse);

    return new Response(
      JSON.stringify({ success: true, message: "Email sent successfully" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: any) {
    console.error("[SEND-SUBSCRIPTION-EMAIL] ERROR:", error);
    
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
