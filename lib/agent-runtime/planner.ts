import { plannerPrompt } from './prompts';
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
    // First get memories if not provided
    const retrievedMemories = memories || await MemoryManager.retrieveRelevantMemories(userPrompt);
    
    // Analyze memory for adaptations
    const adaptations: string[] = [];
    const adaptationReason: string[] = [];
    let memoryInfluenced = false;
    let memoryInfluenceLevel = 0;
    
    // ============================================
    // ADAPTATION LOGIC - REAL SEQUENCE CHANGES
    // ============================================
    
    // Case 1: Check for deployment failures
    const deploymentFailures = retrievedMemories.filter(m => 
      m.memory.lessons?.failures?.some((f: string) => 
        f.toLowerCase().includes('deploy') || 
        f.toLowerCase().includes('deployment')
      )
    );
    
    if (deploymentFailures.length > 1) {
      adaptations.push('EXTRA_DEBUG_PRE_DEPLOY');
      adaptationReason.push(`Inserted extra Debug Agent due to ${deploymentFailures.length} historical deployment failures`);
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.4;
    }
    
    // Case 2: Check for architecture success
    const architectureSuccesses = retrievedMemories.filter(m => 
      m.memory.lessons?.successes?.some((s: string) => 
        s.toLowerCase().includes('architect') || 
        s.toLowerCase().includes('architecture')
      )
    );
    
    if (architectureSuccesses.length > 0) {
      adaptations.push('REDUCED_ARCHITECT');
      adaptationReason.push('Reduced architecture analysis length due to successful similar tasks');
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.2;
    }
    
    // Case 3: Check for coding issues
    const codingIssues = retrievedMemories.filter(m => 
      m.memory.lessons?.failures?.some((f: string) => 
        f.toLowerCase().includes('code') || 
        f.toLowerCase().includes('coding')
      )
    );
    
    if (codingIssues.length > 0) {
      adaptations.push('EXTRA_CODING_REVIEW');
      adaptationReason.push('Added second coding review step due to historical coding issues');
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.3;
    }
    
    // Case 4: Check for optimization recommendations
    const hasOptimizations = retrievedMemories.some(m => 
      m.memory.lessons?.optimizations && m.memory.lessons.optimizations.length > 0
    );
    
    if (hasOptimizations) {
      adaptations.push('ADD_OPTIMIZATION_AGENT');
      adaptationReason.push('Added Optimization Agent based on historical optimization recommendations');
      memoryInfluenced = true;
      memoryInfluenceLevel += 0.25;
    }
    
    // Cap influence level
    memoryInfluenceLevel = Math.min(memoryInfluenceLevel, 1);
    
    // ============================================
    // REAL DYNAMIC PLAN GENERATION
    // ============================================
    
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
  
  // REAL AGENT SEQUENCE MUTATIONS
  
  // Case 1: Extra Debug before Deploy
  if (adaptations.includes('EXTRA_DEBUG_PRE_DEPLOY')) {
    const deployIndex = steps.findIndex(s => s.agent === 'Deploy Agent');
    if (deployIndex !== -1) {
      steps.splice(deployIndex, 0, {
        agent: 'Debug Agent',
        task: 'Pre-deployment verification and validation'
      });
    }
  }
  
  // Case 2: Reduced architect task
  if (adaptations.includes('REDUCED_ARCHITECT')) {
    const architectStep = steps.find(s => s.agent === 'Architect Agent');
    if (architectStep) {
      architectStep.task = 'Quick architecture review based on prior successful designs';
    }
  }
  
  // Case 3: Extra coding review
  if (adaptations.includes('EXTRA_CODING_REVIEW')) {
    const codingIndex = steps.findIndex(s => s.agent === 'Coding Agent');
    if (codingIndex !== -1) {
      steps.splice(codingIndex + 1, 0, {
        agent: 'Debug Agent',
        task: 'Code quality review and validation'
      });
    }
  }
  
  // Case 4: Add Optimization Agent
  if (adaptations.includes('ADD_OPTIMIZATION_AGENT')) {
    const debugIndex = steps.findIndex(s => s.agent === 'Debug Agent');
    if (debugIndex !== -1) {
      steps.splice(debugIndex + 1, 0, {
        agent: 'Optimization Agent',
        task: 'Apply historical optimization recommendations'
      });
    }
  }
  
  return steps;
}

function getDefaultPlan(userPrompt: string): PlanStep[] {
  return [
    { agent: 'Architect Agent', task: 'Analyze requirements and design architecture' },
    { agent: 'Coding Agent', task: 'Generate code structure and implementations' },
    { agent: 'Debug Agent', task: 'Review and suggest improvements' },
    { agent: 'Deploy Agent', task: 'Plan deployment strategy' },
  ];
}

export default createPlan;
