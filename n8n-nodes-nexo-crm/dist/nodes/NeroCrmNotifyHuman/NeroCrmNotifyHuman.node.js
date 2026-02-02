"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NeroCrmNotifyHuman = void 0;
const n8n_workflow_1 = require("n8n-workflow");
class NeroCrmNotifyHuman {
    description = {
        displayName: 'Nero CRM - Notificar Humano',
        name: 'neroCrmNotifyHuman',
        icon: 'file:logo-nero.png',
        group: ['transform'],
        version: 1,
        subtitle: 'Chamar atendente humano',
        description: 'Chama um atendente humano para assumir a conversa com o cliente no CRM',
        defaults: {
            name: 'Notificar Humano',
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
                displayName: 'Mensagem para o Atendente',
                name: 'message',
                type: 'string',
                default: '',
                description: 'Mensagem opcional para o atendente sobre o motivo da chamada',
            },
            {
                displayName: 'Coluna Destino',
                name: 'targetColumn',
                type: 'string',
                default: 'Atendimento Humano',
                description: 'Nome da coluna para onde o lead será movido (criada automaticamente se não existir)',
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
                const message = this.getNodeParameter('message', i);
                const targetColumn = this.getNodeParameter('targetColumn', i);
                // 1. Find the lead
                let leadQuery = `${supabaseUrl}/rest/v1/leads?user_id=eq.${userId}`;
                if (identifierType === 'id') {
                    leadQuery += `&id=eq.${identifier}`;
                }
                else {
                    // Phone - try exact match or contains
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
                // 2. Check if target column exists, create if not
                const existingColumns = await this.helpers.request({
                    method: 'GET',
                    url: `${supabaseUrl}/rest/v1/kanban_columns?user_id=eq.${userId}&name=eq.${encodeURIComponent(targetColumn)}`,
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    json: true,
                });
                if (!existingColumns || existingColumns.length === 0) {
                    // Get max position
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
                            name: targetColumn,
                            position: maxPosition,
                        },
                        json: true,
                    });
                }
                // 3. Update the lead - move to target column and add message
                const updateBody = {
                    status: targetColumn,
                };
                if (message) {
                    updateBody.last_message = message;
                }
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
                    message: `Lead movido para "${targetColumn}" - Atendente notificado`,
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
exports.NeroCrmNotifyHuman = NeroCrmNotifyHuman;
//# sourceMappingURL=NeroCrmNotifyHuman.node.js.map