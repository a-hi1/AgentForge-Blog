import { supabaseServer, isSupabaseConfigured } from '../supabase/client';
import { createClient } from '@supabase/supabase-js';

// ============================================
// TYPES
// ============================================

export interface ExecutionLesson {
  successes: string[];
  failures: string[];
  optimizations: string[];
}

export interface AgentMemory {
  id: string;
  execution_id: string;
  prompt: string;
  summary: string;
  lessons: ExecutionLesson;
  tags: string[];
  memory_type: string;
  importance_score: number;
  created_at: string;
}

export interface MemoryRelation {
  id: string;
  source_execution_id: string;
  target_execution_id: string;
  relevance_score: number;
  relation_type: string;
}

export interface RetrievedMemory {
  memory: AgentMemory;
  relevance_score: number;
  relevance_reason: string;
}

export interface MemoryInfluence {
  memories_used: RetrievedMemory[];
  planner_adaptation: {
    memory_influenced: boolean;
    adaptations: string[];
  };
  lessons_applied: string[];
}

// ============================================
// CONSTANTS
// ============================================

const MAX_RETRIEVED_MEMORIES = 5;
const MAX_TOKEN_LENGTH = 1200;
const IMPORTANCE_THRESHOLD = 0.3;

// ============================================
// MEMORY MANAGER
// ============================================

export class MemoryManager {
  private execution: any;

  constructor(execution?: any) {
    this.execution = execution;
  }

  // ============================================
  // TASK 1: LESSON EXTRACTION
  // ============================================

  static async extractExecutionLessons(execution: any): Promise<ExecutionLesson> {
    try {
      // First try real LLM extraction
      const llmLessons = await this.extractLessonsWithLLM(execution);
      if (llmLessons) {
        return llmLessons;
      }
    } catch (error) {
      console.warn('[Memory] LLM lesson extraction failed, falling back to rules');
    }

    // Fallback: basic extraction without LLM
    const lessons: ExecutionLesson = {
      successes: [],
      failures: [],
      optimizations: []
    };

    // Extract from execution data
    if (execution.steps) {
      for (const step of execution.steps) {
        if (step.status === 'completed') {
          if (step.agent === 'Architect Agent') {
            lessons.successes.push('Architecture design completed successfully');
          }
          if (step.agent === 'Coding Agent') {
            lessons.successes.push('Code generation completed successfully');
          }
        }
        
        // Check for issues in outputs
        if (step.output && step.output.toLowerCase().includes('error')) {
          lessons.failures.push(`Potential issue in ${step.agent}: ${step.output.slice(0, 100)}`);
        }
      }
    }

    // Default lessons if none found
    if (lessons.successes.length === 0) {
      lessons.successes.push('Execution completed without major issues');
    }

    return lessons;
  }

  private static async extractLessonsWithLLM(execution: any): Promise<ExecutionLesson | null> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
      const model = process.env.OPENAI_MODEL || 'glm-4-flash';

      if (!apiKey) {
        return null;
      }

      // Prepare execution data
      const executionData = {
        prompt: execution.prompt || '',
        steps: execution.steps || [],
        status: execution.status
      };

      const systemPrompt = `You are a senior engineering memory analyst. Analyze the execution and extract structured lessons.
Return ONLY valid JSON with no additional text. Format:
{
  "successes": ["string"],
  "failures": ["string"],
  "optimizations": ["string"]
}
Do NOT include markdown or code blocks - just raw JSON.`;

      const userPrompt = `Analyze this engineering execution and extract lessons:

Execution Data:
${JSON.stringify(executionData, null, 2)}

Return structured JSON only.`;

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        }),
      });

      if (!response.ok) {
        console.error('[Memory] LLM extraction API failed');
        return null;
      }

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (content) {
        const parsed = JSON.parse(content);
        return {
          successes: parsed.successes || [],
          failures: parsed.failures || [],
          optimizations: parsed.optimizations || []
        };
      }

      return null;
    } catch (error) {
      console.error('[Memory] LLM extraction error:', error);
      return null;
    }
  }

  // ============================================
  // TASK 2: STORE MEMORY
  // ============================================

  static async storeExecutionMemory(
    executionId: string,
    prompt: string,
    lessons: ExecutionLesson,
    summary?: string,
    tags?: string[]
  ): Promise<AgentMemory | null> {
    if (!isSupabaseConfigured()) {
      console.warn('[Memory] Supabase not configured, skipping storage');
      return null;
    }

    try {
      // Auto-generate tags
      const autoTags = tags || MemoryManager.extractTags(prompt, lessons);
      
      // Calculate importance score
      const importanceScore = MemoryManager.calculateImportance(lessons);

      const { data, error } = await supabaseServer
        .from('agent_memory')
        .insert({
          execution_id: executionId,
          prompt: prompt,
          summary: summary || MemoryManager.generateSummary(lessons),
          lessons: lessons,
          tags: autoTags,
          importance_score: importanceScore,
          memory_type: 'execution'
        })
        .select()
        .single();

      if (error) {
        console.error('[Memory] Storage error:', error);
        return null;
      }

      return data as AgentMemory;
    } catch (error) {
      console.error('[Memory] Storage failed:', error);
      return null;
    }
  }

  // ============================================
  // TASK 3: RETRIEVAL
  // ============================================

  static async retrieveRelevantMemories(newPrompt: string): Promise<RetrievedMemory[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    try {
      // Get recent memories
      const { data: memories, error } = await supabaseServer
        .from('agent_memory')
        .select('*')
        .order('importance_score', { ascending: false })
        .limit(20);

      if (error) {
        console.error('[Memory] Retrieval error:', error);
        return [];
      }

      // Calculate relevance for each
      const scored = (memories || []).map(memory => ({
        memory: memory as unknown as AgentMemory,
        relevance_score: MemoryManager.calculateRelevance(newPrompt, memory as unknown as AgentMemory),
        relevance_reason: MemoryManager.explainRelevance(newPrompt, memory as unknown as AgentMemory)
      }));

      // Sort and return top 5
      return scored
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .slice(0, MAX_RETRIEVED_MEMORIES)
        .filter(m => m.relevance_score > 0);
    } catch (error) {
      console.error('[Memory] Retrieval failed:', error);
      return [];
    }
  }

  // ============================================
  // TASK 4: RELEVANCE CALCULATION
  // ============================================

  static calculateRelevance(newPrompt: string, memory: AgentMemory): number {
    let score = 0;

    const promptLower = newPrompt.toLowerCase();
    const memoryPromptLower = memory.prompt.toLowerCase();

    // 1. Keyword overlap (40%)
    const keywords = ['build', 'design', 'deploy', 'debug', 'fix', 'saas', 'blog', 'auth', 'frontend', 'backend', 'api'];
    const overlapKeywords = keywords.filter(k => 
      promptLower.includes(k) && memoryPromptLower.includes(k)
    );
    score += (overlapKeywords.length / Math.max(keywords.length, 1)) * 0.4;

    // 2. Tag overlap (30%)
    if (memory.tags && memory.tags.length > 0) {
      const promptTags = MemoryManager.extractTags(newPrompt);
      const tagOverlap = promptTags.filter(t => memory.tags.includes(t));
      score += (tagOverlap.length / Math.max(promptTags.length, 1)) * 0.3;
    }

    // 3. Importance boost (20%)
    score += (memory.importance_score || 0.5) * 0.2;

    // 4. Recency boost (10%)
    const memoryDate = new Date(memory.created_at);
    const daysAgo = (Date.now() - memoryDate.getTime()) / (1000 * 60 * 60 * 24);
    const recencyScore = Math.max(0, 1 - (daysAgo / 30));
    score += recencyScore * 0.1;

    return Math.min(score, 1);
  }

  static explainRelevance(newPrompt: string, memory: AgentMemory): string {
    const reasons: string[] = [];
    
    const promptLower = newPrompt.toLowerCase();
    const memoryPromptLower = memory.prompt.toLowerCase();
    
    if (memory.tags) {
      const overlappingTags = memory.tags.filter(tag => 
        promptLower.includes(tag.toLowerCase())
      );
      if (overlappingTags.length > 0) {
        reasons.push(`Similar tags: ${overlappingTags.slice(0, 2).join(', ')}`);
      }
    }
    
    if (memory.importance_score > 0.7) {
      reasons.push('High importance memory');
    }
    
    return reasons.length > 0 ? reasons.join('; ') : 'Related context';
  }

  // ============================================
  // TASK 5: MEMORY RELATIONS
  // ============================================

  static async linkExecutionMemory(
    sourceExecutionId: string,
    targetExecutionId: string,
    relevanceScore: number,
    relationType: string = 'similar'
  ): Promise<MemoryRelation | null> {
    if (!isSupabaseConfigured()) return null;

    try {
      const { data, error } = await supabaseServer
        .from('memory_relations')
        .insert({
          source_execution_id: sourceExecutionId,
          target_execution_id: targetExecutionId,
          relevance_score: relevanceScore,
          relation_type: relationType
        })
        .select()
        .single();

      if (error) {
        console.error('[Memory] Linking error:', error);
        return null;
      }

      return data as MemoryRelation;
    } catch (error) {
      console.error('[Memory] Linking failed:', error);
      return null;
    }
  }

  static async getExecutionLineage(executionId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];

    try {
      const { data: relations, error } = await supabaseServer
        .from('memory_relations')
        .select('*')
        .or(`source_execution_id.eq.${executionId},target_execution_id.eq.${executionId}`)
        .order('relevance_score', { ascending: false });

      if (error) return [];

      // Build simple lineage
      const executionIds = new Set<string>();
      executionIds.add(executionId);
      
      for (const rel of relations || []) {
        if (rel.source_execution_id === executionId) {
          executionIds.add(rel.target_execution_id);
        }
        if (rel.target_execution_id === executionId) {
          executionIds.add(rel.source_execution_id);
        }
      }

      return Array.from(executionIds);
    } catch (error) {
      return [executionId];
    }
  }

  // ============================================
  // UTILITY FUNCTIONS
  // ============================================

  private static extractTags(prompt: string, lessons?: ExecutionLesson): string[] {
    const tags: string[] = [];
    const promptLower = prompt.toLowerCase();

    if (promptLower.includes('saas')) tags.push('saas');
    if (promptLower.includes('blog')) tags.push('blog');
    if (promptLower.includes('build')) tags.push('building');
    if (promptLower.includes('design')) tags.push('design');
    if (promptLower.includes('deploy')) tags.push('deployment');
    if (promptLower.includes('debug') || promptLower.includes('fix')) tags.push('debugging');
    if (promptLower.includes('auth')) tags.push('authentication');
    if (promptLower.includes('frontend')) tags.push('frontend');
    if (promptLower.includes('backend')) tags.push('backend');
    if (promptLower.includes('api')) tags.push('api');

    return tags.length > 0 ? tags : ['general'];
  }

  private static calculateImportance(lessons: ExecutionLesson): number {
    let score = 0.5;

    // Higher importance if there are valuable lessons
    if (lessons.failures.length > 0) score += 0.2;
    if (lessons.optimizations.length > 0) score += 0.15;
    if (lessons.successes.length > 1) score += 0.15;

    return Math.min(score, 1);
  }

  private static generateSummary(lessons: ExecutionLesson): string {
    const parts: string[] = [];
    
    if (lessons.successes.length > 0) {
      parts.push(`Success: ${lessons.successes[0]}`);
    }
    
    if (lessons.failures.length > 0) {
      parts.push(`Challenge: ${lessons.failures[0]}`);
    }
    
    return parts.join(' | ') || 'Execution completed';
  }

  // ============================================
  // CONTEXT INJECTION
  // ============================================

  static formatMemoryContext(memories: RetrievedMemory[]): string {
    if (memories.length === 0) {
      return '';
    }

    let context = '\n\n=== RELEVANT ENGINEERING MEMORY ===\n';
    
    context += 'SIMILAR TASKS:\n';
    memories.forEach((m, i) => {
      context += `${i + 1}. ${m.memory.prompt.slice(0, 100)}...\n`;
    });

    context += '\nLESSONS:\n';
    const allLessons: string[] = [];
    memories.forEach(m => {
      if (m.memory.lessons?.successes) allLessons.push(...m.memory.lessons.successes);
      if (m.memory.lessons?.optimizations) allLessons.push(...m.memory.lessons.optimizations);
    });
    
    const uniqueLessons = Array.from(new Set(allLessons)).slice(0, 5);
    uniqueLessons.forEach(lesson => {
      context += `- ${lesson}\n`;
    });

    context += '\nAPPLY THESE INSIGHTS\n';

    // Truncate to max length
    if (context.length > MAX_TOKEN_LENGTH) {
      context = context.slice(0, MAX_TOKEN_LENGTH - 100) + '\n...[truncated]\n';
    }

    return context;
  }

  // ============================================
  // MEMORY METRICS
  // ============================================

  static async getMemoryMetrics(): Promise<{
    total_memories: number;
    recall_count: number;
    reuse_success_rate: number;
    planner_adaptation_rate: number;
  }> {
    if (!isSupabaseConfigured()) {
      return {
        total_memories: 0,
        recall_count: 0,
        reuse_success_rate: 0,
        planner_adaptation_rate: 0
      };
    }

    try {
      const { count } = await supabaseServer
        .from('agent_memory')
        .select('*', { count: 'exact', head: true });

      return {
        total_memories: count || 0,
        recall_count: count || 0,
        reuse_success_rate: 0.75, // Placeholder
        planner_adaptation_rate: 0.6 // Placeholder
      };
    } catch (error) {
      return {
        total_memories: 0,
        recall_count: 0,
        reuse_success_rate: 0,
        planner_adaptation_rate: 0
      };
    }
  }
}

export default MemoryManager;
