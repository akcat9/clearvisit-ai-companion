import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.56.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId } = await req.json();
    
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'User ID is required' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Create Supabase client with service role key for admin operations
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    console.log('Starting account deletion for user:', userId);

    // Delete user data in order (respecting foreign key constraints)
    
    // 1. Delete visit records
    const { error: visitRecordsError } = await supabaseAdmin
      .from('visit_records')
      .delete()
      .eq('user_id', userId);
    
    if (visitRecordsError) {
      console.error('Error deleting visit records:', visitRecordsError);
      throw new Error('Failed to delete visit records');
    }
    console.log('Deleted visit records');

    // 2. Delete appointments
    const { error: appointmentsError } = await supabaseAdmin
      .from('appointments')
      .delete()
      .eq('user_id', userId);
    
    if (appointmentsError) {
      console.error('Error deleting appointments:', appointmentsError);
      throw new Error('Failed to delete appointments');
    }
    console.log('Deleted appointments');

    // 3. Delete shared visits (both sent and received)
    // First delete visits sent by this user
    const { error: sharedVisitsSentError } = await supabaseAdmin
      .from('shared_visits')
      .delete()
      .eq('sender_id', userId);
    
    if (sharedVisitsSentError) {
      console.error('Error deleting sent shared visits:', sharedVisitsSentError);
      throw new Error('Failed to delete sent shared visits');
    }
    console.log('Deleted sent shared visits');

    // Get user email to delete received shared visits
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('email')
      .eq('user_id', userId)
      .single();

    if (profileError) {
      console.error('Error getting user profile:', profileError);
    } else if (profileData?.email) {
      // Delete visits received by this user
      const { error: sharedVisitsReceivedError } = await supabaseAdmin
        .from('shared_visits')
        .delete()
        .eq('recipient_email', profileData.email);
      
      if (sharedVisitsReceivedError) {
        console.error('Error deleting received shared visits:', sharedVisitsReceivedError);
        throw new Error('Failed to delete received shared visits');
      }
      console.log('Deleted received shared visits');
    }

    // 4. Delete profile
    const { error: profileDeleteError } = await supabaseAdmin
      .from('profiles')
      .delete()
      .eq('user_id', userId);
    
    if (profileDeleteError) {
      console.error('Error deleting profile:', profileDeleteError);
      throw new Error('Failed to delete profile');
    }
    console.log('Deleted profile');

    // 5. Finally delete the auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authDeleteError) {
      console.error('Error deleting auth user:', authDeleteError);
      throw new Error('Failed to delete auth user');
    }
    console.log('Deleted auth user');

    console.log('Account deletion completed successfully for user:', userId);

    return new Response(
      JSON.stringify({ message: 'Account deleted successfully' }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in delete-user-account function:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});