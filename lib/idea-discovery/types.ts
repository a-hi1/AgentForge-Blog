// 方向探索核心类型定义

// 探索阶段
export type DiscoveryPhase =
  | 'initial'
  | 'idea_deconstruction'
  | 'reality_assessment'
  | 'differentiation_analysis'
  | 'mvp_shrink'
  | 'validation_path'
  | 'final_confirmation'
  | 'complete';

// 探索问题类型
export type QuestionType =
  | 'single_choice'
  | 'multiple_choice'
  | 'text'
  | 'confirmation';

// 问题选项
export interface QuestionOption {
  id: string;
  label: string;
  description?: string;
}

// 探索问题
export interface DiscoveryQuestion {
  id: string;
  type: QuestionType;
  text: string;
  options?: QuestionOption[];
  placeholder?: string;
  required?: boolean;
  context?: string;
}

// 用户画像
export interface UserProfile {
  motivation: string[];
  skillLevel: 'beginner' | 'intermediate' | 'fullstack' | 'expert';
  timeBudget: 'weekend' | '7days' | '3months' | 'longterm';
  hasDesignSkills: boolean;
  hasOperationSkills: boolean;
}

// 动机类型
export type Motivation =
  | 'practice'
  | 'resume'
  | 'profit'
  | 'personal_use'
  | 'side_project'
  | 'learn_ai'
  | 'saas'
  | 'other';

// 产品方向
export interface ProductDirection {
  id: string;
  name: string;
  description: string;
  targetUser: string;
  valueProposition: string;
}

// 市场分析
export interface MarketAssessment {
  whyCrowded: string;
  whoAreGiants: string;
  whyWontMigrate: string;
  opportunityDirections: string[];
  avoidDirections: string[];
}

// 差异化分析
export interface DifferentiationAnalysis {
  whyUse: string;
  whyLeave: string;
  whyNotReplacedByNotion: string;
  whyNotReplacedByChatGPT: string;
  minimalDifferentiation: string;
}

// MVP 收缩
export interface MVPShrink {
  mustHave: string[];
  mustNotDo: string[];
  firstVersionFeatures: string[];
}

// 验证路径
export interface ValidationPath {
  fastestValidation: string;
  minimalUserGroup: string;
  howToKnowFailed: string;
  requiredFeedbackCount: number;
  whenToStop: string;
  steps: string[];
}

// 收集的事实
export interface CollectedFacts {
  originalIdea: string;
  userProfile?: UserProfile;
  selectedDirection?: ProductDirection;
  marketAssessment?: MarketAssessment;
  differentiation?: DifferentiationAnalysis;
  mvp?: MVPShrink;
  validationPath?: ValidationPath;
  [key: string]: unknown;
}

// 确认的决策
export interface ConfirmedDecisions {
  directionId?: string;
  mvpScope?: string[];
  validationApproved?: boolean;
  [key: string]: unknown;
}

// 阶段输出
export interface PhaseOutput {
  analysis: string;
  questions?: DiscoveryQuestion[];
  summary?: string;
  [key: string]: unknown;
}

// SSE 事件类型
export type SSEEventType =
  | 'phase_start'
  | 'phase_analysis'
  | 'phase_complete'
  | 'question'
  | 'error'
  | 'complete';

// SSE 事件数据
export interface SSEEvent {
  type: SSEEventType;
  phase?: DiscoveryPhase;
  data?: PhaseOutput;
  message?: string;
}

// 探索会话状态
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

// 最终方向建议报告
export interface DirectionRecommendationReport {
  title: string;
  worthDoing: string;
  worthDoingReason: string;
  whereToStart: string;
  minimalValidation: string;
  summary: string;
}

// 方向探索请求
export interface DiscoveryRequest {
  idea: string;
  sessionId?: string;
  answers?: Record<string, string | string[]>;
}

// 方向探索响应（非流式）
export interface DiscoveryResponse {
  session: DiscoverySession;
  report?: DirectionRecommendationReport;
}
