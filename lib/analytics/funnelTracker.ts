export type FunnelStage =
  | 'studio_open'
  | 'generate'
  | 'execute'
  | 'feedback'
  | 'asset_saved'
  | 'reuse';

export interface FunnelEvent {
  stage: FunnelStage;
  timestamp: number;
  promptId?: string;
  metadata?: Record<string, unknown>;
}

export interface FunnelStageResult {
  stage: FunnelStage;
  label: string;
  count: number;
  conversionRate: number;
  dropOffRate: number;
}

export interface FunnelResult {
  stages: FunnelStageResult[];
  biggestDropOff: { from: FunnelStage; to: FunnelStage; rate: number } | null;
  overallConversion: number;
  totalEvents: number;
  isRealWorkflow: boolean;
  workflowConfidence: 'high' | 'medium' | 'low' | 'none';
  suggestions: string[];
}

const STORAGE_KEY = 'agentforge_funnel_events';
const MAX_EVENTS = 2000;

export const STAGE_META: Record<FunnelStage, { label: string; description: string }> = {
  studio_open: { label: 'Prompt Studio', description: '打开 Prompt Studio 页面' },
  generate: { label: '生成', description: '成功生成 Prompt' },
  execute: { label: '执行', description: '发送到 Playground 执行' },
  feedback: { label: '反馈', description: '提交执行结果反馈' },
  asset_saved: { label: '保存资产', description: '写回 Prompt 资产库' },
  reuse: { label: '复用', description: '次日复用已有资产' },
};

export const STAGE_ORDER: FunnelStage[] = [
  'studio_open', 'generate', 'execute', 'feedback', 'asset_saved', 'reuse',
];

function getEvents(): FunnelEvent[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as FunnelEvent[];
  } catch {
    return [];
  }
}

function saveEvents(events: FunnelEvent[]): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = events.length > MAX_EVENTS ? events.slice(-MAX_EVENTS) : events;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch {
    // storage full — silently ignore
  }
}

export function trackFunnelEvent(
  stage: FunnelStage,
  promptId?: string,
  metadata?: Record<string, unknown>
): void {
  const events = getEvents();
  events.push({ stage, timestamp: Date.now(), promptId, metadata });
  saveEvents(events);
}

export function queryFunnel(days: number = 30): FunnelResult {
  const events = getEvents();
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const recent = events.filter(e => e.timestamp >= cutoff);

  const stageCounts: Record<FunnelStage, number> = {
    studio_open: 0, generate: 0, execute: 0, feedback: 0, asset_saved: 0, reuse: 0,
  };

  for (const event of recent) {
    stageCounts[event.stage]++;
  }

  const uniquePrompts = new Set(recent.filter(e => e.promptId).map(e => e.promptId)).size;

  const stages: FunnelStageResult[] = STAGE_ORDER.map((stage, i) => {
    const count = stageCounts[stage];
    const prevCount = i === 0 ? count : stageCounts[STAGE_ORDER[i - 1]];
    const conversionRate = prevCount > 0 ? Math.round((count / prevCount) * 100) : (i === 0 ? 100 : 0);
    const dropOffRate = 100 - conversionRate;
    return { stage, label: STAGE_META[stage].label, count, conversionRate, dropOffRate };
  });

  let biggestDropOff: FunnelResult['biggestDropOff'] = null;
  let maxDrop = 0;
  for (let i = 1; i < stages.length; i++) {
    if (stages[i - 1].count > 0 && stages[i].dropOffRate > maxDrop) {
      maxDrop = stages[i].dropOffRate;
      biggestDropOff = { from: STAGE_ORDER[i - 1], to: STAGE_ORDER[i], rate: stages[i].dropOffRate };
    }
  }

  const topCount = stageCounts.studio_open;
  const bottomCount = stageCounts.reuse;
  const overallConversion = topCount > 0 ? Math.round((bottomCount / topCount) * 100) : 0;

  const completedFeedback = stageCounts.feedback;
  const hasReuse = stageCounts.reuse > 0;
  const hasFullChain = stageCounts.studio_open > 0 && stageCounts.generate > 0 && stageCounts.execute > 0 && stageCounts.feedback > 0;

  let workflowConfidence: FunnelResult['workflowConfidence'] = 'none';
  let isRealWorkflow = false;

  if (hasFullChain && hasReuse && completedFeedback >= 3) {
    workflowConfidence = 'high';
    isRealWorkflow = true;
  } else if (hasFullChain && completedFeedback >= 2) {
    workflowConfidence = 'medium';
    isRealWorkflow = true;
  } else if (stageCounts.execute > 0 && stageCounts.feedback > 0) {
    workflowConfidence = 'low';
    isRealWorkflow = false;
  }

  const suggestions = generateSuggestions(stages, biggestDropOff, stageCounts);

  return { stages, biggestDropOff, overallConversion, totalEvents: recent.length, isRealWorkflow, workflowConfidence, suggestions };
}

function generateSuggestions(
  stages: FunnelStageResult[],
  dropOff: FunnelResult['biggestDropOff'],
  counts: Record<FunnelStage, number>
): string[] {
  const suggestions: string[] = [];

  if (counts.studio_open === 0) {
    suggestions.push('尚无用户打开 Prompt Studio，需引导入口可见性');
  } else if (counts.generate === 0 || (counts.studio_open > 0 && counts.generate < counts.studio_open * 0.3)) {
    suggestions.push('Prompt 生成转化率过低，考虑简化生成流程或添加模板快选');
  }

  if (counts.generate > 0 && counts.execute === 0) {
    suggestions.push('Prompt 已生成但未执行，考虑添加「一键发送到 Playground」引导');
  }

  if (counts.execute > 0 && counts.feedback === 0) {
    suggestions.push('执行后无反馈，考虑简化反馈流程或添加自动弹窗');
  }

  if (counts.feedback > 0 && counts.asset_saved === 0) {
    suggestions.push('有反馈但无资产保存，考虑自动保存已执行的 Prompt');
  }

  if (counts.asset_saved > 0 && counts.reuse === 0) {
    suggestions.push('资产已保存但未复用，考虑在首页强化复用引导');
  }

  if (dropOff) {
    suggestions.push(`最大流失在「${STAGE_META[dropOff.from].label} → ${STAGE_META[dropOff.to].label}」，流失率 ${dropOff.rate}%`);
  }

  if (suggestions.length === 0) {
    suggestions.push('使用链路健康，继续观察数据变化');
  }

  return suggestions;
}

export function clearFunnelEvents(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(STORAGE_KEY);
}

export function getRecentEvents(limit: number = 20): FunnelEvent[] {
  return getEvents().slice(-limit).reverse();
}
