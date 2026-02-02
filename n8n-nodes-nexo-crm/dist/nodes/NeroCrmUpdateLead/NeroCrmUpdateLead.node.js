"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeroCrmUpdateLead = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class NeroCrmUpdateLead {
    description = {
        displayName: 'Nero CRM - Atualizar Lead',
        name: 'neroCrmUpdateLead',
        icon: 'file:logo-nero.png',
        group: ['transform'],
        version: 1,
        subtitle: 'Atualizar informações do lead',
        description: 'Atualiza descrição, status/coluna e dados de um lead no CRM',
        defaults: {
            name: 'Atualizar Lead',
        },
        inputs: ['main'],
        outputs: ['main'],
        // @ts-ignore - n8n internal property for AI Agent tools
        usableAsTool: true,
        // @ts-ignore - n8n codex for AI understanding
        codex: {
            categories: ['Sales'],
            subcategories: {
                Sales: ['CRM'],
            },
        },
        credentials: [
            {
                name: 'neroCrmApi',
                required: true,
            },
        ],
        properties: [
            {
                displayName: 'Identificador do Lead',
                name: 'identifier',
                type: 'string',
                default: '',
                required: true,
                description: 'ID do lead no CRM ou número de telefone do cliente',
            },
            {
                displayName: 'Tipo de Identificador',
                name: 'identifierType',
                type: 'options',
                options: [
                    {
                        name: 'ID do Lead',
                        value: 'id',
                    },
                    {
                        name: 'Telefone',
                        value: 'phone',
                    },
                ],
                default: 'phone',
                description: 'Se está usando o ID do lead ou o número de telefone para identificar',
            },
            {
                displayName: 'Descrição/Observação',
                name: 'description',
                type: 'string',
                default: '',
                description: 'Nova descrição ou observação sobre o lead',
            },
            {
                displayName: 'Coluna/Status',
                name: 'status',
                type: 'string',
                default: '',
                description: 'Nova coluna/status do lead (será criada automaticamente se não existir)',
            },
            {
                displayName: 'Dados Adicionais (JSON)',
                name: 'dados',
                type: 'json',
                default: '{}',
                description: 'Dados adicionais em formato JSON para atualizar no lead',
            },
        ],
    };
    async execute() {
        const items = this.getInputData();
        const returnData = [];
        const credentials = await this.getCredentials('neroCrmApi');
        const supabaseUrl = credentials.supabaseUrl;
        const apiKey = credentials.apiKey;
        const userId = credentials.userId;
        for (let i = 0; i < items.length; i++) {
            try {
                const identifier = this.getNodeParameter('identifier', i);
                const identifierType = this.getNodeParameter('identifierType', i);
                const description = this.getNodeParameter('description', i);
                const status = this.getNodeParameter('status', i);
                const dadosRaw = this.getNodeParameter('dados', i, {});
                // Parse dados JSON
                let dados = null;
                if (typeof dadosRaw === 'string' && dadosRaw.trim()) {
                    try {
                        dados = JSON.parse(dadosRaw);
                    }
                    catch {
                        dados = null;
                    }
                }
                else if (typeof dadosRaw === 'object' && Object.keys(dadosRaw).length > 0) {
                    dados = dadosRaw;
                }
                // 1. Find the lead
                let leadQuery = `${supabaseUrl}/rest/v1/leads?user_id=eq.${userId}`;
                if (identifierType === 'id') {
                    leadQuery += `&id=eq.${identifier}`;
                }
                else {
                    const cleanPhone = identifier.replace(/\D/g, '');
                    leadQuery += `&phone=ilike.*${cleanPhone}*`;
                }
                const leads = await this.helpers.request({
                    method: 'GET',
                    url: leadQuery,
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    json: true,
                });
                if (!leads || leads.length === 0) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), `Lead não encontrado com ${identifierType}: ${identifier}`, { itemIndex: i });
                }
                const lead = leads[0];
                // 2. If status is provided, check if column exists
                if (status) {
                    const existingColumns = await this.helpers.request({
                        method: 'GET',
                        url: `${supabaseUrl}/rest/v1/kanban_columns?user_id=eq.${userId}&name=eq.${encodeURIComponent(status)}`,
                        headers: {
                            'apikey': apiKey,
                            'Authorization': `Bearer ${apiKey}`,
                        },
                        json: true,
                    });
                    if (!existingColumns || existingColumns.length === 0) {
                        // Create the column
                        const allColumns = await this.helpers.request({
                            method: 'GET',
                            url: `${supabaseUrl}/rest/v1/kanban_columns?user_id=eq.${userId}&order=position.desc&limit=1`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                        const maxPosition = allColumns && allColumns.length > 0 ? allColumns[0].position + 1 : 0;
                        await this.helpers.request({
                            method: 'POST',
                            url: `${supabaseUrl}/rest/v1/kanban_columns`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            body: {
                                user_id: userId,
                                name: status,
                                position: maxPosition,
                            },
                            json: true,
                        });
                    }
                }
                // 3. Build update body
                const updateBody = {};
                const updatedFields = [];
                if (description) {
                    updateBody.last_message = description;
                    updatedFields.push('descrição');
                }
                if (status) {
                    updateBody.status = status;
                    updatedFields.push('coluna');
                }
                if (dados && Object.keys(dados).length > 0) {
                    // Merge with existing dados
                    const existingDados = lead.dados || {};
                    updateBody.dados = { ...existingDados, ...dados };
                    updatedFields.push('dados');
                }
                if (Object.keys(updateBody).length === 0) {
                    throw new n8n_workflow_1.NodeOperationError(this.getNode(), 'Nenhum campo para atualizar foi fornecido', { itemIndex: i });
                }
                // 4. Update the lead
                const responseData = await this.helpers.request({
                    method: 'PATCH',
                    url: `${supabaseUrl}/rest/v1/leads?id=eq.${lead.id}`,
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=representation',
                    },
                    body: updateBody,
                    json: true,
                });
                const executionData = this.helpers.constructExecutionMetaData(this.helpers.returnJsonArray({
                    success: true,
                    message: `Lead atualizado: ${updatedFields.join(', ')}`,
                    lead_id: lead.id,
                    lead_name: lead.name,
                    updated_fields: updatedFields,
                    lead: responseData,
                }), { itemData: { item: i } });
                returnData.push(...executionData);
            }
            catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: error.message }, pairedItem: i });
                    continue;
                }
                throw new n8n_workflow_1.NodeOperationError(this.getNode(), error, { itemIndex: i });
            }
        }
        return [returnData];
    }
}
exports.NeroCrmUpdateLead = NeroCrmUpdateLead;
//# sourceMappingURL=NeroCrmUpdateLead.node.js.map