// 全局类型定义（与数据库 schema 对应）

export interface Profile {
  id: string;
  username: string | null;
  email: string | null;
  phone: string | null;
  role: 'user' | 'admin';
  preferred_theme: string | null;
  preferred_language: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/** 界面消息（含流式占位态） */
export interface UiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  streaming?: boolean;
}

export type ThemeId = 'ink' | 'snow' | 'violet' | 'amber' | 'forest';

export type Language = 'zh' | 'en';

export const AVATAR_URL =
  'https://miaoda-conversation-file.cdn.bcebos.com/user-ezis6iq627eo/app-eziu2hez74zl/20261010/67e779b669df0ded18dc5d6a62fb66e2_1791626803772.jpg';

