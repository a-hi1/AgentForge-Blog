import { getAgentPrompt } from './prompts';
import MemoryManager, { RetrievedMemory } from './memoryManager';

export interface PlanStep {
  agent: string;
  task: string;
}

export interface MemoryAwarePlan {
  steps: PlanStep[];
  memory_influenced: boolean;
  adaptations: string[];
  adaptation_reason: string[];
  memory_influence_level: number;
  retrieved_memories?: RetrievedMemory[];
}

export async function createPlan(
  userPrompt: string, 
  memories?: RetrievedMemory[]
): Promise<MemoryAwarePlan> {
  try {
    const retrievedMemories = memories || await MemoryManager.retrieveRelevantMemories(userPrompt);
    
    const adaptations: string[] = [];
    const adaptationReason: string[] = [];
    let memoryInfluenced = false;
    let memoryInfluenceLevel = 0;
    
    const deploymentFailures = retrievedMemories.filter(m => 
      m.memory.lessons?.failures?.some((f: string) => 
        f.toLowerCase().includes('deploy') || 
        f.toLowerCase().includes('deployment')
      )
    );
    
    if (deploymentFailures.length > 1) {
      adaptations.push('EXTRA_DEBUG_PRE_DEPLOY');
      adaptationReason.push(`因历史出现 ${deploymentFailures.length} 次部署失败，已插入额外调试审查步骤`);
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.4;
    }
    
    const architectureSuccesses = retrievedMemories.filter(m => 
      m.memory.lessons?.successes?.some((s: string) => 
        s.toLowerCase().includes('architect') || 
        s.toLowerCase().includes('architecture')
      )
    );
    
    if (architectureSuccesses.length > 0) {
      adaptations.push('REDUCED_ARCHITECT');
      adaptationReason.push('因历史相似任务架构设计成功，已精简架构分析环节');
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.2;
    }
    
    const codingIssues = retrievedMemories.filter(m => 
      m.memory.lessons?.failures?.some((f: string) => 
        f.toLowerCase().includes('code') || 
        f.toLowerCase().includes('coding')
      )
    );
    
    if (codingIssues.length > 0) {
      adaptations.push('EXTRA_CODING_REVIEW');
      adaptationReason.push('因历史代码质量问题，已增加代码审查步骤');
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.3;
    }
    
    const hasOptimizations = retrievedMemories.some(m => 
      m.memory.lessons?.optimizations && m.memory.lessons.optimizations.length > 0
    );
    
    if (hasOptimizations) {
      adaptations.push('ADD_OPTIMIZATION_AGENT');
      adaptationReason.push('基于历史优化建议，已添加性能优化代理');
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.25;
    }
    
    memoryInfluenceLevel = Math.min(memoryInfluenceLevel, 1);
    
    let steps = generateAdaptivePlan(userPrompt, adaptations);
    
    return {
      steps,
      memory_influenced: memoryInfluenced,
      adaptations,
      adaptation_reason: adaptationReason,
      memory_influence_level: memoryInfluenceLevel,
      retrieved_memories: retrievedMemories
    };
  } catch (error) {
    console.error('Planner error:', error);
    return {
      steps: getDefaultPlan(userPrompt),
      memory_influenced: false,
      adaptations: [],
      adaptation_reason: [],
      memory_influence_level: 0
    };
  }
}

function generateAdaptivePlan(userPrompt: string, adaptations: string[]): PlanStep[] {
  let steps: PlanStep[] = [...getDefaultPlan(userPrompt)];
  
  if (adaptations.includes('EXTRA_DEBUG_PRE_DEPLOY')) {
    const deployIndex = steps.findIndex(s => s.agent === 'Deploy Agent');
    if (deployIndex !== -1) {
      steps.splice(deployIndex, 0, {
        agent: 'Debug Agent',
        task: '部署前验证与质量检查'
      });
    }
  }
  
  if (adaptations.includes('REDUCED_ARCHITECT')) {
    const architectStep = steps.find(s => s.agent === 'Architect Agent');
    if (architectStep) {
      architectStep.task = '基于历史成功方案快速审查架构设计';
    }
  }
  
  if (adaptations.includes('EXTRA_CODING_REVIEW')) {
    const codingIndex = steps.findIndex(s => s.agent === 'Coding Agent');
    if (codingIndex !== -1) {
      steps.splice(codingIndex + 1, 0, {
        agent: 'Debug Agent',
        task: '代码质量审查与规范验证'
      });
    }
  }
  
  if (adaptations.includes('ADD_OPTIMIZATION_AGENT')) {
    const debugIndex = steps.findIndex(s => s.agent === 'Debug Agent');
    if (debugIndex !== -1) {
      steps.splice(debugIndex + 1, 0, {
        agent: 'Optimization Agent',
        task: '应用历史优化建议进行性能优化'
      });
    }
  }
  
  return steps;
}

function getDefaultPlan(userPrompt: string): PlanStep[] {
  return [
    { agent: 'Architect Agent', task: '分析业务需求并生成系统架构设计' },
    { agent: 'Coding Agent', task: '实现核心功能模块与代码结构' },
    { agent: 'Debug Agent', task: '审查实现质量并验证工程规范' },
    { agent: 'Deploy Agent', task: '制定部署方案并完成最终优化' },
  ];
}

export default createPlan;
