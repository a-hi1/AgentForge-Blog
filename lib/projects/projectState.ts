'use client';

import { useState, useEffect, useCallback } from 'react';
import { ExecutionRecord } from '@/lib/agent-runtime/storage';

export interface ProjectPhase {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'in-progress' | 'completed';
  completionPercentage: number;
  startDate?: Date;
  endDate?: Date;
}

export interface RecentActivity {
  id: string;
  timestamp: Date;
  task: string;
  status: 'completed' | 'failed' | 'in-progress';
  type: 'execution' | 'prompt' | 'lab' | 'fix';
  relatedId?: string;
}

export interface ProjectBlocker {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  detectedDate: Date;
  source: string;
}

export interface NextAction {
  id: string;
  title: string;
  description: string;
  estimatedTime: string;
  impact: 'major' | 'minor' | 'critical';
  targetRoute: string;
  suggestedPrompt?: string;
}

export interface ProjectState {
  projectName: string;
  currentVersion: string;
  currentPhase: string;
  overallProgress: number;
  lastUpdated: Date;
  status: 'active' | 'paused' | 'completed';
  
  phases: ProjectPhase[];
  recentActivities: RecentActivity[];
  blockers: ProjectBlocker[];
  nextActions: NextAction[];
  
  stats: {
    totalExecutions: number;
    successRate: number;
    avgExecutionTime: number;
    memoryHitRate: number;
    totalPrompts: number;
  };
}

const DEFAULT_PHASES: ProjectPhase[] = [
  { id: 'phase1', name: 'Phase 1 基础系统', description: '搭建基础架构和核心功能', status: 'completed', completionPercentage: 100 },
  { id: 'phase2', name: 'Phase 2 Runtime', description: '实现智能执行引擎', status: 'completed', completionPercentage: 100 },
  { id: 'phase3', name: 'Phase 3 Memory', description: '实现记忆增强功能', status: 'completed', completionPercentage: 100 },
  { id: 'phase4', name: 'Phase 4 Showcase', description: '构建演示和展示页面', status: 'completed', completionPercentage: 100 },
  { id: 'phase5', name: 'Phase 5 Production', description: '部署和上线', status: 'in-progress', completionPercentage: 60 },
  { id: 'phase6', name: 'PromptOS V1', description: '提示词编排系统', status: 'completed', completionPercentage: 100 },
  { id: 'phase7', name: 'PromptOS V2', description: '智能推理型 Prompt Architect', status: 'in-progress', completionPercentage: 85 },
];

export async function fetchProjectData(): Promise<{
  executions: ExecutionRecord[];
  state: ProjectState;
}> {
  try {
    const response = await fetch('/api/executions');
    const executions = await response.json();
    const state = deriveProjectState(executions);
    return { executions, state };
  } catch (error) {
    console.error('[ProjectHub] Failed to fetch data:', error);
    const state = getFallbackState();
    return { executions: [], state };
  }
}

function getFallbackState(): ProjectState {
  return {
    projectName: 'AgentForge',
    currentVersion: 'v5.2',
    currentPhase: 'PromptOS V2',
    overallProgress: 75,
    lastUpdated: new Date(),
    status: 'active',
    phases: DEFAULT_PHASES,
    recentActivities: [
      { id: '1', timestamp: new Date(Date.now() - 1000 * 60 * 30), task: '升级 Prompt Strategy Generator', status: 'completed', type: 'prompt' },
      { id: '2', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2), task: '优化 Prompt 输出质量', status: 'completed', type: 'execution' },
      { id: '3', timestamp: new Date(Date.now() - 1000 * 60 * 60 * 4), task: '修复 Supabase 初始化', status: 'completed', type: 'execution' },
    ],
    blockers: [
      { id: 'b1', title: 'Prompt 质量评分', description: '输出质量评分不稳定，需要进一步优化', priority: 'medium', detectedDate: new Date(), source: 'scoring' },
      { id: 'b2', title: '移动端体验', description: '移动端布局在小屏幕上较为拥挤', priority: 'low', detectedDate: new Date(Date.now() - 1000 * 60 * 60 * 24), source: 'ui' },
    ],
    nextActions: [
      {
        id: 'na1',
        title: '完善 PromptOS V2 深度模式',
        description: '优化 architect 模式的输出质量和深度',
        estimatedTime: '1-2h',
        impact: 'major',
        targetRoute: '/prompt',
        suggestedPrompt: '优化 PromptOS V2 架构模式的输出质量'
      },
      {
        id: 'na2',
        title: '添加更多问题修复场景',
        description: '扩展 Issue Solver 的覆盖范围',
        estimatedTime: '30-60min',
        impact: 'minor',
        targetRoute: '/fix',
        suggestedPrompt: '为 Issue Solver 添加更多场景支持'
      },
    ],
    stats: {
      totalExecutions: 12,
      successRate: 85,
      avgExecutionTime: 45,
      memoryHitRate: 70,
      totalPrompts: 5,
    },
  };
}

function deriveProjectState(executions: ExecutionRecord[]): ProjectState {
  const recentActivities: RecentActivity[] = executions.slice(0, 10).map((exec) => ({
    id: exec.id,
    timestamp: new Date(exec.timestamp || Date.now()),
    task: exec.prompt.length > 50 ? exec.prompt.substring(0, 50) + '...' : exec.prompt,
    status: exec.status === 'completed' ? 'completed' : exec.status === 'failed' ? 'failed' : 'in-progress',
    type: 'execution',
    relatedId: exec.id,
  }));

  const completedCount = executions.filter(e => e.status === 'completed').length;
  const totalCount = Math.max(executions.length, 1);
  const successRate = Math.round((completedCount / totalCount) * 100);

  // Derive from real execution records only (no Math.random cosmetics)
  let durationSum = 0;
  let durationCount = 0;
  for (const exec of executions) {
    for (const step of exec.steps || []) {
      const d = (step as { duration?: number }).duration;
      if (typeof d === 'number' && d > 0) {
        durationSum += d;
        durationCount += 1;
      }
    }
  }
  const avgTime = durationCount > 0 ? Math.round(durationSum / durationCount / 1000) : 0;
  const memoryHits = executions.filter((e) => (e as { memory_influenced?: boolean }).memory_influenced).length;
  const memoryHit = executions.length > 0 ? Math.round((memoryHits / executions.length) * 100) : 0;

  const blockers: ProjectBlocker[] = [];
  if (successRate < 90) {
    blockers.push({
      id: 'b1',
      title: '执行成功率优化',
      description: `当前成功率为 ${successRate}%，建议优化失败场景处理`,
      priority: successRate < 75 ? 'high' : 'medium',
      detectedDate: new Date(),
      source: 'execution',
    });
  }

  const nextActions: NextAction[] = [
    {
      id: 'na1',
      title: '继续优化 PromptOS',
      description: '完善提示词深度模式的质量评分和重写逻辑',
      estimatedTime: '1-2h',
      impact: 'major',
      targetRoute: '/prompt',
      suggestedPrompt: '提升 PromptOS V2 质量评分的稳定性'
    },
    {
      id: 'na2',
      title: '执行更多测试',
      description: '通过更多执行记录收集数据，优化智能推荐',
      estimatedTime: '30-60min',
      impact: 'minor',
      targetRoute: '/playground',
    },
  ];

  const phases = [...DEFAULT_PHASES];
  const latestExec = executions[0];
  if (latestExec) {
    if (latestExec.prompt.toLowerCase().includes('prompt') || latestExec.prompt.toLowerCase().includes('提示词')) {
      phases[6].completionPercentage = Math.min(100, phases[6].completionPercentage + 5);
    }
  }

  const overallProgress = Math.round(phases.reduce((acc, p) => acc + p.completionPercentage, 0) / phases.length);

  return {
    projectName: 'AgentForge',
    currentVersion: 'v5.2',
    currentPhase: 'PromptOS V2',
    overallProgress,
    lastUpdated: new Date(),
    status: 'active',
    phases,
    recentActivities,
    blockers,
    nextActions,
    stats: {
      totalExecutions: executions.length,
      successRate,
      avgExecutionTime: avgTime,
      memoryHitRate: memoryHit,
      totalPrompts: Math.max(executions.length, 0),
    },
  };
}

export function useProjectState() {
  const [loading, setLoading] = useState(true);
  const [projectState, setProjectState] = useState<ProjectState | null>(null);
  const [executions, setExecutions] = useState<ExecutionRecord[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchProjectData();
      setProjectState(data.state);
      setExecutions(data.executions);
    } catch (error) {
      console.error('[ProjectHub] Load error:', error);
      setProjectState(getFallbackState());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  return {
    loading,
    projectState,
    executions,
    refresh: loadData,
  };
}
