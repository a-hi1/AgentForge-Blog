const STORAGE_KEY = 'agentforge_conversations';
const MESSAGES_KEY = 'agentforge_conversation_messages';
const MAX_CONVERSATIONS = 100;
const MAX_MESSAGES_PER_CONVERSATION = 200;

export interface Conversation {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  pinned: boolean;
  status: 'active' | 'archived';
  messageCount: number;
  lastMessagePreview: string;
  linkedAssetId?: string;
  linkedProject?: string;
}

export interface ConversationMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant' | 'system' | 'execution';
  content: string;
  timestamp: number;
  metadata?: {
    stepName?: string;
    executionSource?: string;
    score?: number;
    phaseIndex?: number;
  };
}

function generateId(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function autoName(firstMessage: string): string {
  const cleaned = firstMessage.replace(/\n/g, ' ').trim();
  if (cleaned.length <= 30) return cleaned;
  return cleaned.slice(0, 30) + '...';
}

export function createConversation(firstMessage?: string, linkedAssetId?: string): Conversation {
  const now = Date.now();
  const conv: Conversation = {
    id: generateId(),
    title: firstMessage ? autoName(firstMessage) : '新会话',
    createdAt: now,
    updatedAt: now,
    pinned: false,
    status: 'active',
    messageCount: 0,
    lastMessagePreview: '',
    linkedAssetId,
  };

  const conversations = loadConversations();
  conversations.unshift(conv);
  if (conversations.length > MAX_CONVERSATIONS) {
    const unpinned = conversations.filter(c => !c.pinned);
    if (unpinned.length > 0) {
      const oldest = unpinned[unpinned.length - 1];
      removeConversation(oldest.id);
    }
  }
  saveConversations(conversations);
  return conv;
}

export function loadConversations(): Conversation[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Conversation[];
  } catch {
    return [];
  }
}

function saveConversations(conversations: Conversation[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch {}
}

export function updateConversation(id: string, updates: Partial<Conversation>): void {
  const conversations = loadConversations();
  const idx = conversations.findIndex(c => c.id === id);
  if (idx === -1) return;
  conversations[idx] = { ...conversations[idx], ...updates, updatedAt: Date.now() };
  saveConversations(conversations);
}

export function removeConversation(id: string): void {
  const conversations = loadConversations().filter(c => c.id !== id);
  saveConversations(conversations);
  try {
    localStorage.removeItem(`${MESSAGES_KEY}_${id}`);
  } catch {}
}

export function togglePin(id: string): void {
  const conversations = loadConversations();
  const conv = conversations.find(c => c.id === id);
  if (conv) {
    conv.pinned = !conv.pinned;
    conv.updatedAt = Date.now();
    saveConversations(conversations);
  }
}

export function addMessage(
  conversationId: string,
  role: ConversationMessage['role'],
  content: string,
  metadata?: ConversationMessage['metadata']
): ConversationMessage {
  const msg: ConversationMessage = {
    id: generateId(),
    conversationId,
    role,
    content,
    timestamp: Date.now(),
    metadata,
  };

  const messages = loadMessages(conversationId);
  messages.push(msg);
  if (messages.length > MAX_MESSAGES_PER_CONVERSATION) {
    messages.splice(0, messages.length - MAX_MESSAGES_PER_CONVERSATION);
  }
  saveMessages(conversationId, messages);

  const preview = content.replace(/\n/g, ' ').trim();
  updateConversation(conversationId, {
    messageCount: messages.length,
    lastMessagePreview: preview.length > 60 ? preview.slice(0, 60) + '...' : preview,
  });

  return msg;
}

export function loadMessages(conversationId: string): ConversationMessage[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${MESSAGES_KEY}_${conversationId}`);
    if (!raw) return [];
    return JSON.parse(raw) as ConversationMessage[];
  } catch {
    return [];
  }
}

function saveMessages(conversationId: string, messages: ConversationMessage[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(`${MESSAGES_KEY}_${conversationId}`, JSON.stringify(messages));
  } catch {}
}

export function searchConversations(query: string): Conversation[] {
  const lower = query.toLowerCase();
  return loadConversations().filter(c =>
    c.title.toLowerCase().includes(lower) ||
    c.lastMessagePreview.toLowerCase().includes(lower)
  );
}

export function getRecentConversations(limit: number = 10): Conversation[] {
  return loadConversations()
    .filter(c => c.status === 'active')
    .sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.updatedAt - a.updatedAt;
    })
    .slice(0, limit);
}
