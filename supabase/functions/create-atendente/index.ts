// Edge Function para criar atendentes
// Deploy: supabase functions deploy create-atendente

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const { nome, email, senha, admin_id } = await req.json()

        if (!nome || !email || !senha || !admin_id) {
            return new Response(
                JSON.stringify({ error: 'Campos obrigatórios: nome, email, senha, admin_id' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Criar cliente com Service Role Key (pode criar usuários)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
            { auth: { autoRefreshToken: false, persistSession: false } }
        )

        // Verificar limite de atendentes
        const { data: profile } = await supabaseAdmin
            .from('profiles')
            .select('max_atendentes')
            .eq('id', admin_id)
            .single()

        const { data: existingAtendentes } = await supabaseAdmin
            .from('atendentes')
            .select('id')
            .eq('admin_id', admin_id)

        const currentCount = existingAtendentes?.length || 0
        const maxCount = profile?.max_atendentes || 0

        if (currentCount >= maxCount) {
            return new Response(
                JSON.stringify({ error: `Limite de ${maxCount} atendentes atingido` }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Criar usuário no Auth
        const { data: newUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password: senha,
            email_confirm: true,
            user_metadata: { full_name: nome, is_atendente: true }
        })

        if (authError || !newUser.user) {
            return new Response(
                JSON.stringify({ error: authError?.message || 'Erro ao criar usuário' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        // Criar registro na tabela atendentes
        const { error: insertError } = await supabaseAdmin
            .from('atendentes')
            .insert({
                admin_id,
                user_id: newUser.user.id,
                nome,
                email,
                ativo: true
            })

        if (insertError) {
            // Rollback: deletar usuário criado
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            return new Response(
                JSON.stringify({ error: insertError.message }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify({ success: true, user_id: newUser.user.id }),
            { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
