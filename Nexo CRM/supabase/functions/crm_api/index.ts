import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseServiceRole);

serve(async (req) => {
    const url = new URL(req.url);
    const pathname = url.pathname;
    const method = req.method;

    // Helper to parse JSON body
    const json = async () => {
        try {
            return await req.json();
        } catch {
            return {};
        }
    };

    // Routes
    if (pathname === "/leads") {
        if (method === "GET") {
            const { data, error } = await supabase.from("leads").select();
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } });
        }
        if (method === "POST") {
            const body = await json();
            const { data, error } = await supabase.from("leads").insert(body);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 201, headers: { "Content-Type": "application/json" } });
        }
    }

    if (pathname.startsWith("/leads/")) {
        const id = pathname.split("/")[2];
        if (method === "PATCH") {
            const body = await json();
            const { data, error } = await supabase.from("leads").update(body).eq("id", id);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } });
        }
        if (method === "DELETE") {
            const { data, error } = await supabase.from("leads").delete().eq("id", id);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 204, headers: { "Content-Type": "application/json" } });
        }
    }

    // Similar routes for kanban_columns
    if (pathname === "/kanban_columns") {
        if (method === "GET") {
            const { data, error } = await supabase.from("kanban_columns").select();
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } });
        }
        if (method === "POST") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_columns").insert(body);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 201, headers: { "Content-Type": "application/json" } });
        }
    }
    if (pathname.startsWith("/kanban_columns/")) {
        const id = pathname.split("/")[2];
        if (method === "PATCH") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_columns").update(body).eq("id", id);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } });
        }
        if (method === "DELETE") {
            const { data, error } = await supabase.from("kanban_columns").delete().eq("id", id);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 204, headers: { "Content-Type": "application/json" } });
        }
    }

    // Routes for kanban_items
    if (pathname === "/kanban_items") {
        if (method === "GET") {
            const { data, error } = await supabase.from("kanban_items").select();
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } });
        }
        if (method === "POST") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_items").insert(body);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 201, headers: { "Content-Type": "application/json" } });
        }
    }
    if (pathname.startsWith("/kanban_items/")) {
        const id = pathname.split("/")[2];
        if (method === "PATCH") {
            const body = await json();
            const { data, error } = await supabase.from("kanban_items").update(body).eq("id", id);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 200, headers: { "Content-Type": "application/json" } });
        }
        if (method === "DELETE") {
            const { data, error } = await supabase.from("kanban_items").delete().eq("id", id);
            return new Response(JSON.stringify({ data, error }), { status: error ? 400 : 204, headers: { "Content-Type": "application/json" } });
        }
    }

    return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
});
