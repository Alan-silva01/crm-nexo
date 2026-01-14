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
    'make.com'
];

serve(async (req) => {
    const url = new URL(req.url);
    // Normalize path: remove /crm_api prefix and trailing slashes
    let pathname = url.pathname.replace(/^\/crm_api/, '');
    if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
    }
    if (!pathname) pathname = '/';

    const method = req.method;

    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
    };

    // Handle OPTIONS request for CORS
    if (method === "OPTIONS") {
        return new Response('ok', { headers: corsHeaders });
    }

    // Helper to send JSON response with CORS
    const jsonResponse = (data: any, status = 200) => {
        return new Response(JSON.stringify(data), {
            status,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    };

    // ===========================================
    // 🔒 VALIDAÇÃO DE AUTENTICAÇÃO (SEGURANÇA)
    // ===========================================
    const authHeader = req.headers.get('Authorization') || req.headers.get('apikey');
    const xApiKey = req.headers.get('x-api-key');

    // Verificar se tem algum tipo de autenticação
    const hasAuth = authHeader?.includes('Bearer') ||
        authHeader === supabaseAnonKey ||
        authHeader === supabaseServiceRole ||
        xApiKey === supabaseAnonKey ||
        xApiKey === supabaseServiceRole;

    // Rotas que NÃO precisam de autenticação (públicas)
    const publicRoutes = ['/health', '/'];
    const isPublicRoute = publicRoutes.includes(pathname);

    if (!isPublicRoute && !hasAuth) {
        console.warn(`Unauthorized request to ${pathname}`);
        return jsonResponse({
            error: "Unauthorized",
            message: "Missing or invalid API key. Use 'Authorization: Bearer <key>' or 'apikey' header."
        }, 401);
    }

    // Helper to parse JSON body
    const json = async () => {
        try {
            return await req.json();
        } catch {
            return {};
        }
    };

    // Proxy Webhook Route (with SSRF protection)
    if (pathname === "/proxy-webhook" && method === "POST") {
        const body = await json();
        const { targetUrl, data } = body;

        if (!targetUrl) {
            return jsonResponse({ error: "targetUrl is required" }, 400);
        }

        // 🔒 PROTEÇÃO CONTRA SSRF: Validar URL contra whitelist
        try {
            const urlObj = new URL(targetUrl);
            const isAllowed = ALLOWED_PROXY_DOMAINS.some(domain =>
                urlObj.hostname.includes(domain)
            );

            // Bloquear URLs internas/localhost
            const isInternal = urlObj.hostname === 'localhost' ||
                urlObj.hostname === '127.0.0.1' ||
                urlObj.hostname.startsWith('192.168.') ||
                urlObj.hostname.startsWith('10.') ||
                urlObj.hostname.includes('.internal');

            if (!isAllowed || isInternal) {
                console.warn(`Blocked proxy request to unauthorized URL: ${targetUrl}`);
                return jsonResponse({
                    error: "URL not allowed",
                    message: "Target URL is not in the allowed list"
                }, 403);
            }
        } catch (e) {
            return jsonResponse({ error: "Invalid URL format" }, 400);
        }

        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const responseText = await response.text();

            return jsonResponse({
                success: response.ok,
                status: response.status,
                message: responseText
            });
        } catch (error: any) {
            console.error(`Proxy error: ${error.message}`);
            return jsonResponse({ error: error.message }, 500);
        }
    }

    // Routes
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

    // Similar routes for kanban_columns
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

    // Routes for kanban_items
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
