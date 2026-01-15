import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

// Lista de URLs permitidas para o proxy (whitelist)
const ALLOWED_PROXY_DOMAINS = [
    'n8n.',
    'evolution',
    'webhook.site',
    'hooks.zapier.com',
    'make.com',
    'easypanel.host'  // Added for vtrack webhook
];

serve(async (req) => {
    const url = new URL(req.url);
    let pathname = url.pathname.replace(/^\/crm_api/, '');
    if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
    }
    if (!pathname) pathname = '/';

    const method = req.method;

    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    };

    if (method === "OPTIONS") {
        return new Response('ok', { headers: corsHeaders });
    }

    const jsonResponse = (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    };

    // VALIDAÇÃO DE AUTENTICAÇÃO
    const authHeader = req.headers.get('Authorization') || req.headers.get('apikey');
    const xApiKey = req.headers.get('x-api-key');

    const isValidAnonKey = authHeader === supabaseAnonKey || xApiKey === supabaseAnonKey;
    const isValidJWT = authHeader?.startsWith('Bearer ');

    // Para o proxy-webhook, exigir autenticação
    if (pathname === '/proxy-webhook') {
        if (!isValidAnonKey && !isValidJWT) {
            return jsonResponse({ error: "Unauthorized" }, 401);
        }
    }

    const json = async () => {
        try {
            return await req.json();
        } catch {
            return {};
        }
    };

    // PROXY WEBHOOK - encaminha requisições para webhooks externos
    if (pathname === "/proxy-webhook" && method === "POST") {
        const body = await json();
        const { targetUrl, data } = body;

        if (!targetUrl) {
            return jsonResponse({ error: "Missing targetUrl" }, 400);
        }

        // Verificar se o domínio está na whitelist
        const isAllowed = ALLOWED_PROXY_DOMAINS.some(domain => targetUrl.includes(domain));
        if (!isAllowed) {
            console.log('Domain not in whitelist:', targetUrl);
            return jsonResponse({ error: "Target domain not allowed", domain: targetUrl }, 403);
        }

        try {
            console.log('Proxying to:', targetUrl);
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            const responseData = await response.text();
            console.log('Proxy response:', response.status, responseData);

            return jsonResponse({
                success: true,
                status: response.status,
                data: responseData
            });
        } catch (error) {
            console.error('Proxy error:', error);
            return jsonResponse({ error: "Failed to proxy request", details: String(error) }, 500);
        }
    }

    // LEADS CRUD
    if (pathname === "/leads") {
        if (method === "GET") {
            const { data, error } = await supabase.from("leads").select();
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "POST") {
            const body = await json();
            const { data, error } = await supabase.from("leads").insert(body);
            return jsonResponse({ data, error }, error ? 400 : 201);
        }
    }
    if (pathname.startsWith("/leads/")) {
        const id = pathname.split("/")[2];
        if (method === "GET") {
            const { data, error } = await supabase.from("leads").select().eq("id", id).single();
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "PATCH") {
            const body = await json();
            const { data, error } = await supabase.from("leads").update(body).eq("id", id);
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "DELETE") {
            const { data, error } = await supabase.from("leads").delete().eq("id", id);
            return jsonResponse({ data, error }, error ? 400 : 204);
        }
    }

    // KANBAN COLUMNS CRUD
    if (pathname === "/kanban_columns") {
        if (method === "GET") {
            const { data, error } = await supabase.from("kanban_columns").select();
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "POST") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_columns").insert(body);
            return jsonResponse({ data, error }, error ? 400 : 201);
        }
    }
    if (pathname.startsWith("/kanban_columns/")) {
        const id = pathname.split("/")[2];
        if (method === "PATCH") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_columns").update(body).eq("id", id);
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "DELETE") {
            const { data, error } = await supabase.from("kanban_columns").delete().eq("id", id);
            return jsonResponse({ data, error }, error ? 400 : 204);
        }
    }

    // KANBAN ITEMS CRUD
    if (pathname === "/kanban_items") {
        if (method === "GET") {
            const { data, error } = await supabase.from("kanban_items").select();
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "POST") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_items").insert(body);
            return jsonResponse({ data, error }, error ? 400 : 201);
        }
    }
    if (pathname.startsWith("/kanban_items/")) {
        const id = pathname.split("/")[2];
        if (method === "PATCH") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_items").update(body).eq("id", id);
            return jsonResponse({ data, error }, error ? 400 : 200);
        }
        if (method === "DELETE") {
            const { data, error } = await supabase.from("kanban_items").delete().eq("id", id);
            return jsonResponse({ data, error }, error ? 400 : 204);
        }
    }

    return jsonResponse({ error: "Not found" }, 404);
});
