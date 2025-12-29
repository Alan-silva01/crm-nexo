
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
  created_at?: string;
  updated_at?: string;
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
