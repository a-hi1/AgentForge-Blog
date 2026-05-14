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
      const result = await callLLMWithJSON<T>(messages);
      // 验证返回结果不是空对象或null
      if (result && typeof result === 'object' && Object.keys(result).length > 0) {
        return result;
      }
      console.warn(`LLM返回空结果，重试 ${i + 1}/${maxRetries}`);
      lastError = new Error('LLM返回空结果');
    } catch (error) {
      lastError = error as Error;
      console.error(`LLM调用失败 (${i + 1}/${maxRetries}):`, error);
    }
    if (i < maxRetries - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw lastError || new Error('LLM调用失败');
}

function getDefaultIdeaDeconstruction(idea: string): IdeaDeconstruction {
  return {
    analysis: `你想做「${idea}」，核心是解决用户在相关场景下的具体痛点。需要明确：目标用户是谁？他们现在怎么解决这个问题？你的方案相比现有方案有什么不同？先从最小的功能集开始验证核心假设。`,
    coreInsights: [
      `核心价值：围绕「${idea}」解决一个具体的用户痛点，而不是做大而全的平台`,
      `切入点：找到一个现有产品做得不好的细分场景，从那里开始`,
      `验证优先：先用最简单的方式验证用户是否真的需要这个功能，再投入开发`
    ]
  };
}

function getDefaultMarketReality(idea: string): MarketReality {
  return {
    whyCrowded: `「${idea}」这个方向已经有成熟产品在做，用户有多种选择，新进入者需要找到差异化切入点`,
    giants: ['主流成熟产品 - 已有大量用户和品牌认知', '新兴竞品 - 在特定细分有优势'],
    whyWontMigrate: '用户已经在现有产品中积累了数据和使用习惯，迁移成本高',
    nicheOpportunities: [
      `专注「${idea}」的某个细分场景，做深做透`,
      '服务被现有产品忽视的特定用户群体',
      '在某个功能上做到极致体验'
    ],
    avoidAreas: ['不要做大而全的平台', '不要正面与巨头竞争核心功能', '不要在没有验证的情况下大量投入']
  };
}

function getDefaultDifferentiation(idea: string): Differentiation {
  return {
    entryPoint: `专注于「${idea}」中最核心的一个功能场景，把这个做到极致，而不是做很多功能`,
    easiestUserGroup: '对现有产品不满意、愿意尝试新方案的早期 adopter',
    minimalDifferentiation: '在一个关键功能上提供明显更好的体验，让用户有理由切换',
    whyBigPlayersWontDoIt: '大公司关注大市场，细分场景的精细化运营不是他们的优先级'
  };
}

function getDefaultMVP(idea: string): MVPShrink {
  return {
    mustHave: [
      `「${idea}」最核心的一个功能 - 解决用户最痛的问题`,
      '基础的数据记录和查看 - 让用户能看到自己的使用轨迹',
      '简单的设置和引导 - 降低用户的使用门槛'
    ],
    mustNotDo: [
      '社交功能 - 先不做分享、排行等社交特性',
      '复杂的数据分析 - 先用最简单的统计',
      '多平台同步 - 先做一个平台'
    ],
    fastestValidation: '先做一个简单的原型，让 10 个目标用户试用，观察他们是否真的会持续使用',
    validationSteps: [
      '找 10 个目标用户，了解他们现在的解决方案',
      '做一个最简单的原型，展示核心功能',
      '让用户试用 1 周，看留存率和反馈'
    ]
  };
}

function getDefaultDirections(idea: string): ProductDirection[] {
  return [
    {
      id: 'd1',
      name: `极简${idea.replace(/想做|做|App|应用|工具/g, '').trim()}工具`,
      whyFits: `只做「${idea}」最核心的一个功能，快速上线验证`,
      techFeasibility: '单人 2-3 周可完成，技术栈简单',
      riskLevel: '低',
      competition: '中等',
      estimateCycle: '2-3 周'
    },
    {
      id: 'd2',
      name: `垂直场景版${idea.replace(/想做|做|App|应用|工具/g, '').trim()}`,
      whyFits: `针对特定用户群体的「${idea}」，做更贴合他们需求的功能`,
      techFeasibility: '需要更多定制化开发，3-4 周',
      riskLevel: '中',
      competition: '较少',
      estimateCycle: '3-4 周'
    }
  ];
}

function getDefaultReport(idea: string): any {
  return {
    title: `「${idea}」方向建议报告`,
    worthDoing: '值得小规模验证',
    reason: `「${idea}」有真实的用户需求，但竞争也存在。建议先验证核心假设，再决定是否深入投入。`,
    whereToStart: `从「${idea}」最核心的功能开始，做一个最简单的原型，找 10 个目标用户试用`,
    minimalValidation: '用 2-3 周做一个最小原型，观察用户是否真的会持续使用',
    summary: `建议从小规模验证开始，先确认用户真的需要「${idea}」的核心功能`,
    risks: '主要风险是用户留存 - 很多工具类产品初期新鲜感过后就不用了，需要在产品设计上解决这个问题'
  };
}

// 验证LLM返回的分析是否有意义（不是空话）
function isAnalysisMeaningful(analysis: string | undefined): boolean {
  if (!analysis || typeof analysis !== 'string') return false;
  const genericPhrases = ['分析完成', '正在分析', '值得探索', '需要进一步', '建议从'];
  return analysis.length > 20 && !genericPhrases.some(p => analysis === p);
}

async function executePhase(
  session: DiscoverySession,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  onEvent?.({ type: 'phase_start', phase: session.currentPhase });

  let updatedSession = { ...session };
  const phaseOutput: PhaseOutput = { analysis: '分析完成' };
  let llmFailed = false;

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
        llmFailed = true;
        console.error('想法拆解阶段LLM调用失败:', error);
        const defaultDeconstruction = getDefaultIdeaDeconstruction(session.collectedFacts.originalIdea);
        updatedSession = addCollectedFacts(updatedSession, { ideaDeconstruction: defaultDeconstruction });
        (phaseOutput as Record<string, unknown>).ideaDeconstruction = defaultDeconstruction;
        phaseOutput.analysis = '想法拆解完成（使用默认分析）';
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
        llmFailed = true;
        console.error('市场评估阶段LLM调用失败:', error);
        const defaultMarket = getDefaultMarketReality(session.collectedFacts.originalIdea);
        updatedSession = addCollectedFacts(updatedSession, { marketReality: defaultMarket });
        (phaseOutput as Record<string, unknown>).marketReality = defaultMarket;
        phaseOutput.analysis = '市场评估完成（使用默认分析）';
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
        llmFailed = true;
        console.error('差异化分析阶段LLM调用失败:', error);
        const defaultDiff = getDefaultDifferentiation(session.collectedFacts.originalIdea);
        updatedSession = addCollectedFacts(updatedSession, { differentiation: defaultDiff });
        (phaseOutput as Record<string, unknown>).differentiation = defaultDiff;
        phaseOutput.analysis = '差异化分析完成（使用默认分析）';
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
        llmFailed = true;
        console.error('MVP设计阶段LLM调用失败:', error);
        const defaultMVP = getDefaultMVP(session.collectedFacts.originalIdea);
        updatedSession = addCollectedFacts(updatedSession, { mvp: defaultMVP });
        (phaseOutput as Record<string, unknown>).mvp = defaultMVP;
        phaseOutput.analysis = 'MVP设计完成（使用默认分析）';
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
        llmFailed = true;
        console.error('方向分析阶段LLM调用失败:', error);
        const defaultDirs = getDefaultDirections(session.collectedFacts.originalIdea);
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
        phaseOutput.analysis = '方向分析完成（使用默认分析）';
      }
      let directions: ProductDirection[] = [];
      if (llmResponse) {
        directions = llmResponse.directions as ProductDirection[];
        if (!directions || !Array.isArray(directions) || directions.length === 0) {
          directions = getDefaultDirections(session.collectedFacts.originalIdea);
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
        llmFailed = true;
        console.error('最终确认阶段LLM调用失败:', error);
        const defaultReport = getDefaultReport(session.collectedFacts.originalIdea);
        updatedSession = addCollectedFacts(updatedSession, { finalReport: defaultReport });
        (phaseOutput as Record<string, unknown>).report = defaultReport;
        phaseOutput.analysis = '最终建议完成（使用默认分析）';
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

  // 通知前端是否有LLM失败
  if (llmFailed) {
    onEvent?.({ type: 'phase_warning', phase: session.currentPhase, message: 'AI分析暂时不可用，使用了默认分析。你可以稍后重试获得更好的分析。' });
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
