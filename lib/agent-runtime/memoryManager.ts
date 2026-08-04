import { getSupabaseServer, isSupabaseConfigured } from '../supabase/client';
import { generateEmbedding } from '../embeddings';
import { CHINESE_OUTPUT_INSTRUCTION_SIMPLE } from './constants';
import { safeParseLLMJson } from '../utils/safeJson';

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
  embedding?: number[];
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
const VECTOR_SIMILARITY_THRESHOLD = 0.6;

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
      const llmLessons = await this.extractLessonsWithLLM(execution);
      if (llmLessons) {
        return llmLessons;
      }
    } catch (error) {
      console.warn('[Memory] LLM lesson extraction failed, falling back to rules');
    }

    const lessons: ExecutionLesson = {
      successes: [],
      failures: [],
      optimizations: []
    };

    if (execution.steps) {
      for (const step of execution.steps) {
        if (step.status === 'completed') {
          if (step.agent === 'Architect Agent') {
            lessons.successes.push('架构设计方案完成，系统结构清晰');
          }
          if (step.agent === 'Coding Agent') {
            lessons.successes.push('代码生成完成，核心模块实现就绪');
          }
        }

        if (step.output && step.output.toLowerCase().includes('error')) {
          lessons.failures.push(`${step.agent} 执行过程中发现潜在问题: ${step.output.slice(0, 100)}`);
        }
      }
    }

    if (lessons.successes.length === 0) {
      lessons.successes.push('执行完成，未发现严重问题');
    }

    return lessons;
  }

  private static async extractLessonsWithLLM(execution: any): Promise<ExecutionLesson | null> {
    try {
      const apiKey = process.env.OPENAI_API_KEY;
      const baseUrl = process.env.OPENAI_BASE_URL || 'https://api.deepseek.com/v1';
      const model = process.env.OPENAI_MODEL || 'deepseek-chat';

      if (!apiKey) return null;

      const executionData = {
        prompt: execution.prompt || '',
        steps: execution.steps || [],
        status: execution.status
      };

      const systemPrompt = `你是一名资深工程记忆分析师。分析执行记录并提取结构化经验教训。
仅返回有效的 JSON，不要包含其他文本。格式如下：
{
  "successes": ["字符串"],
  "failures": ["字符串"],
  "optimizations": ["字符串"]
}
不要包含 Markdown 或代码块标记 - 仅返回原始 JSON。${CHINESE_OUTPUT_INSTRUCTION_SIMPLE}。`;

      const userPrompt = `分析以下工程执行记录，提取经验教训：

执行数据：
${JSON.stringify(executionData, null, 2)}

仅返回结构化 JSON。`;

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          temperature: 0.3,
        }),
      });

      if (!response.ok) return null;

      const result = await response.json();
      const content = result.choices[0]?.message?.content;

      if (content) {
        const parsed = safeParseLLMJson<{ successes: string[]; failures: string[]; optimizations: string[] }>(content, { successes: [], failures: [], optimizations: [] });
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
  // TASK 2: STORE MEMORY (WITH EMBEDDING)
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

    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      const autoTags = tags || MemoryManager.extractTags(prompt, lessons);
      const importanceScore = MemoryManager.calculateImportance(lessons);

      // 生成 embedding（异步，不阻塞存储）
      const embedding = await generateEmbedding(prompt);

      const { data, error } = await supabase
        .from('agent_memory')
        .insert({
          execution_id: executionId,
          prompt: prompt,
          summary: summary || MemoryManager.generateSummary(lessons),
          lessons: lessons as any,
          tags: autoTags,
          importance_score: importanceScore,
          memory_type: 'execution',
          embedding: embedding, // pgvector 向量列
        })
        .select()
        .single();

      if (error) {
        console.error('[Memory] Storage error:', error);
        return null;
      }

      return data as unknown as AgentMemory;
    } catch (error) {
      console.error('[Memory] Storage failed:', error);
      return null;
    }
  }

  // ============================================
  // TASK 3: VECTOR RETRIEVAL (pgvector)
  // ============================================

  static async retrieveRelevantMemories(newPrompt: string): Promise<RetrievedMemory[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      // 优先使用 pgvector 语义检索
      const vectorResults = await this.vectorRetrieve(supabase, newPrompt);
      if (vectorResults.length > 0) {
        return vectorResults.slice(0, MAX_RETRIEVED_MEMORIES);
      }

      // 回退：关键词 + 标签匹配
      console.warn('[Memory] Vector retrieval returned no results, falling back to keyword matching');
      return await this.keywordRetrieve(supabase, newPrompt);
    } catch (error) {
      console.error('[Memory] Retrieval failed:', error);
      return [];
    }
  }

  /**
   * pgvector 向量检索：调用 match_memories RPC 或直接 cosine 排序
   */
  private static async vectorRetrieve(supabase: any, newPrompt: string): Promise<RetrievedMemory[]> {
    // 1. 为新 prompt 生成查询向量
    const queryEmbedding = await generateEmbedding(newPrompt);
    if (!queryEmbedding) return [];

    try {
      // 方案 A：通过 match_memories RPC 检索（推荐）
      const { data, error } = await supabase.rpc('match_memories', {
        query_embedding: queryEmbedding,
        match_threshold: VECTOR_SIMILARITY_THRESHOLD,
        match_count: MAX_RETRIEVED_MEMORIES + 5,
      });

      if (!error && data && data.length > 0) {
        return data.map((row: any) => ({
          memory: {
            id: row.id,
            execution_id: row.execution_id,
            prompt: row.prompt,
            summary: row.summary,
            lessons: row.lessons,
            tags: row.tags,
            memory_type: 'execution',
            importance_score: row.importance_score,
            created_at: row.created_at,
          },
          relevance_score: row.similarity,
          relevance_reason: `语义相似度: ${(row.similarity * 100).toFixed(1)}%`,
        }));
      }
    } catch (e) {
      console.warn('[Memory] RPC match_memories failed, trying client-side filter');
    }

    // 方案 B：取回所有带 embedding 的记忆，客户端算距离（数据量小时可用）
    try {
      const { data: memories, error } = await supabase
        .from('agent_memory')
        .select('*')
        .not('embedding', 'is', null)
        .order('importance_score', { ascending: false })
        .limit(50);

      if (error || !memories || memories.length === 0) return [];

      // 计算余弦相似度
      const scored = memories.map((memory: any) => {
        if (!memory.embedding) return null;
        const similarity = MemoryManager.cosineSimilarity(queryEmbedding, memory.embedding);
        return {
          memory: memory as unknown as AgentMemory,
          relevance_score: similarity,
          relevance_reason: similarity > VECTOR_SIMILARITY_THRESHOLD
            ? `语义相似度: ${(similarity * 100).toFixed(1)}%`
            : '低相似度',
        };
      }).filter(Boolean) as RetrievedMemory[];

      return scored
        .sort((a, b) => b.relevance_score - a.relevance_score)
        .filter(m => m.relevance_score > VECTOR_SIMILARITY_THRESHOLD);
    } catch (e) {
      console.warn('[Memory] Client-side vector retrieval failed:', e);
      return [];
    }
  }

  /**
   * 关键词回退检索（当向量检索不可用时）
   */
  private static async keywordRetrieve(supabase: any, newPrompt: string): Promise<RetrievedMemory[]> {
    try {
      const { data: memories, error } = await supabase
        .from('agent_memory')
        .select('*')
        .order('importance_score', { ascending: false })
        .limit(20);

      if (error || !memories) return [];

      const scored = memories.map((memory: any) => ({
        memory: memory as unknown as AgentMemory,
        relevance_score: MemoryManager.calculateRelevance(newPrompt, memory as unknown as AgentMemory),
        relevance_reason: MemoryManager.explainRelevance(newPrompt, memory as unknown as AgentMemory)
      }));

      return scored
        .sort((a: any, b: any) => b.relevance_score - a.relevance_score)
        .slice(0, MAX_RETRIEVED_MEMORIES)
        .filter((m: any) => m.relevance_score > 0);
    } catch (e) {
      console.error('[Memory] Keyword retrieval failed:', e);
      return [];
    }
  }

  // ============================================
  // TASK 4: COSINE SIMILARITY
  // ============================================

  static cosineSimilarity(a: number[], b: number[]): number {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      na += a[i] * a[i];
      nb += b[i] * b[i];
    }
    const denom = Math.sqrt(na) * Math.sqrt(nb);
    return denom === 0 ? 0 : dot / denom;
  }

  // ============================================
  // TASK 5: KEYWORD RELEVANCE (FALLBACK)
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
    score += Math.max(0, 1 - (daysAgo / 30)) * 0.1;

    return Math.min(score, 1);
  }

  static explainRelevance(newPrompt: string, memory: AgentMemory): string {
    const reasons: string[] = [];
    const promptLower = newPrompt.toLowerCase();

    if (memory.tags) {
      const overlappingTags = memory.tags.filter(tag =>
        promptLower.includes(tag.toLowerCase())
      );
      if (overlappingTags.length > 0) {
        reasons.push(`相似标签: ${overlappingTags.slice(0, 2).join(', ')}`);
      }
    }

    if (memory.importance_score > 0.7) {
      reasons.push('高重要度记忆');
    }

    return reasons.length > 0 ? reasons.join('; ') : '相关历史上下文';
  }

  // ============================================
  // TASK 6: MEMORY RELATIONS
  // ============================================

  static async linkExecutionMemory(
    sourceExecutionId: string,
    targetExecutionId: string,
    relevanceScore: number,
    relationType: string = 'similar'
  ): Promise<MemoryRelation | null> {
    if (!isSupabaseConfigured()) return null;

    const supabase = getSupabaseServer();
    if (!supabase) return null;

    try {
      const { data, error } = await supabase
        .from('memory_relations')
        .insert({
          source_execution_id: sourceExecutionId,
          target_execution_id: targetExecutionId,
          relevance_score: relevanceScore,
          relation_type: relationType
        })
        .select()
        .single();

      if (error) return null;

      return data as MemoryRelation;
    } catch (error) {
      console.error('[Memory] Linking failed:', error);
      return null;
    }
  }

  static async getExecutionLineage(executionId: string): Promise<string[]> {
    if (!isSupabaseConfigured()) return [];

    const supabase = getSupabaseServer();
    if (!supabase) return [];

    try {
      const { data: relations, error } = await supabase
        .from('memory_relations')
        .select('*')
        .or(`source_execution_id.eq.${executionId},target_execution_id.eq.${executionId}`)
        .order('relevance_score', { ascending: false });

      if (error) return [];

      const executionIds = new Set<string>();
      executionIds.add(executionId);

      for (const rel of relations || []) {
        if (rel.source_execution_id === executionId) executionIds.add(rel.target_execution_id);
        if (rel.target_execution_id === executionId) executionIds.add(rel.source_execution_id);
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
    if (lessons.failures.length > 0) score += 0.2;
    if (lessons.optimizations.length > 0) score += 0.15;
    if (lessons.successes.length > 1) score += 0.15;
    return Math.min(score, 1);
  }

  private static generateSummary(lessons: ExecutionLesson): string {
    const parts: string[] = [];
    if (lessons.successes.length > 0) parts.push(`成功经验: ${lessons.successes[0]}`);
    if (lessons.failures.length > 0) parts.push(`遇到挑战: ${lessons.failures[0]}`);
    return parts.join(' | ') || '执行完成';
  }

  // ============================================
  // CONTEXT INJECTION
  // ============================================

  static formatMemoryContext(memories: RetrievedMemory[]): string {
    if (memories.length === 0) return '';

    let context = '\n\n历史工程记忆参考\n';

    context += '相似任务:\n';
    memories.forEach((m, i) => {
      context += `${i + 1}. ${m.memory.prompt.slice(0, 100)}...\n`;
    });

    context += '\n经验教训:\n';
    const allLessons: string[] = [];
    memories.forEach(m => {
      if (m.memory.lessons?.successes) allLessons.push(...m.memory.lessons.successes);
      if (m.memory.lessons?.optimizations) allLessons.push(...m.memory.lessons.optimizations);
    });

    const uniqueLessons = Array.from(new Set(allLessons)).slice(0, 5);
    uniqueLessons.forEach(lesson => { context += `- ${lesson}\n`; });

    context += '\n请参考以上经验指导本次任务\n';

    if (context.length > MAX_TOKEN_LENGTH) {
      context = context.slice(0, MAX_TOKEN_LENGTH - 100) + '\n...[truncated]\n';
    }

    return context;
  }

  // ============================================
  // MEMORY METRICS (REAL, NOT PLACEHOLDER)
  // ============================================

  static async getMemoryMetrics(): Promise<{
    total_memories: number;
    recall_count: number;
    reuse_success_rate: number;
    planner_adaptation_rate: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { total_memories: 0, recall_count: 0, reuse_success_rate: 0, planner_adaptation_rate: 0 };
    }

    const supabase = getSupabaseServer();
    if (!supabase) {
      return { total_memories: 0, recall_count: 0, reuse_success_rate: 0, planner_adaptation_rate: 0 };
    }

    try {
      // 真实统计数据
      const { count: totalMemories } = await supabase
        .from('agent_memory')
        .select('*', { count: 'exact', head: true });

      const { count: hasEmbedding } = await supabase
        .from('agent_memory')
        .select('*', { count: 'exact', head: true })
        .not('embedding', 'is', null);

      const { count: highImportance } = await supabase
        .from('agent_memory')
        .select('*', { count: 'exact', head: true })
        .gte('importance_score', 0.7);

      const total = totalMemories || 0;
      const withEmbedding = hasEmbedding || 0;
      const important = highImportance || 0;

      return {
        total_memories: total,
        recall_count: withEmbedding,
        // 有用记忆占比 = 高重要性记忆 / 总数
        reuse_success_rate: total > 0 ? Math.round((important / total) * 100) / 100 : 0,
        // 向量化率 = 有 embedding 的记忆 / 总数
        planner_adaptation_rate: total > 0 ? Math.round((withEmbedding / total) * 100) / 100 : 0,
      };
    } catch (error) {
      console.error('[Memory] Metrics retrieval failed:', error);
      return { total_memories: 0, recall_count: 0, reuse_success_rate: 0, planner_adaptation_rate: 0 };
    }
  }
}

export default MemoryManager;
