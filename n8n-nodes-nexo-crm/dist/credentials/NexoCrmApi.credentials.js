"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NexoCrmApi = void 0;
class NexoCrmApi {
    name = 'nexoCrmApi';
    displayName = 'Nexo CRM API';
    documentationUrl = 'https://github.com/alan-silva01/n8n-nodes-nexo-crm';
    properties = [
        {
            displayName: 'Supabase URL',
            name: 'supabaseUrl',
            type: 'string',
            default: 'https://jreklrhamersmamdmjna.supabase.co',
            placeholder: 'https://your-project.supabase.co',
            required: true,
        },
        {
            displayName: 'API Key (Anon Key)',
            name: 'apiKey',
            type: 'string',
            typeOptions: {
                password: true,
            },
            default: '',
            required: true,
        },
        {
            displayName: 'User ID',
            name: 'userId',
            type: 'string',
            default: '',
            placeholder: '13e981fb-037c-4d8d-89f0-4b5fa197c5f8',
            description: 'UUID do usuário dono dos leads (auth.users.id)',
            required: true,
        },
    ];
    authenticate = {
        type: 'generic',
        properties: {
            headers: {
                'apikey': '={{$credentials.apiKey}}',
                'Authorization': 'Bearer {{$credentials.apiKey}}',
                'Content-Type': 'application/json',
                'Prefer': 'return=representation',
            },
        },
    };
    test = {
        request: {
            baseURL: '={{$credentials.supabaseUrl}}',
            url: '/rest/v1/kanban_columns?limit=1',
        },
    };
}
exports.NexoCrmApi = NexoCrmApi;
//# sourceMappingURL=NexoCrmApi.credentials.js.map