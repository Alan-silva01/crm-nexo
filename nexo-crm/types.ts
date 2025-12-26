
export type Status = string;

export interface Message {
  id: string;
  text: string;
  sender: 'user' | 'lead';
  timestamp: string;
}

export interface Lead {
  id: string;
  name: string;
  phone: string;
  avatar: string;
  status: Status;
  lastMessage: string;
  lastActive: string;
  unreadCount: number;
  value: number;
  messages: Message[];
}

export interface MetricData {
  name: string;
  leads: number;
  conversions: number;
}
