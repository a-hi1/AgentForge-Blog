// 方向探索状态机
import {
  DiscoverySession,
  DiscoveryPhase,
  CollectedFacts,
  ConfirmedDecisions,
  PhaseOutput,
  DiscoveryQuestion,
} from './types';

// 生成唯一 ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// 创建新会话
export function createSession(originalIdea: string): DiscoverySession {
  return {
    id: generateId(),
    currentPhase: 'idea_deconstruction',
    collectedFacts: {
      originalIdea,
    },
    unresolvedQuestions: [],
    confirmedDecisions: {},
    phaseHistory: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

// 阶段转换映射
const phaseTransitions: Record<DiscoveryPhase, DiscoveryPhase> = {
  initial: 'idea_deconstruction',
  idea_deconstruction: 'reality_assessment',
  reality_assessment: 'differentiation_analysis',
  differentiation_analysis: 'mvp_shrink',
  mvp_shrink: 'validation_path',
  validation_path: 'final_confirmation',
  final_confirmation: 'complete',
  complete: 'complete',
};

// 更新会话状态
export function updateSession(
  session: DiscoverySession,
  updates: Partial<DiscoverySession>
): DiscoverySession {
  return {
    ...session,
    ...updates,
    updatedAt: Date.now(),
  };
}

// 进入下一阶段
export function advancePhase(
  session: DiscoverySession,
  phaseOutput?: PhaseOutput
): DiscoverySession {
  const nextPhase = phaseTransitions[session.currentPhase];
  
  const updatedSession = updateSession(session, {
    currentPhase: nextPhase,
  });

  if (phaseOutput) {
    updatedSession.phaseHistory.push({
      phase: session.currentPhase,
      output: phaseOutput,
      timestamp: Date.now(),
    });
  }

  return updatedSession;
}

// 添加收集的事实
export function addCollectedFacts(
  session: DiscoverySession,
  facts: Partial<CollectedFacts>
): DiscoverySession {
  return updateSession(session, {
    collectedFacts: {
      ...session.collectedFacts,
      ...facts,
    },
  });
}

// 添加确认的决策
export function addConfirmedDecisions(
  session: DiscoverySession,
  decisions: Partial<ConfirmedDecisions>
): DiscoverySession {
  return updateSession(session, {
    confirmedDecisions: {
      ...session.confirmedDecisions,
      ...decisions,
    },
  });
}

// 设置未解决问题
export function setUnresolvedQuestions(
  session: DiscoverySession,
  questions: DiscoveryQuestion[]
): DiscoverySession {
  return updateSession(session, {
    unresolvedQuestions: questions,
  });
}

// 清除已回答的问题
export function clearAnsweredQuestion(
  session: DiscoverySession,
  questionId: string
): DiscoverySession {
  return updateSession(session, {
    unresolvedQuestions: session.unresolvedQuestions.filter(
      (q) => q.id !== questionId
    ),
  });
}

// 获取阶段名称（中文）
export function getPhaseName(phase: DiscoveryPhase): string {
  const phaseNames: Record<DiscoveryPhase, string> = {
    initial: '初始阶段',
    idea_deconstruction: '想法拆解',
    reality_assessment: '现实评估',
    differentiation_analysis: '差异化分析',
    mvp_shrink: 'MVP 收缩',
    validation_path: '验证路径',
    final_confirmation: '最终确认',
    complete: '完成',
  };
  return phaseNames[phase];
}

// 检查是否可以进入下一阶段
export function canAdvancePhase(session: DiscoverySession): boolean {
  return session.unresolvedQuestions.length === 0;
}
