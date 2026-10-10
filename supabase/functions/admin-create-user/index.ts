import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing server configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) {
    return new Response(JSON.stringify({ error: 'Missing auth header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const accessToken = authHeader.slice(7).trim();
  const authClient = createClient(supabaseUrl, anonKey, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } }
  });
  const { data: { user }, error: authError } = await authClient.auth.getUser(accessToken);
  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });
  const { data: callerProfile, error: profileError } = await adminClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profileError || callerProfile?.role !== 'super_admin') {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const userId = user.id;
  const body = await req.json();

  const logActivity = async (actionName: string, tenantId?: string, details?: string) => {
    try {
      await adminClient.from('activity_log').insert({
        tenant_id: tenantId ?? null,
        actor_user_id: userId,
        action: actionName,
        details: details || null
      });
    } catch {
      // ignore if table doesn't exist
    }
  };

  const { email, password, name, phone } = body || {};
  if (!email || !password) {
    return new Response(JSON.stringify({ error: 'Missing fields' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  let targetUserId: string | null = null;
  const { data: existingUser, error: existingUserError } = await adminClient.auth.admin.getUserByEmail(email);
  if (existingUserError) {
    return new Response(JSON.stringify({ error: 'User lookup failed' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (existingUser.user) {
    targetUserId = existingUser.user.id;
    if (name || phone) {
      await adminClient.auth.admin.updateUserById(targetUserId, {
        user_metadata: {
          ...(name ? { name } : {}),
          ...(phone ? { phone } : {})
        }
      });
    }
  } else {
    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {})
      }
    });
    if (createError || !created.user) {
      return new Response(JSON.stringify({ error: 'User creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    targetUserId = created.user.id;
  }

  await logActivity('admin_created', undefined, `Admin: ${email}`);

  return new Response(JSON.stringify({ ok: true, userId: targetUserId }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
