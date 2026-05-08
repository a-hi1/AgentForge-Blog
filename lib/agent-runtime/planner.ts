import { getAgentDefaultTask } from './prompts';
import { analyzeDomain, buildDomainContext } from './domainAnalyzer';

interface ExecutionStep {
  step: number;
  agent: string;
  task: string;
  output: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

interface ExecutionPlan {
  steps: ExecutionStep[];
  memoryInfluenced: boolean;
  adaptationReasons: string[];
}

interface MemoryRecord {
  id: string;
  execution_id: string;
  prompt: string;
  summary: string;
  lessons: any;
  tags: string[];
  importance_score: number;
  created_at: string;
}

function classifyTask(prompt: string): string {
  const lower = prompt.toLowerCase();

  const optimizeKeywords = ['优化', '重构', 'refactor', '性能', '改善', '提速', '升级', '改进'];
  if (optimizeKeywords.some(k => lower.includes(k))) {
    return 'optimize';
  }

  const debugKeywords = ['排查', '修复', 'fix', 'debug', 'bug', '报错', '异常', '故障', '诊断', '问题定位'];
  if (debugKeywords.some(k => lower.includes(k))) {
    return 'debug';
  }

  return 'build';
}

function generateDynamicPlan(prompt: string, domainContext: string): ExecutionStep[] {
  const taskType = classifyTask(prompt);

  switch (taskType) {
    case 'optimize':
      return [
        { step: 1, agent: '诊断 Agent', task: `诊断当前系统的性能瓶颈和架构问题：${prompt.slice(0, 60)}`, output: '', status: 'pending' },
        { step: 2, agent: '架构优化 Agent', task: `设计优化方案，制定重构策略和技术选型`, output: '', status: 'pending' },
        { step: 3, agent: '重构 Agent', task: `实施代码重构和性能优化，输出优化后的完整代码`, output: '', status: 'pending' },
        { step: 4, agent: '验证 Agent', task: `验证优化效果，确保功能不变且性能提升`, output: '', status: 'pending' },
      ];

    case 'debug':
      return [
        { step: 1, agent: 'Debug Agent', task: `分析问题现象，收集错误信息和日志：${prompt.slice(0, 60)}`, output: '', status: 'pending' },
        { step: 2, agent: 'Root Cause Agent', task: `深入分析根因，定位问题源头`, output: '', status: 'pending' },
        { step: 3, agent: '实现 Agent', task: `实施修复方案，输出修复代码`, output: '', status: 'pending' },
        { step: 4, agent: 'Regression Agent', task: `回归测试，确保修复不引入新问题`, output: '', status: 'pending' },
      ];

    case 'build':
    default:
      return [
        { step: 1, agent: '产品分析 Agent', task: `分析业务需求，拆解功能模块${domainContext ? '，结合领域知识' : ''}：${prompt.slice(0, 60)}`, output: '', status: 'pending' },
        { step: 2, agent: '架构设计 Agent', task: `设计系统架构，输出数据模型和技术方案`, output: '', status: 'pending' },
        { step: 3, agent: '实现 Agent', task: `输出可运行的完整工程代码`, output: '', status: 'pending' },
        { step: 4, agent: '测试 Agent', task: `设计测试方案，验证功能正确性`, output: '', status: 'pending' },
        { step: 5, agent: '部署上线 Agent', task: `制定部署方案和发布流程`, output: '', status: 'pending' },
      ];
  }
}

export async function generatePlan(
  prompt: string,
  memories: { memories: MemoryRecord[] }
): Promise<ExecutionPlan> {
  const domainAnalysis = analyzeDomain(prompt);
  const domainContext = buildDomainContext(domainAnalysis);
  const steps = generateDynamicPlan(prompt, domainContext);

  let memoryInfluenced = false;
  const adaptationReasons: string[] = [];

  if (memories.memories.length > 0) {
    const relevantMemories = memories.memories.filter(m => {
      const lessons = m.lessons;
      if (lessons?.failures && lessons.failures.length > 0) {
        return true;
      }
      return false;
    });

    if (relevantMemories.length > 0) {
      memoryInfluenced = true;
      adaptationReasons.push(`基于 ${relevantMemories.length} 条历史经验调整执行策略`);

      const hasFailure = relevantMemories.some(m => m.lessons?.failures?.length > 0);
      if (hasFailure) {
        const lastStep = steps[steps.length - 1];
        steps.splice(steps.length - 1, 0, {
          step: steps.length,
          agent: '调试诊断 Agent',
          task: '基于历史失败案例，审查实现方案中的潜在问题',
          output: '',
          status: 'pending',
        });
        adaptationReasons.push('因历史执行中出现过问题，已插入额外的代码审查步骤');
      }
    }
  }

  if (domainContext && steps.length > 0) {
    steps[0].task += `\n\n${domainContext}`;
    adaptationReasons.push(`已识别业务领域为「${domainAnalysis.domain}」，将结合领域知识进行分析`);
  }

  steps.forEach((step, i) => {
    step.step = i + 1;
  });

  return {
    steps,
    memoryInfluenced,
    adaptationReasons,
  };
}
