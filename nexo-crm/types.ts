
export type Status = string;

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'lead';
  timestamp: string;
}

export interface Lead {
  id: string;
  user_id?: string;
  name: string;
  phone: string | null;
  email: string | null;
  avatar: string | null;
  status: Status | null;
  last_message?: string | null;
  created_at?: string;
  updated_at?: string;
  company_name?: string | null;
  monthly_revenue?: number | null;
  dataHora_Agendamento?: string | null;
  servico_interesse?: string | null;
  dados?: Record<string, unknown> | null;
  // UI-only fields (not in database)
  lastMessage?: string;
  lastActive?: string;
  unreadCount?: number;
  value?: number;
  messages?: Message[];
}

export interface MetricData {
  name: string;
  leads: number;
  conversions: number;
}

export interface SDRMessageContent {
  type: 'human' | 'ai' | 'agent';
  content: string;
  agent_name?: string;
  additional_kwargs?: Record<string, unknown>;
  response_metadata?: Record<string, unknown>;
  tool_calls?: unknown[];
}

export interface SDRMessage {
  id: number;
  session_id: string;
  message: SDRMessageContent;
  created_at?: string;
}

export interface LeadColumnHistory {
  id: string;
  lead_id: string;
  from_column_id: string | null;
  to_column_id: string;
  moved_at: string;
  user_id: string | null;
  // Join fields
  lead?: { name: string };
  from_column?: { name: string };
  to_column?: { name: string };
}
