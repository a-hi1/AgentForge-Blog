import { callLLMWithJSON } from '@/lib/prompt-orchestrator/llm';
import {
  DiscoverySession,
  CollectedFacts,
  ProductDirection,
  DiscoveryQuestion,
  MarketReality,
  Differentiation,
  MVPShrink,
  PhaseOutput,
  IdeaDeconstruction,
} from './types';
import {
  createSession,
  advancePhase,
  addCollectedFacts,
  setUnresolvedQuestions,
} from './stateMachine';
import { getPhasePrompt } from './prompts';

async function callLLMWithRetry<T>(
  messages: Array<{ role: string; content: string }>,
  maxRetries = 3
): Promise<T> {
  let lastError: Error | null = null;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await callLLMWithJSON<T>(messages);
    } catch (error) {
      lastError = error as Error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw lastError || new Error('LLM调用失败');
}

function getDefaultIdeaDeconstruction(idea: string): IdeaDeconstruction {
  return {
    analysis: `让我们一起深入分析你的想法：${idea}。这是一个值得探索的方向。`,
    coreInsights: [
      '需要进一步明确核心价值',
      '建议从最小场景切入',
      '先验证需求再投入开发'
    ]
  };
}

function getDefaultMarketReality(): MarketReality {
  return {
    whyCrowded: '这个方向有一定市场需求',
    giants: ['现有成熟产品'],
    whyWontMigrate: '用户已有使用习惯',
    nicheOpportunities: ['垂直细分场景'],
    avoidAreas: ['不要与大公司正面竞争']
  };
}

function getDefaultDifferentiation(): Differentiation {
  return {
    entryPoint: '从一个具体小场景切入',
    easiestUserGroup: '有明确痛点的用户',
    minimalDifferentiation: '专注解决一个核心问题',
    whyBigPlayersWontDoIt: '这不是他们的核心业务'
  };
}

function getDefaultMVP(): MVPShrink {
  return {
    mustHave: ['核心功能1', '核心功能2', '核心功能3'],
    mustNotDo: ['复杂功能', '社交功能', '高级配置'],
    fastestValidation: '先做一个简单的原型验证',
    validationSteps: ['验证需求', '验证产品', '验证市场']
  };
}

function getDefaultDirections(): ProductDirection[] {
  return [
    { id: 'd1', name: '简洁实用版', whyFits: '专注核心功能', techFeasibility: '技术可行', riskLevel: '低', competition: '中等', estimateCycle: '2-4周' },
    { id: 'd2', name: '垂直场景版', whyFits: '聚焦特定人群', techFeasibility: '实现不难', riskLevel: '中', competition: '较少', estimateCycle: '3-5周' }
  ];
}

function getDefaultReport(): any {
  return {
    title: '方向建议报告',
    worthDoing: '值得小规模验证',
    reason: '这个方向有实际需求',
    whereToStart: '从最小可行验证开始',
    minimalValidation: '先做简单的原型',
    summary: '建议从小开始验证',
    risks: '注意用户获取成本'
  };
}

async function executePhase(
  session: DiscoverySession,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  onEvent?.({ type: 'phase_start', phase: session.currentPhase });

  let updatedSession = { ...session };
  const phaseOutput: PhaseOutput = { analysis: '分析完成' };

  switch (session.currentPhase) {
    case 'idea_deconstruction': {
      const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);
      let llmResponse;
      try {
        llmResponse = await callLLMWithRetry<Record<string, unknown>>([
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]);
      } catch (error) {
        phaseOutput.analysis = '正在分析你的想法...';
        const defaultDeconstruction = getDefaultIdeaDeconstruction(session.collectedFacts.originalIdea);
        updatedSession = addCollectedFacts(updatedSession, { ideaDeconstruction: defaultDeconstruction });
        (phaseOutput as Record<string, unknown>).ideaDeconstruction = defaultDeconstruction;
      }
      if (llmResponse) {
        const ideaDeconstruction = llmResponse.ideaDeconstruction as IdeaDeconstruction || {
          analysis: llmResponse.analysis as string,
          coreInsights: (llmResponse.coreInsights as string[]) || ['需要深入分析']
        };
        updatedSession = addCollectedFacts(updatedSession, { ideaDeconstruction });
        (phaseOutput as Record<string, unknown>).ideaDeconstruction = ideaDeconstruction;
        phaseOutput.analysis = llmResponse.analysis as string || '想法分析完成';
        if (llmResponse.questions) {
          const questions = llmResponse.questions as DiscoveryQuestion[];
          if (questions && questions.length > 0) {
            updatedSession = setUnresolvedQuestions(updatedSession, questions);
            phaseOutput.questions = questions;
          }
        }
      }
      break;
    }
    case 'reality_assessment': {
      const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);
      let llmResponse;
      try {
        llmResponse = await callLLMWithRetry<Record<string, unknown>>([
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]);
      } catch (error) {
        phaseOutput.analysis = '正在分析市场情况...';
        const defaultMarket = getDefaultMarketReality();
        updatedSession = addCollectedFacts(updatedSession, { marketReality: defaultMarket });
        (phaseOutput as Record<string, unknown>).marketReality = defaultMarket;
      }
      if (llmResponse) {
        const marketReality = llmResponse.marketReality as MarketReality;
        if (marketReality) {
          updatedSession = addCollectedFacts(updatedSession, { marketReality });
          (phaseOutput as Record<string, unknown>).marketReality = marketReality;
        }
        phaseOutput.analysis = llmResponse.analysis as string || '市场分析完成';
      }
      break;
    }
    case 'differentiation_analysis': {
      const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);
      let llmResponse;
      try {
        llmResponse = await callLLMWithRetry<Record<string, unknown>>([
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]);
      } catch (error) {
        phaseOutput.analysis = '正在寻找差异化机会...';
        const defaultDiff = getDefaultDifferentiation();
        updatedSession = addCollectedFacts(updatedSession, { differentiation: defaultDiff });
        (phaseOutput as Record<string, unknown>).differentiation = defaultDiff;
      }
      if (llmResponse) {
        const differentiation = llmResponse.differentiation as Differentiation;
        if (differentiation) {
          updatedSession = addCollectedFacts(updatedSession, { differentiation });
          (phaseOutput as Record<string, unknown>).differentiation = differentiation;
        }
        phaseOutput.analysis = llmResponse.analysis as string || '差异化分析完成';
      }
      break;
    }
    case 'mvp_shrink': {
      const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);
      let llmResponse;
      try {
        llmResponse = await callLLMWithRetry<Record<string, unknown>>([
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]);
      } catch (error) {
        phaseOutput.analysis = '正在设计MVP...';
        const defaultMVP = getDefaultMVP();
        updatedSession = addCollectedFacts(updatedSession, { mvp: defaultMVP });
        (phaseOutput as Record<string, unknown>).mvp = defaultMVP;
      }
      if (llmResponse) {
        const mvp = llmResponse.mvp as MVPShrink;
        if (mvp) {
          updatedSession = addCollectedFacts(updatedSession, { mvp });
          (phaseOutput as Record<string, unknown>).mvp = mvp;
        }
        phaseOutput.analysis = llmResponse.analysis as string || 'MVP设计完成';
      }
      break;
    }
    case 'validation_path': {
      const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);
      let llmResponse;
      try {
        llmResponse = await callLLMWithRetry<Record<string, unknown>>([
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]);
      } catch (error) {
        phaseOutput.analysis = '正在生成方向建议...';
        const defaultDirs = getDefaultDirections();
        (updatedSession.collectedFacts as Record<string, unknown>).possibleDirections = defaultDirs;
        (phaseOutput as Record<string, unknown>).directions = defaultDirs;
        const dirQuestion: DiscoveryQuestion = {
          id: 'pick_direction',
          type: 'single_choice',
          text: '你对哪个方向最感兴趣？',
          options: defaultDirs.map(d => ({ id: d.id, label: d.name, description: d.whyFits }))
        };
        updatedSession = setUnresolvedQuestions(updatedSession, [dirQuestion]);
        phaseOutput.questions = [dirQuestion];
      }
      let directions: ProductDirection[] = [];
      if (llmResponse) {
        directions = llmResponse.directions as ProductDirection[];
        if (!directions || !Array.isArray(directions) || directions.length === 0) {
          directions = getDefaultDirections();
        }
        (updatedSession.collectedFacts as Record<string, unknown>).possibleDirections = directions;
        (phaseOutput as Record<string, unknown>).directions = directions;
        phaseOutput.analysis = llmResponse.analysis as string || '方向分析完成';
        if (llmResponse.question) {
          const question = llmResponse.question as DiscoveryQuestion;
          updatedSession = setUnresolvedQuestions(updatedSession, [question]);
          phaseOutput.questions = [question];
        } else {
          const dirQuestion: DiscoveryQuestion = {
            id: 'pick_direction',
            type: 'single_choice',
            text: '你对哪个方向最感兴趣？',
            options: directions.map(d => ({ id: d.id, label: d.name, description: d.whyFits }))
          };
          updatedSession = setUnresolvedQuestions(updatedSession, [dirQuestion]);
          phaseOutput.questions = [dirQuestion];
        }
      }
      break;
    }
    case 'final_confirmation': {
      const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);
      let llmResponse;
      try {
        llmResponse = await callLLMWithRetry<Record<string, unknown>>([
          { role: 'system', content: system },
          { role: 'user', content: user },
        ]);
      } catch (error) {
        phaseOutput.analysis = '正在生成最终建议...';
        const defaultReport = getDefaultReport();
        updatedSession = addCollectedFacts(updatedSession, { finalReport: defaultReport });
        (phaseOutput as Record<string, unknown>).report = defaultReport;
      }
      if (llmResponse) {
        const report = llmResponse.report as any;
        if (report) {
          updatedSession = addCollectedFacts(updatedSession, { finalReport: report });
          (phaseOutput as Record<string, unknown>).report = report;
        }
        phaseOutput.analysis = llmResponse.analysis as string || '最终建议完成';
      }
      break;
    }
  }

  onEvent?.({ type: 'phase_analysis', phase: session.currentPhase, data: { ...phaseOutput } });
  updatedSession = advancePhase(updatedSession, phaseOutput);
  onEvent?.({ type: 'phase_complete', phase: session.currentPhase });
  onEvent?.({
    type: 'session_update',
    session: updatedSession,
    report: updatedSession.collectedFacts.finalReport
  });

  return updatedSession;
}

function handleUserAnswers(
  session: DiscoverySession,
  answers: Record<string, string | string[]>
): DiscoverySession {
  let updatedSession = { ...session };
  const facts: Partial<CollectedFacts> = {};
  const directionAnswer = answers.pick_direction;
  if (directionAnswer) {
    const directionId = Array.isArray(directionAnswer) ? directionAnswer[0] : directionAnswer;
    const possibleDirections = (session.collectedFacts as Record<string, unknown>).possibleDirections as ProductDirection[] | undefined;
    const selected = possibleDirections?.find((d) => d.id === directionId);
    if (selected) {
      facts.selectedDirection = selected;
    }
  }
  if (Object.keys(facts).length > 0) {
    updatedSession = addCollectedFacts(updatedSession, facts);
  }
  updatedSession.unresolvedQuestions = [];
  return updatedSession;
}

export async function startDiscovery(
  idea: string,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  let session = createSession(idea);
  
  // 自动执行阶段，直到完成或需要用户输入
  while (session.currentPhase !== 'complete' && session.unresolvedQuestions.length === 0) {
    session = await executePhase(session, onEvent);
  }
  
  return session;
}

export async function continueDiscovery(
  session: DiscoverySession,
  answers: Record<string, string | string[]>,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  let updatedSession = handleUserAnswers(session, answers);
  
  // 自动执行阶段，直到完成或需要用户输入
  while (updatedSession.currentPhase !== 'complete' && updatedSession.unresolvedQuestions.length === 0) {
    updatedSession = await executePhase(updatedSession, onEvent);
  }
  
  return updatedSession;
}
