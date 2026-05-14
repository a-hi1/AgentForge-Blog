export type DiscoveryPhase =
  | 'initial'
  | 'idea_deconstruction'
  | 'reality_assessment'
  | 'differentiation_analysis'
  | 'mvp_shrink'
  | 'validation_path'
  | 'final_confirmation'
  | 'complete';

export type QuestionType = 'single_choice' | 'multiple_choice' | 'text' | 'confirmation';

export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

export interface DiscoveryQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuestionOption[];
  placeholder?: string;
  required?: boolean;
  context?: string;
}

export interface IdeaDeconstruction {
  analysis: string;
  coreInsights: string[];
  questions?: DiscoveryQuestion[];
}

export interface ProductDirection {
  id: string;
  name: string;
  whyFits: string;
  techFeasibility: string;
  riskLevel: string;
  competition: string;
  estimateCycle: string;
}

export interface MarketReality {
  whyCrowded: string;
  giants: string[];
  whyWontMigrate: string;
  nicheOpportunities: string[];
  avoidAreas: string[];
}

export interface Differentiation {
  entryPoint: string;
  easiestUserGroup: string;
  minimalDifferentiation: string;
  whyBigPlayersWontDoIt: string;
}

export interface MVPShrink {
  mustHave: string[];
  mustNotDo: string[];
  fastestValidation: string;
  validationSteps: string[];
}

export interface CollectedFacts {
  originalIdea: string;
  ideaDeconstruction?: IdeaDeconstruction;
  selectedDirection?: ProductDirection;
  marketReality?: MarketReality;
  differentiation?: Differentiation;
  mvp?: MVPShrink;
  finalReport?: DirectionReport;
  [key: string]: unknown;
}

export interface ConfirmedDecisions {
  directionId?: string;
  [key: string]: unknown;
}

export interface PhaseOutput {
  analysis: string;
  questions?: DiscoveryQuestion[];
  [key: string]: unknown;
}

export interface DirectionReport {
  title: string;
  worthDoing: string;
  reason: string;
  whereToStart: string;
  minimalValidation: string;
  summary: string;
  risks?: string;
}

export interface DiscoverySession {
  id: string;
  currentPhase: DiscoveryPhase;
  collectedFacts: CollectedFacts;
  unresolvedQuestions: DiscoveryQuestion[];
  confirmedDecisions: ConfirmedDecisions;
  phaseHistory: Array<{
    phase: DiscoveryPhase;
    output: PhaseOutput;
    timestamp: number;
  }>;
  createdAt: number;
  updatedAt: number;
}
