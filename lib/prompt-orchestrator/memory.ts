export interface PromptMemoryEntry {
  id: string;
  timestamp: number;
  input: string;
  primaryType: string;
  secondaryTypes: string[];
  complexity: string;
  stack: string[];
  phaseCount: number;
}

export interface UserPreferences {
  frequentTypes: { type: string; count: number }[];
  preferredStack: string[];
  averageComplexity: string;
  totalGenerations: number;
}

const STORAGE_KEY = 'agentforge_prompt_memory';
const MAX_ENTRIES = 50;

function getStorage(): PromptMemoryEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveStorage(entries: PromptMemoryEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(-MAX_ENTRIES)));
  } catch {
    // storage full, ignore
  }
}

export function recordGeneration(entry: Omit<PromptMemoryEntry, 'id' | 'timestamp'>): void {
  const entries = getStorage();
  entries.push({
    ...entry,
    id: `mem_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: Date.now(),
  });
  saveStorage(entries);
}

export function getHistory(): PromptMemoryEntry[] {
  return getStorage().sort((a, b) => b.timestamp - a.timestamp);
}

export function clearHistory(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function analyzePreferences(): UserPreferences {
  const entries = getStorage();
  if (entries.length === 0) {
    return {
      frequentTypes: [],
      preferredStack: ['Next.js 14', 'TypeScript', 'PostgreSQL', 'Tailwind CSS'],
      averageComplexity: 'medium',
      totalGenerations: 0,
    };
  }

  const typeCounts: Record<string, number> = {};
  const stackCounts: Record<string, number> = {};
  const complexityCounts: Record<string, number> = { low: 0, medium: 0, high: 0 };

  for (const entry of entries) {
    typeCounts[entry.primaryType] = (typeCounts[entry.primaryType] || 0) + 1;
    for (const tech of entry.stack) {
      stackCounts[tech] = (stackCounts[tech] || 0) + 1;
    }
    complexityCounts[entry.complexity] = (complexityCounts[entry.complexity] || 0) + 1;
  }

  const frequentTypes = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([type, count]) => ({ type, count }));

  const preferredStack = Object.entries(stackCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([tech]) => tech);

  const avgComplexity = Object.entries(complexityCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'medium';

  return {
    frequentTypes,
    preferredStack,
    averageComplexity: avgComplexity,
    totalGenerations: entries.length,
  };
}

export function getPersonalizedHint(type: string): string | null {
  const prefs = analyzePreferences();
  if (prefs.totalGenerations < 3) return null;

  const isFrequent = prefs.frequentTypes.some(t => t.type === type && t.count >= 2);
  if (!isFrequent) return null;

  const hints: Record<string, string> = {
    saas: '你经常开发 SaaS 项目，已为你优化：Auth 模块 → RBAC 权限 → Dashboard → Billing 流程',
    ecommerce: '你经常开发电商项目，已为你优化：商品管理 → 订单流程 → 支付集成 → 库存系统',
    social_platform: '你经常开发社交项目，已为你优化：用户关系 → 消息系统 → Feed 流 → 内容审核',
    content_community: '你经常开发社区项目，已为你优化：内容发布 → 互动系统 → 标签分类 → 搜索推荐',
    ai_tool: '你经常开发 AI 工具，已为你优化：LLM 集成 → Prompt 管理 → 对话界面 → 知识库',
    admin_system: '你经常开发管理系统，已为你优化：RBAC 权限 → CRUD 模块 → 报表 → 数据导入导出',
  };

  return hints[type] || null;
}
