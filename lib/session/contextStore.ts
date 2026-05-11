const STORAGE_KEY = 'agentforge-workspace-context';
const EXPIRY_HOURS = 24;

export interface WorkspaceContext {
  currentProject?: string;
  currentPhase?: string;
  currentPrompt?: string;
  assetId?: string;
  draftInput?: string;
  executionState?: 'idle' | 'running' | 'completed' | 'failed';
  expandedPanels?: Record<string, boolean>;
  scrollPosition?: number;
  lastPage?: string;
  updatedAt?: number;
}

export function saveContext(ctx: Partial<WorkspaceContext>): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = loadContext();
    const merged = { ...existing, ...ctx, updatedAt: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {}
}

export function loadContext(): WorkspaceContext {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as WorkspaceContext;
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > EXPIRY_HOURS * 3600 * 1000) {
      localStorage.removeItem(STORAGE_KEY);
      return {};
    }
    return parsed;
  } catch {
    return {};
  }
}

export function clearContext(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {}
}

export function getLastInterruptedTask(): { description: string; suggestion: string; href: string; source: string } | null {
  if (typeof window === 'undefined') return null;
  try {
    const ctx = loadContext();
    if (!ctx.lastPage) return null;

    if (ctx.executionState === 'running') {
      return {
        description: 'Playground 执行中断',
        suggestion: '恢复执行并完成任务',
        href: '/playground',
        source: 'Playground',
      };
    }

    if (ctx.draftInput && ctx.draftInput.trim().length > 10) {
      return {
        description: `未完成的输入草稿 (${ctx.draftInput.slice(0, 30)}...)`,
        suggestion: '继续编辑并生成 Prompt',
        href: ctx.lastPage === '/prompt' ? '/prompt' : '/playground',
        source: ctx.lastPage === '/prompt' ? 'Prompt Studio' : 'Playground',
      };
    }

    if (ctx.assetId && ctx.lastPage === '/playground') {
      return {
        description: '有未提交反馈的执行结果',
        suggestion: '查看执行结果并提交反馈',
        href: `/playground?assetId=${ctx.assetId}`,
        source: 'Playground',
      };
    }

    return null;
  } catch {
    return null;
  }
}
