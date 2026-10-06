import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const adminEmail = 'erick@kgbycia.com';

const decodeJwtPayload = (token: string) => {
  const parts = token.split('.');
  if (parts.length < 2) return null;
  let payload = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const pad = payload.length % 4;
  if (pad) payload += '='.repeat(4 - pad);
  try {
    return JSON.parse(atob(payload));
  } catch {
    return null;
  }
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'Missing server configuration' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const body = await req.json();
  const accessTokenFromBody = body?.accessToken as string | undefined;
  const effectiveAuthHeader = authHeader || (accessTokenFromBody ? `Bearer ${accessTokenFromBody}` : '');
  if (!effectiveAuthHeader) {
    return new Response(JSON.stringify({ error: 'Missing auth header' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false }
  });

  const token = effectiveAuthHeader.startsWith('Bearer ')
    ? effectiveAuthHeader.slice(7)
    : effectiveAuthHeader;
  const payload = decodeJwtPayload(token);
  const userId = payload?.sub as string | undefined;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Invalid JWT' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: adminUser, error: adminUserError } = await adminClient.auth.admin.getUserById(userId);
  if (adminUserError || !adminUser?.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (adminUser.user.email?.toLowerCase() !== adminEmail) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { action, payload: actionPayload } = body || {};

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

  if (action === 'list') {
    const { data, error } = await adminClient
      .from('tenants')
      .select('id,name,status,country,city,address,email,phone,lat,lng,created_at,tenant_members(role,user_id)');
    if (error) {
      return new Response(JSON.stringify({ error: 'List tenants failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ tenants: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (action === 'update') {
    const { id, ...updates } = actionPayload || {};
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { error } = await adminClient.from('tenants').update(updates).eq('id', id);
    if (error) {
      return new Response(JSON.stringify({ error: 'Update tenant failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    await logActivity('tenant_updated', id, 'Datos de taller actualizados');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (action === 'create') {
    const {
      name,
      adminUserId,
      country,
      city,
      address,
      email,
      phone,
      status,
      lat,
      lng
    } = actionPayload || {};

    if (!name || !adminUserId) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { data: createdTenant, error: createTenantError } = await adminClient
      .from('tenants')
      .insert({
        name,
        country: country || null,
        city: city || null,
        address: address || null,
        email: email || null,
        phone: phone || null,
        status: status || 'active',
        lat: lat ?? null,
        lng: lng ?? null
      })
      .select('id')
      .single();

    if (createTenantError || !createdTenant?.id) {
      return new Response(JSON.stringify({ error: 'Tenant creation failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { error: membershipError } = await adminClient
      .from('tenant_members')
      .upsert({ tenant_id: createdTenant.id, user_id: adminUserId, role: 'owner' }, { onConflict: 'tenant_id,user_id' });

    if (membershipError) {
      return new Response(JSON.stringify({ error: 'Membership assignment failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let adminEmailForLog = '';
    try {
      const { data: adminLookup } = await adminClient.auth.admin.getUserById(adminUserId);
      adminEmailForLog = adminLookup?.user?.email || '';
    } catch {
      // ignore
    }

    await logActivity('tenant_created', createdTenant.id, `Taller: ${name}`);
    await logActivity('admin_assigned', createdTenant.id, `Admin: ${adminEmailForLog || adminUserId}`);

    return new Response(JSON.stringify({ ok: true, tenantId: createdTenant.id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (action === 'set_status') {
    const { id, status } = actionPayload || {};
    if (!id || !status) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    const { error } = await adminClient.from('tenants').update({ status }).eq('id', id);
    if (error) {
      return new Response(JSON.stringify({ error: 'Update status failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    await logActivity('tenant_status', id, `Estado: ${status}`);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (action === 'delete') {
    const { id } = actionPayload || {};
    if (!id) {
      return new Response(JSON.stringify({ error: 'Missing id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    await adminClient.from('tenant_members').delete().eq('tenant_id', id);
    const { error } = await adminClient.from('tenants').delete().eq('id', id);
    if (error) {
      return new Response(JSON.stringify({ error: 'Delete failed' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    await logActivity('tenant_deleted', id, 'Taller eliminado');
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  if (action === 'activity_list') {
    const { data, error } = await adminClient
      .from('activity_log')
      .select('action,details,created_at')
      .order('created_at', { ascending: false })
      .limit(15);
    if (error) {
      return new Response(JSON.stringify({ activity: [] }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ activity: data || [] }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Unknown action' }), {
    status: 400,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
});
