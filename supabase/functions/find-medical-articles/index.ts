import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { reason, symptoms } = await req.json();

    // Create search query
    const searchQuery = `${reason}${symptoms ? ` ${symptoms}` : ''} medical information Mayo Clinic WebMD Healthline`;

    // Use a simple search approach - in a real implementation you'd want to use a proper search API
    const searchResults = [
      {
        title: `Understanding ${reason} - Mayo Clinic`,
        url: `https://www.mayoclinic.org/diseases-conditions/${reason.toLowerCase().replace(/\s+/g, '-')}/symptoms-causes/syc-20350656`,
        source: 'Mayo Clinic'
      },
      {
        title: `${reason} Information - WebMD`,
        url: `https://www.webmd.com/search/search_results/default.aspx?query=${encodeURIComponent(reason)}`,
        source: 'WebMD'
      },
      {
        title: `${reason} Treatment Options - Healthline`,
        url: `https://www.healthline.com/search?q1=${encodeURIComponent(reason)}`,
        source: 'Healthline'
      }
    ];

    return new Response(JSON.stringify({ articles: searchResults }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in find-medical-articles function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});