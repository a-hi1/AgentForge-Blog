// 方向探索核心引擎
import { callLLMWithJSON } from '@/lib/prompt-orchestrator/llm';
import {
  DiscoverySession,
  CollectedFacts,
  ProductDirection,
  UserProfile,
  DiscoveryQuestion,
  MarketAssessment,
  DifferentiationAnalysis,
  MVPShrink,
  ValidationPath,
  DirectionRecommendationReport,
  PhaseOutput,
} from './types';
import {
  createSession,
  advancePhase,
  addCollectedFacts,
  addConfirmedDecisions,
  setUnresolvedQuestions,
  canAdvancePhase,
} from './stateMachine';
import { getPhasePrompt } from './prompts';

// 处理第一阶段的响应
async function handleIdeaDeconstructionResponse(
  session: DiscoverySession,
  llmResponse: any
): Promise<DiscoverySession> {
  const analysis = llmResponse.analysis || '';
  const possibleDirections: ProductDirection[] = llmResponse.possibleDirections || [];
  let questions: DiscoveryQuestion[] = llmResponse.questions || [];

  // 动态填充方向选项
  questions = questions.map((q) => {
    if (q.id === 'selected_direction') {
      return {
        ...q,
        options: possibleDirections.map((d) => ({
          id: d.id,
          label: d.name,
          description: d.description,
        })),
      };
    }
    return q;
  });

  let updatedSession = addCollectedFacts(session, {
    possibleDirections,
  });

  updatedSession = setUnresolvedQuestions(updatedSession, questions);

  const phaseOutput: PhaseOutput = {
    analysis,
    questions,
    possibleDirections,
  };

  return updatedSession;
}

// 处理第二阶段的响应
async function handleRealityAssessmentResponse(
  session: DiscoverySession,
  llmResponse: any
): Promise<DiscoverySession> {
  const analysis = llmResponse.analysis || '';
  const marketAssessment: MarketAssessment = llmResponse.marketAssessment;

  let updatedSession = addCollectedFacts(session, {
    marketAssessment,
  });

  const phaseOutput: PhaseOutput = {
    analysis,
    marketAssessment,
  };

  return advancePhase(updatedSession, phaseOutput);
}

// 处理第三阶段的响应
async function handleDifferentiationAnalysisResponse(
  session: DiscoverySession,
  llmResponse: any
): Promise<DiscoverySession> {
  const analysis = llmResponse.analysis || '';
  const differentiation: DifferentiationAnalysis = llmResponse.differentiation;

  let updatedSession = addCollectedFacts(session, {
    differentiation,
  });

  const phaseOutput: PhaseOutput = {
    analysis,
    differentiation,
  };

  return advancePhase(updatedSession, phaseOutput);
}

// 处理第四阶段的响应
async function handleMVPShrinkResponse(
  session: DiscoverySession,
  llmResponse: any
): Promise<DiscoverySession> {
  const analysis = llmResponse.analysis || '';
  const mvp: MVPShrink = llmResponse.mvp;

  let updatedSession = addCollectedFacts(session, {
    mvp,
  });

  const phaseOutput: PhaseOutput = {
    analysis,
    mvp,
  };

  return advancePhase(updatedSession, phaseOutput);
}

// 处理第五阶段的响应
async function handleValidationPathResponse(
  session: DiscoverySession,
  llmResponse: any
): Promise<DiscoverySession> {
  const analysis = llmResponse.analysis || '';
  const validationPath: ValidationPath = llmResponse.validationPath;

  let updatedSession = addCollectedFacts(session, {
    validationPath,
  });

  const phaseOutput: PhaseOutput = {
    analysis,
    validationPath,
  };

  return advancePhase(updatedSession, phaseOutput);
}

// 处理第六阶段的响应
async function handleFinalConfirmationResponse(
  session: DiscoverySession,
  llmResponse: any
): Promise<DiscoverySession> {
  const analysis = llmResponse.analysis || '';
  const report: DirectionRecommendationReport = llmResponse.report;

  let updatedSession = addCollectedFacts(session, {
    finalReport: report,
  });

  const phaseOutput: PhaseOutput = {
    analysis,
    report,
  };

  return advancePhase(updatedSession, phaseOutput);
}

// 执行当前阶段
export async function executePhase(
  session: DiscoverySession,
  onEvent?: (event: {
    type: 'phase_start' | 'phase_analysis' | 'phase_complete';
    phase: string;
    data?: any;
  }) => void
): Promise<DiscoverySession> {
  const { system, user } = getPhasePrompt(
    session.currentPhase,
    session.collectedFacts
  );

  onEvent?.({
    type: 'phase_start',
    phase: session.currentPhase,
  });

  try {
    const llmResponse = await callLLMWithJSON([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);

    onEvent?.({
      type: 'phase_analysis',
      phase: session.currentPhase,
      data: llmResponse,
    });

    let updatedSession: DiscoverySession;

    switch (session.currentPhase) {
      case 'idea_deconstruction':
        updatedSession = await handleIdeaDeconstructionResponse(
          session,
          llmResponse
        );
        break;
      case 'reality_assessment':
        updatedSession = await handleRealityAssessmentResponse(
          session,
          llmResponse
        );
        break;
      case 'differentiation_analysis':
        updatedSession = await handleDifferentiationAnalysisResponse(
          session,
          llmResponse
        );
        break;
      case 'mvp_shrink':
        updatedSession = await handleMVPShrinkResponse(session, llmResponse);
        break;
      case 'validation_path':
        updatedSession = await handleValidationPathResponse(session, llmResponse);
        break;
      case 'final_confirmation':
        updatedSession = await handleFinalConfirmationResponse(
          session,
          llmResponse
        );
        break;
      default:
        updatedSession = session;
    }

    onEvent?.({
      type: 'phase_complete',
      phase: session.currentPhase,
      data: llmResponse,
    });

    return updatedSession;
  } catch (error) {
    console.error('Phase execution error:', error);
    throw error;
  }
}

// 处理用户回答
export function handleUserAnswers(
  session: DiscoverySession,
  answers: Record<string, string | string[]>
): DiscoverySession {
  let updatedSession = { ...session };
  const facts: Partial<CollectedFacts> = {};
  const decisions: Partial<DiscoverySession['confirmedDecisions']> = {};

  // 处理动机
  if (answers.motivation) {
    const motivations = Array.isArray(answers.motivation)
      ? answers.motivation
      : [answers.motivation];
    facts.userProfile = {
      ...session.collectedFacts.userProfile,
      motivation: motivations,
    } as UserProfile;
  }

  // 处理技术水平
  if (answers.skill_level) {
    facts.userProfile = {
      ...facts.userProfile,
      ...session.collectedFacts.userProfile,
      skillLevel: answers.skill_level as UserProfile['skillLevel'],
    } as UserProfile;
  }

  // 处理时间预算
  if (answers.time_budget) {
    facts.userProfile = {
      ...facts.userProfile,
      ...session.collectedFacts.userProfile,
      timeBudget: answers.time_budget as UserProfile['timeBudget'],
    } as UserProfile;
  }

  // 处理方向选择
  if (answers.selected_direction) {
    const directionId = answers.selected_direction as string;
    const selectedDirection = (session.collectedFacts as any)
      .possibleDirections?.find((d: ProductDirection) => d.id === directionId);
    
    if (selectedDirection) {
      facts.selectedDirection = selectedDirection;
      decisions.directionId = directionId;
    }
  }

  if (Object.keys(facts).length > 0) {
    updatedSession = addCollectedFacts(updatedSession, facts);
  }

  if (Object.keys(decisions).length > 0) {
    updatedSession = addConfirmedDecisions(updatedSession, decisions);
  }

  // 清除已回答的问题
  const answeredQuestionIds = Object.keys(answers);
  updatedSession.unresolvedQuestions = updatedSession.unresolvedQuestions.filter(
    (q) => !answeredQuestionIds.includes(q.id)
  );

  return updatedSession;
}

// 开始方向探索
export async function startDiscovery(
  idea: string,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  let session = createSession(idea);
  session = await executePhase(session, onEvent);
  return session;
}

// 继续探索（用户回答后）
export async function continueDiscovery(
  session: DiscoverySession,
  answers: Record<string, string | string[]>,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  let updatedSession = handleUserAnswers(session, answers);

  // 如果没有未解决问题，进入下一阶段
  while (
    canAdvancePhase(updatedSession) &&
    updatedSession.currentPhase !== 'complete'
  ) {
    if (updatedSession.currentPhase !== 'final_confirmation') {
      updatedSession = advancePhase(updatedSession);
    }
    updatedSession = await executePhase(updatedSession, onEvent);
  }

  return updatedSession;
}
