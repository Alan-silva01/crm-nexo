import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

serve(async (req) => {
    const url = new URL(req.url);
    // Normalize path: remove /crm_api prefix and trailing slashes
    let pathname = url.pathname.replace(/^\/crm_api/, '');
    if (pathname.endsWith('/') && pathname.length > 1) {
        pathname = pathname.slice(0, -1);
    }
    if (!pathname) pathname = '/';

    const method = req.method;

    console.log(`${method} ${url.pathname} -> normalized to ${pathname}`);

    // Helper to parse JSON body
    const json = async () => {
        try {
            return await req.json();
        } catch {
            return {};
        }
    };

    // CORS Headers
    const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Proxy Webhook Route
    if (pathname === "/proxy-webhook" && method === "POST") {
        const body = await json();
        const { targetUrl, data } = body;

        if (!targetUrl) {
            return jsonResponse({ error: "targetUrl is required" }, 400);
        }

        console.log(`Proxying request to: ${targetUrl}`);

        try {
            const response = await fetch(targetUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            // We don't necessarily need to read the response if it's no-cors style, 
            // but for a proxy it's better to show if it worked.
            const responseText = await response.text();
            console.log(`Target response: ${response.status} ${responseText}`);

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
