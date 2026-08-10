import type { SemanticTone } from '@/types/presentation';

export type MessageCategory = 'all' | 'gate' | 'agent' | 'mr' | 'system';

export interface MessageRecord {
  id: string;
  category: MessageCategory;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  tone: SemanticTone;
}

export interface MessageCategoryOption {
  label: string;
  value: MessageCategory;
}
