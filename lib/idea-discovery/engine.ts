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
} from './types';
import {
  createSession,
  advancePhase,
  addCollectedFacts,
  setUnresolvedQuestions,
  canAdvancePhase,
} from './stateMachine';
import { getPhasePrompt } from './prompts';

function getFixedQuestions(): DiscoveryQuestion[] {
  return [
    {
      id: 'q_skill',
      type: 'single_choice',
      text: '你的技术背景？',
      options: [
        { id: 'frontend', label: '前端开发' },
        { id: 'backend', label: '后端开发' },
        { id: 'fullstack', label: '全栈开发' },
        { id: 'beginner', label: '没有编程经验' }
      ]
    },
    {
      id: 'q_time',
      type: 'single_choice',
      text: '每周能投入多少时间？',
      options: [
        { id: 'weekend', label: '只有周末（5小时）' },
        { id: 'parttime', label: '部分时间（10-20小时）' },
        { id: 'fulltime', label: '几乎全部时间（40小时）' }
      ]
    },
    {
      id: 'q_motivation',
      type: 'single_choice',
      text: '主要动机是什么？',
      options: [
        { id: 'learn', label: '学习新技术' },
        { id: 'side', label: '做个副业' },
        { id: 'portfolio', label: '简历项目' },
        { id: 'business', label: '认真创业' }
      ]
    },
    {
      id: 'q_solo',
      type: 'single_choice',
      text: '是独立开发吗？',
      options: [
        { id: 'yes', label: '是，自己一个人' },
        { id: 'team', label: '有小团队' },
        { id: 'partners', label: '有合伙人' }
      ]
    }
  ];
}

function buildUserProfile(answers: Record<string, string | string[]>): Partial<any> {
  const profile: Partial<any> = {};
  const skill = answers.q_skill;
  if (skill) profile.skillLevel = Array.isArray(skill) ? skill[0] : skill;
  const time = answers.q_time;
  if (time) profile.timeBudget = Array.isArray(time) ? time[0] : time;
  const motivation = answers.q_motivation;
  if (motivation) profile.motivation = Array.isArray(motivation) ? motivation : [motivation];
  const solo = answers.q_solo;
  if (solo !== undefined) profile.isSolo = solo === 'yes' || solo === 'true' || String(solo) === 'true';
  return Object.keys(profile).length > 0 ? profile : ({} as Partial<any>);
}

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

async function executePhase(
  session: DiscoverySession,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  onEvent?.({ type: 'phase_start', phase: session.currentPhase });

  let updatedSession = { ...session };
  const phaseOutput: PhaseOutput = { analysis: '分析完成' };

  switch (session.currentPhase) {
    case 'idea_deconstruction': {
      const questions = getFixedQuestions();
      updatedSession = setUnresolvedQuestions(updatedSession, questions);
      phaseOutput.questions = questions;
      phaseOutput.analysis = '好的，让我先了解一下你的背景信息。';
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
        const defaultMarket: MarketReality = {
          whyCrowded: '这个方向有一定的市场需求',
          giants: ['成熟的竞品'],
          whyWontMigrate: '用户已经有习惯的工具',
          nicheOpportunities: ['垂直场景'],
          avoidAreas: ['与大公司直接竞争']
        };
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
      // 设置确认问题，让用户继续
      const question: DiscoveryQuestion = { 
        id: 'confirm_reality', 
        type: 'confirmation', 
        text: '了解了市场情况，继续分析吗？' 
      };
      updatedSession = setUnresolvedQuestions(updatedSession, [question]);
      phaseOutput.questions = [question];
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
        const defaultDiff: Differentiation = {
          entryPoint: '从一个小场景切入',
          easiestUserGroup: '有特定需求的用户',
          minimalDifferentiation: '专注解决一个具体问题',
          whyBigPlayersWontDoIt: '这不是他们的核心业务'
        };
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
      const diffQuestion: DiscoveryQuestion = { 
        id: 'confirm_differentiation', 
        type: 'confirmation', 
        text: '你觉得这个切入点站得住脚吗？' 
      };
      updatedSession = setUnresolvedQuestions(updatedSession, [diffQuestion]);
      phaseOutput.questions = [diffQuestion];
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
        const defaultMVP: MVPShrink = {
          mustHave: ['核心功能1', '核心功能2', '核心功能3'],
          mustNotDo: ['社交功能', '云同步', '高级配置'],
          fastestValidation: '先做个简单的Landing Page',
          validationSteps: ['步骤1', '步骤2', '步骤3']
        };
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
      const mvpQuestion: DiscoveryQuestion = { 
        id: 'confirm_mvp', 
        type: 'confirmation', 
        text: '你觉得这个MVP范围合理吗？' 
      };
      updatedSession = setUnresolvedQuestions(updatedSession, [mvpQuestion]);
      phaseOutput.questions = [mvpQuestion];
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
        const defaultDirs: ProductDirection[] = [
          { id: 'd1', name: '简洁实用版', whyFits: '专注核心功能', techFeasibility: '技术可行', riskLevel: '低', competition: '中等', estimateCycle: '2-4周' },
          { id: 'd2', name: 'AI增强版', whyFits: '增加AI能力', techFeasibility: '有现成方案', riskLevel: '中', competition: '差异化', estimateCycle: '4-6周' },
          { id: 'd3', name: '垂直场景版', whyFits: '聚焦特定人群', techFeasibility: '实现不难', riskLevel: '中', competition: '较少', estimateCycle: '3-5周' }
        ];
        (updatedSession.collectedFacts as Record<string, unknown>).possibleDirections = defaultDirs;
        (phaseOutput as Record<string, unknown>).directions = defaultDirs;
      }
      let directions: ProductDirection[] = [];
      if (llmResponse) {
        directions = llmResponse.directions as ProductDirection[];
        if (!directions || !Array.isArray(directions) || directions.length === 0) {
          directions = [
            { id: 'd1', name: '简洁实用版', whyFits: '专注核心功能', techFeasibility: '技术可行', riskLevel: '低', competition: '中等', estimateCycle: '2-4周' }
          ];
        }
        (updatedSession.collectedFacts as Record<string, unknown>).possibleDirections = directions;
        (phaseOutput as Record<string, unknown>).directions = directions;
        phaseOutput.analysis = llmResponse.analysis as string || '方向分析完成';
      } else {
        directions = [
          { id: 'd1', name: '简洁实用版', whyFits: '专注核心功能', techFeasibility: '技术可行', riskLevel: '低', competition: '中等', estimateCycle: '2-4周' }
        ];
        (updatedSession.collectedFacts as Record<string, unknown>).possibleDirections = directions;
        (phaseOutput as Record<string, unknown>).directions = directions;
      }
      const dirQuestion: DiscoveryQuestion = { 
        id: 'pick_direction', 
        type: 'single_choice', 
        text: '你对哪个方向最感兴趣？', 
        options: directions.map(d => ({ id: d.id, label: d.name, description: d.whyFits })) 
      };
      updatedSession = setUnresolvedQuestions(updatedSession, [dirQuestion]);
      phaseOutput.questions = [dirQuestion];
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
        const defaultReport = {
          title: '方向建议报告',
          worthDoing: '值得小规模验证',
          reason: '这个方向有实际需求',
          whereToStart: '从最小可行验证开始',
          minimalValidation: '先做简单的展示页',
          summary: '建议从小开始',
          risks: '注意用户获取成本'
        };
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
      // 最终阶段，没有问题
      updatedSession = setUnresolvedQuestions(updatedSession, []);
      break;
    }
  }

  onEvent?.({ type: 'phase_analysis', phase: session.currentPhase, data: { ...phaseOutput } });
  updatedSession = advancePhase(updatedSession, phaseOutput);
  onEvent?.({ type: 'phase_complete', phase: session.currentPhase });
  // 发送当前session状态
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
  const profileUpdate = buildUserProfile(answers);
  if (profileUpdate && Object.keys(profileUpdate).length > 0) {
    facts.userProfile = {
      ...session.collectedFacts.userProfile,
      ...profileUpdate,
    };
  }
  const directionAnswer = answers.pick_direction || answers.selected_direction;
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
  // 清除所有已回答的问题
  updatedSession.unresolvedQuestions = [];
  return updatedSession;
}

export async function startDiscovery(
  idea: string,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  let session = createSession(idea);
  session = await executePhase(session, onEvent);
  return session;
}

export async function continueDiscovery(
  session: DiscoverySession,
  answers: Record<string, string | string[]>,
  onEvent?: (event: any) => void
): Promise<DiscoverySession> {
  let updatedSession = handleUserAnswers(session, answers);
  // 只要没有问题了就继续下一个阶段
  if (updatedSession.unresolvedQuestions.length === 0 && updatedSession.currentPhase !== 'complete') {
    updatedSession = await executePhase(updatedSession, onEvent);
  }
  return updatedSession;
}
