// 聊天记录持久化与导出
import { supabase } from '@/db/supabase';
import type { ChatMessage } from '@/types/types';

const PAGE_SIZE = 50;

/** 加载最近一页聊天记录（时间正序返回） */
export async function loadChatHistory(): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, user_id, role, content, created_at')
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return (Array.isArray(data) ? data : []).slice().reverse();
}

/** 游标分页：加载某条消息之前的更早记录（时间正序返回） */
export async function loadChatHistoryBefore(cursor: string): Promise<ChatMessage[]> {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, user_id, role, content, created_at')
    .lt('created_at', cursor)
    .order('created_at', { ascending: false })
    .limit(PAGE_SIZE);
  if (error) throw error;
  return (Array.isArray(data) ? data : []).slice().reverse();
}

/** 写入一条消息（user_id 由数据库默认值自动填充） */
export async function insertChatMessage(
  role: 'user' | 'assistant',
  content: string
): Promise<ChatMessage | null> {
  const { data, error } = await supabase
    .from('chat_messages')
    .insert({ role, content })
    .select('id, user_id, role, content, created_at')
    .maybeSingle();
  if (error) {
    console.error('保存聊天消息失败:', error);
    return null;
  }
  return data ?? null;
}

/** 清空当前账号全部聊天记录 */
export async function clearChatHistory(): Promise<void> {
  const { error } = await supabase
    .from('chat_messages')
    .delete()
    .gte('created_at', '1970-01-01T00:00:00Z');
  if (error) throw error;
}

/** 导出用：游标分页拉取全部消息 */
export async function fetchAllChatMessages(): Promise<ChatMessage[]> {
  const all: ChatMessage[] = [];
  let cursor: string | undefined;
  for (let i = 0; i < 20; i++) {
    let query = supabase
      .from('chat_messages')
      .select('id, user_id, role, content, created_at')
      .order('created_at', { ascending: true })
      .limit(200);
    if (cursor) query = query.gt('created_at', cursor);
    const { data, error } = await query;
    if (error) throw error;
    const rows = Array.isArray(data) ? data : [];
    all.push(...rows);
    if (rows.length < 200) break;
    cursor = rows[rows.length - 1]?.created_at;
  }
  return all;
}

export interface ExportLabels {
  title: string;
  you: string;
  twin: string;
}

/** 生成 Markdown 格式的聊天记录 */
export function buildMarkdownExport(messages: ChatMessage[], labels: ExportLabels): string {
  const lines: string[] = [
    `# ${labels.title}`,
    '',
    `> ${new Date().toLocaleString()}`,
    '',
  ];
  for (const m of messages) {
    lines.push(`**${m.role === 'user' ? labels.you : labels.twin}** · ${new Date(m.created_at).toLocaleString()}`);
    lines.push('');
    lines.push(m.content);
    lines.push('');
    lines.push('---');
    lines.push('');
  }
  return lines.join('\n');
}

/** 生成纯文本格式的聊天记录 */
export function buildTextExport(messages: ChatMessage[], labels: ExportLabels): string {
  const lines: string[] = [labels.title, ''];
  for (const m of messages) {
    lines.push(`[${new Date(m.created_at).toLocaleString()}] ${m.role === 'user' ? labels.you : labels.twin}:`);
    lines.push(m.content);
    lines.push('');
  }
  return lines.join('\n');
}

/** 触发浏览器下载文本文件 */
export function downloadTextFile(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
