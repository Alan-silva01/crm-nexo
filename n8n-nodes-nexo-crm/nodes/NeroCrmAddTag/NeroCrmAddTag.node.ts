import {
    IDataObject,
    IExecuteFunctions,
    INodeExecutionData,
    INodeType,
    INodeTypeDescription,
    NodeOperationError,
} from 'n8n-workflow';

export class NeroCrmAddTag implements INodeType {
    description: INodeTypeDescription = {
        displayName: 'Nero CRM - Adicionar Tag',
        name: 'neroCrmAddTag',
        icon: 'file:logo-nero.png',
        group: ['transform'],
        version: 1,
        subtitle: 'Adicionar etiqueta ao lead',
        description: 'Adiciona uma tag/etiqueta a um lead no CRM. Cria a tag automaticamente se não existir.',
        defaults: {
            name: 'Adicionar Tag',
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
            resources: {
                primaryDocumentation: [
                    {
                        url: 'https://github.com/Alan-silva01/crm-nexo',
                    },
                ],
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
                displayName: 'Nome da Tag',
                name: 'tagName',
                type: 'string',
                default: '',
                required: true,
                description: 'Nome da tag/etiqueta a ser adicionada',
            },
            {
                displayName: 'Cor da Tag',
                name: 'tagColor',
                type: 'string',
                default: '#6366f1',
                description: 'Cor da tag em formato hexadecimal (ex: #6366f1)',
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

        for (let i = 0; i < items.length; i++) {
            try {
                const identifier = this.getNodeParameter('identifier', i) as string;
                const identifierType = this.getNodeParameter('identifierType', i) as string;
                const tagName = this.getNodeParameter('tagName', i) as string;
                const tagColor = this.getNodeParameter('tagColor', i) as string;

                // 1. Find the lead
                let leadQuery = `${supabaseUrl}/rest/v1/leads?user_id=eq.${userId}`;
                if (identifierType === 'id') {
                    leadQuery += `&id=eq.${identifier}`;
                } else {
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
                }) as IDataObject[];

                if (!leads || leads.length === 0) {
                    throw new NodeOperationError(this.getNode(), `Lead não encontrado com ${identifierType}: ${identifier}`, { itemIndex: i });
                }

                const lead = leads[0];

                // 2. Check if tag exists, create if not
                const existingTags = await this.helpers.request({
                    method: 'GET',
                    url: `${supabaseUrl}/rest/v1/tags?user_id=eq.${userId}&name=eq.${encodeURIComponent(tagName)}`,
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    json: true,
                }) as IDataObject[];

                let tagId: string;

                if (!existingTags || existingTags.length === 0) {
                    // Create the tag
                    const newTag = await this.helpers.request({
                        method: 'POST',
                        url: `${supabaseUrl}/rest/v1/tags`,
                        headers: {
                            'apikey': apiKey,
                            'Authorization': `Bearer ${apiKey}`,
                            'Content-Type': 'application/json',
                            'Prefer': 'return=representation',
                        },
                        body: {
                            user_id: userId,
                            name: tagName,
                            color: tagColor || '#6366f1',
                        },
                        json: true,
                    }) as IDataObject[];
                    tagId = (newTag[0] as IDataObject).id as string;
                } else {
                    tagId = existingTags[0].id as string;
                }

                // 3. Check if lead already has this tag
                const existingLeadTags = await this.helpers.request({
                    method: 'GET',
                    url: `${supabaseUrl}/rest/v1/lead_tags?lead_id=eq.${lead.id}&tag_id=eq.${tagId}`,
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                    },
                    json: true,
                }) as IDataObject[];

                if (existingLeadTags && existingLeadTags.length > 0) {
                    // Tag already assigned
                    const executionData = this.helpers.constructExecutionMetaData(
                        this.helpers.returnJsonArray({
                            success: true,
                            message: `Lead já possui a tag "${tagName}"`,
                            lead_id: lead.id,
                            tag_id: tagId,
                            already_assigned: true,
                        }),
                        { itemData: { item: i } },
                    );
                    returnData.push(...executionData);
                    continue;
                }

                // 4. Add tag to lead
                await this.helpers.request({
                    method: 'POST',
                    url: `${supabaseUrl}/rest/v1/lead_tags`,
                    headers: {
                        'apikey': apiKey,
                        'Authorization': `Bearer ${apiKey}`,
                        'Content-Type': 'application/json',
                    },
                    body: {
                        lead_id: lead.id,
                        tag_id: tagId,
                    },
                    json: true,
                });

                const executionData = this.helpers.constructExecutionMetaData(
                    this.helpers.returnJsonArray({
                        success: true,
                        message: `Tag "${tagName}" adicionada ao lead`,
                        lead_id: lead.id,
                        lead_name: lead.name,
                        tag_id: tagId,
                        tag_name: tagName,
                    }),
                    { itemData: { item: i } },
                );
                returnData.push(...executionData);
            } catch (error) {
                // Always return error as data to AI Agent can handle it
                returnData.push({
                    json: {
                        success: false,
                        error: (error as Error).message,
                        message: `Erro ao adicionar tag: ${(error as Error).message}`,
                    },
                    pairedItem: i
                });
            }
        }

        return [returnData];
    }
}
