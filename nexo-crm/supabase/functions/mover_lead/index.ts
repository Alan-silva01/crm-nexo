import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.2";

const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
);

interface MoveLeadRequest {
    lead_id: string;
    coluna: string;
    user_id: string;
}

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", {
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey",
            },
        });
    }

    try {
        const body: MoveLeadRequest = await req.json();
        const { lead_id, coluna, user_id } = body;

        if (!lead_id || !coluna || !user_id) {
            return new Response(
                JSON.stringify({ error: "Campos obrigatórios: lead_id, coluna, user_id" }),
                { status: 400, headers: { "Content-Type": "application/json" } }
            );
        }

        // 1. Check if column exists for this user
        const { data: existingColumn, error: columnError } = await supabase
            .from("kanban_columns")
            .select("*")
            .eq("user_id", user_id)
            .eq("name", coluna)
            .single();

        // 2. If column doesn't exist, create it
        if (!existingColumn) {
            // Get the max position to put the new column at the end
            const { data: columns } = await supabase
                .from("kanban_columns")
                .select("position")
                .eq("user_id", user_id)
                .order("position", { ascending: false })
                .limit(1);

            const nextPosition = columns && columns.length > 0 ? columns[0].position + 1 : 0;

            const { error: createError } = await supabase
                .from("kanban_columns")
                .insert([{ user_id, name: coluna, position: nextPosition }]);

            if (createError) {
                return new Response(
                    JSON.stringify({ error: "Erro ao criar coluna", details: createError }),
                    { status: 500, headers: { "Content-Type": "application/json" } }
                );
            }

            console.log(`Coluna "${coluna}" criada com sucesso!`);
        }

        // 3. Update lead status to the column name
        const { data: updatedLead, error: updateError } = await supabase
            .from("leads")
            .update({ status: coluna })
            .eq("id", lead_id)
            .select()
            .single();

        if (updateError) {
            return new Response(
                JSON.stringify({ error: "Erro ao mover lead", details: updateError }),
                { status: 500, headers: { "Content-Type": "application/json" } }
            );
        }

        return new Response(
            JSON.stringify({
                success: true,
                message: existingColumn
                    ? `Lead movido para "${coluna}"`
                    : `Coluna "${coluna}" criada e lead movido!`,
                lead: updatedLead,
                coluna_criada: !existingColumn
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            }
        );
    } catch (error) {
        return new Response(
            JSON.stringify({ error: "Erro interno", details: String(error) }),
            { status: 500, headers: { "Content-Type": "application/json" } }
        );
    }
});
