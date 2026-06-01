// ===== Auth =====
export interface User {
  id: string;
  email: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// ===== Knowledge Base =====
export interface KnowledgeBase {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  document_count: number;
  created_at: string;
  updated_at: string;
}

export interface KBListResponse {
  items: KnowledgeBase[];
  total: number;
}

// ===== Document =====
export interface Document {
  id: string;
  kb_id: string;
  filename: string;
  file_type: string;
  file_size: number;
  chunk_count: number;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  error_message: string | null;
  created_at: string;
}

export interface DocumentListResponse {
  items: Document[];
  total: number;
}

// ===== Chat =====
export interface Citation {
  chunk_id: string;
  doc_name: string;
  content_snippet: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations: Citation[] | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  kb_id: string;
  title: string | null;
  messages: Message[];
  created_at: string;
  updated_at: string;
}

export interface ConversationListItem {
  id: string;
  kb_id: string;
  title: string | null;
  message_count: number;
  last_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConversationListResponse {
  items: ConversationListItem[];
  total: number;
}

// ===== SSE Events =====
export interface SSEReferencesEvent {
  type: 'references';
  data: Array<{
    chunk_id: string;
    doc_name: string;
    content_snippet: string;
    score: number;
  }>;
}

export interface SSETokenEvent {
  type: 'token';
  data: { text: string };
}

export interface SSEDoneEvent {
  type: 'done';
  data: {
    answer: string;
    citations: Citation[];
  };
}

export interface SSEErrorEvent {
  type: 'error';
  data: { message: string };
}

export type SSEEvent = SSEReferencesEvent | SSETokenEvent | SSEDoneEvent | SSEErrorEvent;

// ===== Search =====
export interface SearchResult {
  chunk_id: string;
  doc_id: string;
  doc_name: string;
  content: string;
  chunk_index: number;
  score: number;
}

export interface SearchResponse {
  query: string;
  results: SearchResult[];
  total: number;
}

// ===== Dashboard Stats =====
export interface DashboardStats {
  total_kbs: number;
  total_documents: number;
  total_conversations: number;
  total_messages: number;
}
