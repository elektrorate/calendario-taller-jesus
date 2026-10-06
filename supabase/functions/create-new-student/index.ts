
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // IMPROVED AUTHENTICATION DEBUGGING
        // Instead of relying on the client passing the session via supabaseClient,
        // we manually inspect the Authorization header.
        const authHeader = req.headers.get('Authorization');

        if (!authHeader) {
            console.error('Edge Function Error: No Authorization header provided');
            return new Response(JSON.stringify({ error: 'Unauthorized: No Authorization header' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            });
        }

        // Verify token with Supabase Client
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        )

        const {
            data: { user },
            error: authError
        } = await supabaseClient.auth.getUser()

        if (authError || !user) {
            console.error('Edge Function Auth Error:', authError, 'Header:', authHeader.substring(0, 20) + '...');
            return new Response(JSON.stringify({
                error: 'Unauthorized: Invalid Token',
                details: authError,
                auth_header_preview: authHeader.substring(0, 10) + '...'
            }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 401,
            })
        }

        // Initialize Admin Client for privileged operations
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { email, password, studentData } = await req.json()

        if (!email || !password) {
            return new Response(JSON.stringify({ error: 'Email and password are required' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            })
        }

        // 1. Create the Auth User
        const { data: userData, error: createError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // Auto-confirm email so they can login immediately
            user_metadata: {
                name: studentData.name,
                surname: studentData.surname,
                role: 'cliente' // Default role
            }
        })

        if (createError) throw createError

        // 2. Insert into public.students table
        // Using hardcoded tenant_id verified from DB: 'f94e0a63-e08b-49df-b72a-bf54e917e91b'
        const tenantId = 'f94e0a63-e08b-49df-b72a-bf54e917e91b'

        const { data: student, error: insertError } = await supabaseAdmin
            .from('students')
            .insert({
                id: userData.user.id, // SAME ID as Auth User
                tenant_id: tenantId,
                name: studentData.name,
                surname: studentData.surname, // Nullable
                email: email,
                phone: studentData.phone || '', // Fix: Ensure NOT NULL constraint is satisfied
                classes_remaining: studentData.classesRemaining || 4,
                status: studentData.status || 'active',
                payment_method: studentData.paymentMethod,
                class_type: studentData.classType,
                price: studentData.price,
                notes: studentData.notes,
                birth_day: studentData.birthDay,
                birth_month: studentData.birthMonth,
                birth_year: studentData.birthYear
            })
            .select()
            .single()

        if (insertError) {
            // Cleanup: delete the auth user if DB insert fails to maintain consistency
            await supabaseAdmin.auth.admin.deleteUser(userData.user.id)
            throw insertError
        }

        return new Response(JSON.stringify({ student, user: userData.user }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
