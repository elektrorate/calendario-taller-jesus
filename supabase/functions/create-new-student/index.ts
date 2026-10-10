import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// This endpoint belonged to the legacy tenant model and is not used by the app.
// Keep the deployed name safe until the remote function is explicitly removed.
serve(async (req) => {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
    return new Response(JSON.stringify({ error: 'This legacy endpoint is no longer available.' }), {
        status: 410,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
});
