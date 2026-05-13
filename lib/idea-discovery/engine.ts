import { callLLMWithJSON } from '@/lib/prompt-orchestrator/llm';
import { safeParseLLMJson } from '@/lib/utils/safeJson';
import {
  DiscoverySession,
  CollectedFacts,
  ProductDirection,
  UserProfile,
  DiscoveryQuestion,
  MarketReality,
  Differentiation,
  MVPShrink,
  DirectionReport,
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

function buildUserProfile(answers: Record<string, string | string[]>): Partial<UserProfile> {
  const profile: Partial<UserProfile> = {};

  const motivation = answers.q_motivation || answers.motivation;
  if (motivation) {
    profile.motivation = Array.isArray(motivation) ? motivation : [motivation];
  }

  const skill = answers.q_skill || answers.skill_level;
  if (skill) profile.skillLevel = Array.isArray(skill) ? skill[0] : skill;

  const time = answers.q_time || answers.time_budget;
  if (time) profile.timeBudget = Array.isArray(time) ? time[0] : time;

  const solo = answers.q_solo;
  if (solo !== undefined) profile.isSolo = solo === 'yes' || solo === 'true' || String(solo) === 'true';

  const platform = answers.q_platform;
  if (platform) profile.platform = Array.isArray(platform) ? platform[0] : platform;

  const design = answers.q_design;
  if (design !== undefined) profile.hasDesignSkills = design === 'yes' || design === 'true' || String(design) === 'true';

  const ops = answers.q_ops;
  if (ops !== undefined) profile.hasOperationSkills = ops === 'yes' || ops === 'true' || String(ops) === 'true';

  return Object.keys(profile).length > 0 ? profile : ({} as Partial<UserProfile>);
}

async function handlePhaseResponse(
  session: DiscoverySession,
  phase: string,
  llmResponse: Record<string, unknown>
): Promise<DiscoverySession> {
  let updatedSession = { ...session };
  const analysis = (llmResponse.analysis as string) || '';
  const phaseOutput: PhaseOutput = { analysis };

  switch (phase) {
    case 'idea_deconstruction': {
      const questions = llmResponse.questions as DiscoveryQuestion[] | undefined;
      if (questions) {
        updatedSession = setUnresolvedQuestions(updatedSession, questions);
        phaseOutput.questions = questions;
      }
      break;
    }
    case 'reality_assessment': {
      const marketReality = llmResponse.marketReality as MarketReality | undefined;
      if (marketReality) {
        updatedSession = addCollectedFacts(updatedSession, { marketReality });
        (phaseOutput as Record<string, unknown>).marketReality = marketReality;
      }
      break;
    }
    case 'differentiation_analysis': {
      const differentiation = llmResponse.differentiation as Differentiation | undefined;
      if (differentiation) {
        updatedSession = addCollectedFacts(updatedSession, { differentiation });
        (phaseOutput as Record<string, unknown>).differentiation = differentiation;
      }
      const question = llmResponse.question as DiscoveryQuestion | undefined;
      if (question) {
        updatedSession = setUnresolvedQuestions(updatedSession, [question]);
        phaseOutput.questions = [question];
      }
      break;
    }
    case 'mvp_shrink': {
      const mvp = llmResponse.mvp as MVPShrink | undefined;
      if (mvp) {
        updatedSession = addCollectedFacts(updatedSession, { mvp });
        (phaseOutput as Record<string, unknown>).mvp = mvp;
      }
      const question = llmResponse.question as DiscoveryQuestion | undefined;
      if (question) {
        updatedSession = setUnresolvedQuestions(updatedSession, [question]);
        phaseOutput.questions = [question];
      }
      break;
    }
    case 'validation_path': {
      const directions = llmResponse.directions as ProductDirection[] | undefined;
      if (directions) {
        (updatedSession.collectedFacts as Record<string, unknown>).possibleDirections = directions;
        (phaseOutput as Record<string, unknown>).directions = directions;
      }
      const question = llmResponse.question as DiscoveryQuestion | undefined;
      if (question && directions) {
        question.options = directions.map((d) => ({ id: d.id, label: d.name, description: d.whyFits }));
        updatedSession = setUnresolvedQuestions(updatedSession, [question]);
        phaseOutput.questions = [question];
      }
      break;
    }
    case 'final_confirmation': {
      const report = llmResponse.report as DirectionReport | undefined;
      if (report) {
        updatedSession = addCollectedFacts(updatedSession, { finalReport: report });
        (phaseOutput as Record<string, unknown>).report = report;
      }
      updatedSession = advancePhase(updatedSession, phaseOutput);
      break;
    }
  }

  if (phase !== 'final_confirmation') {
    updatedSession = advancePhase(updatedSession, phaseOutput);
  }

  return updatedSession;
}

export async function executePhase(
  session: DiscoverySession,
  onEvent?: (event: {
    type: 'phase_start' | 'phase_analysis' | 'phase_complete' | 'phase_fallback';
    phase: string;
    data?: unknown;
  }) => void
): Promise<DiscoverySession> {
  const { system, user } = getPhasePrompt(session.currentPhase, session.collectedFacts);

  onEvent?.({ type: 'phase_start', phase: session.currentPhase });

  try {
    const llmResponse = await callLLMWithJSON<Record<string, unknown>>([
      { role: 'system', content: system },
      { role: 'user', content: user },
    ]);

    onEvent?.({ type: 'phase_analysis', phase: session.currentPhase, data: llmResponse });

    const updatedSession = await handlePhaseResponse(session, session.currentPhase, llmResponse);

    onEvent?.({ type: 'phase_complete', phase: session.currentPhase });

    return updatedSession;
  } catch (error) {
    console.error(`Phase ${session.currentPhase} error:`, error);

    onEvent?.({ type: 'phase_fallback', phase: session.currentPhase });

    const fallbackOutput: PhaseOutput = {
      analysis: '分析过程中遇到问题，请重试或跳过此阶段。',
    };

    return advancePhase(session, fallbackOutput);
  }
}

export function handleUserAnswers(
  session: DiscoverySession,
  answers: Record<string, string | string[]>
): DiscoverySession {
  let updatedSession = { ...session };
  const facts: Partial<CollectedFacts> = {};

  const profileUpdate = buildUserProfile(answers);
  if (profileUpdate) {
    facts.userProfile = {
      ...session.collectedFacts.userProfile,
      ...profileUpdate,
    } as UserProfile;
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

  const confirm = answers.confirm_differentiation || answers.confirm_mvp;
  if (confirm !== undefined) {
    updatedSession = addConfirmedDecisions(updatedSession, {
      confirmed: confirm === 'yes' || confirm === 'true' || String(confirm) === 'true',
    });
  }

  if (Object.keys(facts).length > 0) {
    updatedSession = addCollectedFacts(updatedSession, facts);
  }

  const answeredIds = Object.keys(answers);
  updatedSession.unresolvedQuestions = updatedSession.unresolvedQuestions.filter(
    (q) => !answeredIds.includes(q.id)
  );

  return updatedSession;
}

export async function startDiscovery(
  idea: string,
  onEvent?: (event: unknown) => void
): Promise<DiscoverySession> {
  let session = createSession(idea);
  session = await executePhase(session, onEvent as never);
  return session;
}

export async function continueDiscovery(
  session: DiscoverySession,
  answers: Record<string, string | string[]>,
  onEvent?: (event: unknown) => void
): Promise<DiscoverySession> {
  let updatedSession = handleUserAnswers(session, answers);

  if (canAdvancePhase(updatedSession) && updatedSession.currentPhase !== 'complete') {
    updatedSession = await executePhase(updatedSession, onEvent as never);
  }

  return updatedSession;
}
