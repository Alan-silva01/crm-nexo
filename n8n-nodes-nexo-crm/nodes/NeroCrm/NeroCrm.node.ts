import {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class NeroCrm implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Nero CRM',
        name: 'neroCrm',
        icon: 'file:nerocrm.svg',
        group: ['transform'],
        version: 1,
        subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
        description: 'Gerencie leads e colunas do Kanban no Nero CRM',
        defaults: {
            name: 'Nero CRM',
        },
        inputs: ['main'],
        outputs: ['main'],
        credentials: [
            {
                name: 'neroCrmApi',
                required: true,
            },
        ],
        properties: [
            // Resource
            {
                displayName: 'Recurso',
                name: 'resource',
                type: 'options',
                noDataExpression: true,
                options: [
                    {
                        name: 'Lead',
                        value: 'lead',
                        description: 'Gerenciar leads',
                    },
                    {
                        name: 'Coluna',
                        value: 'column',
                        description: 'Gerenciar colunas do Kanban',
                    },
                ],
                default: 'lead',
            },
            // Operations for Lead
            {
                displayName: 'Operação',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['lead'],
                    },
                },
                options: [
                    {
                        name: 'Criar',
                        value: 'create',
                        description: 'Criar um novo lead',
                        action: 'Criar um lead',
                    },
                    {
                        name: 'Atualizar',
                        value: 'update',
                        description: 'Atualizar um lead existente',
                        action: 'Atualizar um lead',
                    },
                    {
                        name: 'Deletar',
                        value: 'delete',
                        description: 'Deletar um lead',
                        action: 'Deletar um lead',
                    },
                    {
                        name: 'Buscar',
                        value: 'get',
                        description: 'Buscar um lead por ID',
                        action: 'Buscar um lead',
                    },
                    {
                        name: 'Listar',
                        value: 'list',
                        description: 'Listar todos os leads',
                        action: 'Listar leads',
                    },
                    {
                        name: 'Mover',
                        value: 'move',
                        description: 'Mover lead para uma coluna (cria a coluna se não existir)',
                        action: 'Mover um lead',
                    },
                ],
                default: 'create',
            },
            // Operations for Column
            {
                displayName: 'Operação',
                name: 'operation',
                type: 'options',
                noDataExpression: true,
                displayOptions: {
                    show: {
                        resource: ['column'],
                    },
                },
                options: [
                    {
                        name: 'Criar',
                        value: 'create',
                        description: 'Criar uma nova coluna',
                        action: 'Criar uma coluna',
                    },
                    {
                        name: 'Listar',
                        value: 'list',
                        description: 'Listar todas as colunas',
                        action: 'Listar colunas',
                    },
                    {
                        name: 'Deletar',
                        value: 'delete',
                        description: 'Deletar uma coluna',
                        action: 'Deletar uma coluna',
                    },
                ],
                default: 'list',
            },
            // Fields for Lead Create
            {
                displayName: 'Nome',
                name: 'name',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Nome do lead',
            },
            {
                displayName: 'Telefone',
                name: 'phone',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Telefone do lead',
            },
            {
                displayName: 'E-mail',
                name: 'email',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'E-mail do lead',
            },
            {
                displayName: 'Coluna',
                name: 'status',
                type: 'string',
                default: 'Novos Leads',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Nome da coluna onde o lead será criado (será criada automaticamente se não existir)',
            },
            {
                displayName: 'Descrição',
                name: 'description',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Descrição ou observação sobre o lead (aparece no card)',
            },
            {
                displayName: 'Nome da Empresa',
                name: 'company_name',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Nome da empresa do lead',
            },
            {
                displayName: 'Faturamento Mensal',
                name: 'monthly_revenue',
                type: 'string',
                default: '',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Faturamento mensal do lead (ex: R$ 50.000,00)',
            },
            {
                displayName: 'Dados (JSON)',
                name: 'dados',
                type: 'json',
                default: '{}',
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['create'],
                    },
                },
                description: 'Dados adicionais do lead em formato JSON (ex: {"whatsapp": "(99) 99137-2552", "modelo_veiculo": "Honda Bros 160", "preocupacao": "Roubo"})',
            },
            // Fields for Lead Update
            {
                displayName: 'Lead ID',
                name: 'leadId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['update', 'delete', 'get'],
                    },
                },
                description: 'UUID do lead',
            },
            {
                displayName: 'Campos para Atualizar',
                name: 'updateFields',
                type: 'collection',
                placeholder: 'Adicionar Campo',
                default: {},
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['update'],
                    },
                },
                options: [
                    {
                        displayName: 'Nome',
                        name: 'name',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Telefone',
                        name: 'phone',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'E-mail',
                        name: 'email',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Coluna/Status',
                        name: 'status',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Descrição',
                        name: 'last_message',
                        type: 'string',
                        default: '',
                        description: 'Descrição ou observação sobre o lead',
                    },
                    {
                        displayName: 'Nome da Empresa',
                        name: 'company_name',
                        type: 'string',
                        default: '',
                    },
                    {
                        displayName: 'Faturamento Mensal',
                        name: 'monthly_revenue',
                        type: 'string',
                        default: '',
                        description: 'Faturamento mensal (ex: R$ 50.000,00)',
                    },
                    {
                        displayName: 'Dados (JSON)',
                        name: 'dados',
                        type: 'json',
                        default: '{}',
                        description: 'Dados adicionais do lead em formato JSON',
                    },
                ],
            },
            // Fields for Lead Move
            {
                displayName: 'Lead ID',
                name: 'leadId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['move'],
                    },
                },
                description: 'UUID do lead a ser movido',
            },
            {
                displayName: 'Nova Coluna',
                name: 'targetColumn',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['lead'],
                        operation: ['move'],
                    },
                },
                description: 'Nome da coluna destino (será criada automaticamente se não existir)',
            },
            // Fields for Column Create
            {
                displayName: 'Nome da Coluna',
                name: 'columnName',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['column'],
                        operation: ['create'],
                    },
                },
                description: 'Nome da nova coluna',
            },
            {
                displayName: 'Posição',
                name: 'position',
                type: 'number',
                default: 0,
                displayOptions: {
                    show: {
                        resource: ['column'],
                        operation: ['create'],
                    },
                },
                description: 'Posição da coluna no Kanban (0 = primeira)',
            },
            // Fields for Column Delete
            {
                displayName: 'Coluna ID',
                name: 'columnId',
                type: 'string',
                default: '',
                required: true,
                displayOptions: {
                    show: {
                        resource: ['column'],
                        operation: ['delete'],
                    },
                },
                description: 'UUID da coluna a ser deletada',
            },
        ],
    };

    async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
        const items = this.getInputData();
        const returnData: INodeExecutionData[] = [];

        const credentials = await this.getCredentials('neroCrmApi');
        const supabaseUrl = credentials.supabaseUrl as string;
        const apiKey = credentials.apiKey as string;
        const userId = credentials.userId as string;

        const resource = this.getNodeParameter('resource', 0) as string;
        const operation = this.getNodeParameter('operation', 0) as string;

        for (let i = 0; i < items.length; i++) {
            try {
                let responseData;

                if (resource === 'lead') {
                    if (operation === 'create') {
                        const name = this.getNodeParameter('name', i) as string;
                        const phone = this.getNodeParameter('phone', i) as string;
                        const email = this.getNodeParameter('email', i) as string;
                        const status = this.getNodeParameter('status', i) as string;
                        const description = this.getNodeParameter('description', i) as string;
                        const company_name = this.getNodeParameter('company_name', i) as string;
                        const monthly_revenue = this.getNodeParameter('monthly_revenue', i) as string;
                        const dadosRaw = this.getNodeParameter('dados', i, {}) as IDataObject | string;
                        const dados = typeof dadosRaw === 'string' ? (dadosRaw.trim() ? JSON.parse(dadosRaw) : null) : (Object.keys(dadosRaw).length > 0 ? dadosRaw : null);

                        // Check if column exists, create if not
                        const existingColumns = await this.helpers.request({
                            method: 'GET',
                            url: `${supabaseUrl}/rest/v1/kanban_columns?user_id=eq.${userId}&name=eq.${encodeURIComponent(status)}`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        }) as IDataObject[];

                        // If column doesn't exist, create it
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
                            }) as IDataObject[];
                            const maxPosition = allColumns && allColumns.length > 0 ? (allColumns[0].position as number) + 1 : 0;

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

                        responseData = await this.helpers.request({
                            method: 'POST',
                            url: `${supabaseUrl}/rest/v1/leads`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation',
                            },
                            body: {
                                user_id: userId,
                                name,
                                phone: phone || null,
                                email: email || null,
                                status,
                                last_message: description || null,
                                company_name: company_name || null,
                                monthly_revenue: monthly_revenue || null,
                                dados: dados,
                                avatar: `https://picsum.photos/seed/${encodeURIComponent(name)}/200`,
                            },
                            json: true,
                        });
                    } else if (operation === 'update') {
                        const leadId = this.getNodeParameter('leadId', i) as string;
                        const updateFields = this.getNodeParameter('updateFields', i) as Record<string, unknown>;

                        // Filter out empty/undefined values and process the fields
                        const filteredFields: Record<string, unknown> = {};
                        for (const [key, value] of Object.entries(updateFields)) {
                            if (value !== undefined && value !== '' && value !== null) {
                                // Special handling for dados field - parse JSON if string
                                if (key === 'dados') {
                                    let parsedDados: unknown = value;
                                    if (typeof value === 'string') {
                                        try {
                                            parsedDados = value.trim() ? JSON.parse(value) : undefined;
                                        } catch {
                                            parsedDados = undefined;
                                        }
                                    }
                                    // Only include if it's a non-empty object
                                    if (parsedDados && typeof parsedDados === 'object' && Object.keys(parsedDados as object).length > 0) {
                                        filteredFields[key] = parsedDados;
                                    }
                                } else {
                                    filteredFields[key] = value;
                                }
                            }
                        }

                        if (Object.keys(filteredFields).length === 0) {
                            throw new NodeOperationError(this.getNode(), 'Nenhum campo para atualizar foi fornecido', { itemIndex: i });
                        }

                        responseData = await this.helpers.request({
                            method: 'PATCH',
                            url: `${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation',
                            },
                            body: filteredFields,
                            json: true,
                        });
                    } else if (operation === 'delete') {
                        const leadId = this.getNodeParameter('leadId', i) as string;

                        responseData = await this.helpers.request({
                            method: 'DELETE',
                            url: `${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                        });
                        responseData = { success: true, deleted: leadId };
                    } else if (operation === 'get') {
                        const leadId = this.getNodeParameter('leadId', i) as string;

                        responseData = await this.helpers.request({
                            method: 'GET',
                            url: `${supabaseUrl}/rest/v1/leads?id=eq.${leadId}`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                    } else if (operation === 'list') {
                        responseData = await this.helpers.request({
                            method: 'GET',
                            url: `${supabaseUrl}/rest/v1/leads?user_id=eq.${userId}&order=created_at.desc`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                    } else if (operation === 'move') {
                        const leadId = this.getNodeParameter('leadId', i) as string;
                        const targetColumn = this.getNodeParameter('targetColumn', i) as string;

                        // Use the Edge Function to move lead (auto-creates column if needed)
                        responseData = await this.helpers.request({
                            method: 'POST',
                            url: `${supabaseUrl}/functions/v1/mover_lead`,
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: {
                                lead_id: leadId,
                                coluna: targetColumn,
                                user_id: userId,
                            },
                            json: true,
                        });
                    }
                } else if (resource === 'column') {
                    if (operation === 'create') {
                        const columnName = this.getNodeParameter('columnName', i) as string;
                        const position = this.getNodeParameter('position', i) as number;

                        responseData = await this.helpers.request({
                            method: 'POST',
                            url: `${supabaseUrl}/rest/v1/kanban_columns`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                                'Prefer': 'return=representation',
                            },
                            body: {
                                user_id: userId,
                                name: columnName,
                                position,
                            },
                            json: true,
                        });
                    } else if (operation === 'list') {
                        responseData = await this.helpers.request({
                            method: 'GET',
                            url: `${supabaseUrl}/rest/v1/kanban_columns?user_id=eq.${userId}&order=position`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                            json: true,
                        });
                    } else if (operation === 'delete') {
                        const columnId = this.getNodeParameter('columnId', i) as string;

                        responseData = await this.helpers.request({
                            method: 'DELETE',
                            url: `${supabaseUrl}/rest/v1/kanban_columns?id=eq.${columnId}`,
                            headers: {
                                'apikey': apiKey,
                                'Authorization': `Bearer ${apiKey}`,
                            },
                        });
                        responseData = { success: true, deleted: columnId };
                    }
                }

                const executionData = this.helpers.constructExecutionMetaData(
                    this.helpers.returnJsonArray(responseData as IDataObject | IDataObject[]),
                    { itemData: { item: i } },
                );
                returnData.push(...executionData);
            } catch (error) {
                if (this.continueOnFail()) {
                    returnData.push({ json: { error: (error as Error).message }, pairedItem: i });
                    continue;
                }
                throw new NodeOperationError(this.getNode(), error as Error, { itemIndex: i });
            }
        }

        return [returnData];
    }
}
