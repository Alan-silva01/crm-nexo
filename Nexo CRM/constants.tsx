
import { Lead, MetricData } from './types';

// Add STATUS_LABELS to map status keys to display labels
export const STATUS_LABELS: Record<string, string> = {
  new: 'Novos Leads',
  contacted: 'Em Atendimento',
  negotiation: 'Negociação',
  closed: 'Venda Concluída',
};

export const INITIAL_LEADS: Lead[] = [
  {
    id: '1',
    name: 'Alex Rivera',
    phone: '+55 11 99876-5432',
    avatar: 'https://picsum.photos/seed/1/200',
    status: 'new',
    lastMessage: 'Olá, gostaria de saber os preços.',
    lastActive: '2 min atrás',
    unreadCount: 3,
    value: 1200,
    messages: [
      { id: 'm1', text: 'Olá, gostaria de saber os preços.', sender: 'lead', timestamp: '11:53' }
    ]
  },
  {
    id: '2',
    name: 'Sarah Jonas',
    phone: '+55 21 98822-1144',
    avatar: 'https://picsum.photos/seed/2/200',
    status: 'contacted',
    lastMessage: 'Enviado a proposta comercial.',
    lastActive: '1 hora atrás',
    unreadCount: 0,
    value: 4500,
    messages: [
      { id: 'm2', text: 'Recebi a proposta, vou analisar.', sender: 'lead', timestamp: '10:30' },
      { id: 'm3', text: 'Enviado a proposta comercial.', sender: 'user', timestamp: '10:31' }
    ]
  },
  {
    id: '3',
    name: 'Marcus Silva',
    phone: '+55 31 97755-4433',
    avatar: 'https://picsum.photos/seed/3/200',
    status: 'negotiation',
    lastMessage: 'O cliente pediu desconto de 10%.',
    lastActive: '10 min atrás',
    unreadCount: 1,
    value: 8900,
    messages: [
      { id: 'm4', text: 'Como assim? No Lab???', sender: 'user', timestamp: '11:54' },
      { id: 'm5', text: 'O cliente pediu desconto de 10%.', sender: 'lead', timestamp: '11:55' }
    ]
  },
  {
    id: '4',
    name: 'Juliana Port',
    phone: '+55 11 96644-2211',
    avatar: 'https://picsum.photos/seed/4/200',
    status: 'closed',
    lastMessage: 'Pagamento confirmado.',
    lastActive: 'Ontem',
    unreadCount: 0,
    value: 15000,
    messages: [
      { id: 'm6', text: 'Pagamento confirmado.', sender: 'user', timestamp: '09:00' }
    ]
  },
  {
    id: '5',
    name: 'Rodrigo Faro',
    phone: '+55 11 95533-0099',
    avatar: 'https://picsum.photos/seed/5/200',
    status: 'new',
    lastMessage: 'Tenho interesse na consultoria.',
    lastActive: '5 min atrás',
    unreadCount: 0,
    value: 2000,
    messages: [
      { id: 'm7', text: 'Tenho interesse na consultoria.', sender: 'lead', timestamp: '11:45' }
    ]
  }
];

export const INITIAL_COLUMNS = [
  { id: 'new', label: STATUS_LABELS.new },
  { id: 'contacted', label: STATUS_LABELS.contacted },
  { id: 'negotiation', label: STATUS_LABELS.negotiation },
  { id: 'closed', label: STATUS_LABELS.closed }
];

export const METRICS_DATA: MetricData[] = [
  { name: 'Seg', leads: 40, conversions: 24 },
  { name: 'Ter', leads: 30, conversions: 13 },
  { name: 'Qua', leads: 20, conversions: 58 },
  { name: 'Qui', leads: 27, conversions: 39 },
  { name: 'Sex', leads: 18, conversions: 48 },
  { name: 'Sáb', leads: 23, conversions: 38 },
  { name: 'Dom', leads: 34, conversions: 43 },
];
