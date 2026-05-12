import { NextRequest } from 'next/server';
import {
  inferIntent,
  decomposeToAtomicTasks,
  IntentResult,
  DecomposeResult,
} from '@/lib/prompt-orchestrator/reasoner';
import { callLLMWithJSON } from '@/lib/prompt-orchestrator/llm';

export const maxDuration = 300;
export const runtime = 'nodejs';

const PER_CALL_TIMEOUT = 120_000;
const HEARTBEAT_MS = 10_000;

// Merged intent + architecture in one LLM call
interface UnifiedIntent extends IntentResult {
  architecture: {
    frontend: string;
    backend: string;
    db: string;
    infra: string[];
    reasoning: string;
    rejectedAlternatives: string[];
  };
}

async function inferUnifiedIntent(userInput: string): Promise<UnifiedIntent> {
  const system = `你是一位有 10 年经验的产品技术顾问兼架构师。用户会给你一个产品想法，你需要同时完成两件事：

1. 理解产品意图（业务目标、用户类型、产品形态、项目阶段）
2. 做出技术选型（前端、后端、数据库、基础设施）

关键原则：
- 不是所有项目都需要 React。内部工具用 Vue 甚至纯 HTML 可能更好。
- 不是所有项目都需要后端。BaaS 可能就够了。
- "最合适" ≠ "最先进"。验证期项目用重型框架是浪费时间。
- 如果输入模糊，ambiguity 字段必须指出"哪些关键信息缺失"。

输出严格 JSON：
{
  "businessGoal": "string — 用户真正想解决的问题",
  "userType": "string — 谁会用",
  "productShape": "string — Web/Mobile/API/CLI/混合",
  "lifecycle": "string — 想法验证期/MVP/增长期",
  "ambiguity": "string — 哪些信息缺失",
  "decisionPoints": ["string"],
  "architecture": {
    "frontend": "选择的前端方案（附简短理由）",
    "backend": "选择的后端方案（附简短理由）",
    "db": "选择的数据库方案（附简短理由）",
    "infra": ["基础设施1", "基础设施2"],
    "reasoning": "2-3 句话的整体架构逻辑",
    "rejectedAlternatives": ["被否决的方案及原因"]
  }
}`;

  return await callLLMWithJSON<UnifiedIntent>([
    { role: 'system', content: system },
    { role: 'user', content: userInput },
  ]);
}

function buildContextPack(
  intent: UnifiedIntent,
  decompose: DecomposeResult,
  userInput: string
): string {
  const treeByDir: Record<string, string[]> = {};
  for (const task of decompose.tasks) {
    const parts = task.file.split('/');
    const dir = parts.slice(0, -1).join('/') || '.';
    const fileName = parts[parts.length - 1];
    if (!treeByDir[dir]) treeByDir[dir] = [];
    if (!treeByDir[dir].includes(fileName)) treeByDir[dir].push(fileName);
  }

  const fileTree = Object.entries(treeByDir)
    .map(([dir, files]) => `  ${dir}/\n    ${files.join('\n    ')}`)
    .join('\n');

  const fileTasks = decompose.tasks.map(t => {
    const lines: string[] = [];
    lines.push(`### ${t.file}`);
    lines.push(`**职责**：${t.responsibility}`);
    lines.push(`**输入**：${t.input} → **输出**：${t.output}`);
    if (t.dependencies.length > 0) lines.push(`**前置依赖**：${t.dependencies.join(', ')}`);
    lines.push('');
    lines.push('实现要求：');
    for (const req of t.implementationRequirements) lines.push(`- ${req}`);
    if (t.forbiddenItems.length > 0) {
      lines.push('');
      lines.push('禁止：');
      for (const f of t.forbiddenItems) lines.push(`- ${f}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  const execOrder = decompose.phases.map(p => {
    const fileList = decompose.tasks.filter(t => t.phase === p.phase).map(t => t.file);
    return `### 第 ${p.phase} 阶段：${p.label}\n涉及文件：${fileList.join(', ')}\n\n完成后输出 DONE_PHASE_${p.phase}，确认后再继续。`;
  }).join('\n\n');

  return `## 项目背景

**业务目标**：${intent.businessGoal}
**目标用户**：${intent.userType}
**产品形态**：${intent.productShape}
**项目阶段**：${intent.lifecycle}
${intent.ambiguity ? `**需要关注**：${intent.ambiguity}` : ''}

---

## 技术选型

**前端**：${intent.architecture.frontend}
**后端**：${intent.architecture.backend}
**数据库**：${intent.architecture.db}
**基础设施**：${intent.architecture.infra.join('、')}
**选型逻辑**：${intent.architecture.reasoning}

---

## 文件结构

\`\`\`
${fileTree}
\`\`\`

---

## 具体任务

${fileTasks}

---

## 推进节奏

分阶段推进，每阶段完成后暂停确认。

${execOrder}

---

## 交付格式

每次输出按这个结构：

**修改的文件**
列出所有被修改或新建的文件路径

**代码**
完整代码，每个文件用代码块包裹

**验证方式**
如何确认代码正确运行

---

## 边界约束

- 不修改未在任务中列出的文件
- 不引入未列出的依赖
- 不做额外扩展
- 如果描述有歧义，先确认再实现`;
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} 超时 (${ms / 1000}s)`)), ms)
    ),
  ]);
}

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder();
  let pingTimer: ReturnType<typeof setInterval> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: Record<string, unknown>) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch { /* controller may be closed */ }
      };

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: keepalive\n\n`));
        } catch { /* ignore */ }
      };

      pingTimer = setInterval(sendPing, HEARTBEAT_MS);

      try {
        const body = await req.json();
        const userInput = body?.userInput;

        if (!userInput || typeof userInput !== 'string' || userInput.trim().length < 2) {
          send({ type: 'error', error: '请输入至少 10 个字的需求描述' });
          return;
        }

        const input = userInput.trim();
        console.log('[prompt-generate] start, input length:', input.length);

        // --- Step 1: Intent (merged with Architecture) ---
        send({ type: 'progress', step: 'intent', status: 'running' });

        let intent: UnifiedIntent;
        try {
          console.log('[prompt-generate] step:start intent');
          intent = await withTimeout(inferUnifiedIntent(input), PER_CALL_TIMEOUT, '意图识别');
          console.log('[prompt-generate] step:success intent');
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        } catch (err) {
          console.error('[prompt-generate] step:error intent', err);
          send({ type: 'step_error', step: 'intent', error: '意图分析超时，请重试' });
          return;
        }

        // --- Step 2: Decompose ---
        send({ type: 'progress', step: 'decompose', status: 'running' });

        let decompose: DecomposeResult;
        try {
          console.log('[prompt-generate] step:start decompose');
          decompose = await withTimeout(
            decomposeToAtomicTasks(intent, intent.architecture, input),
            PER_CALL_TIMEOUT,
            '任务拆解'
          );
          console.log('[prompt-generate] step:success decompose, tasks:', decompose.tasks.length);
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        } catch (err) {
          console.error('[prompt-generate] step:error decompose', err);
          send({ type: 'step_error', step: 'decompose', error: '任务拆解超时，请重试' });
          return;
        }

        // --- Step 3: Compile (programmatic, no LLM) ---
        send({ type: 'progress', step: 'compile', status: 'running' });

        let prompt: string;
        try {
          console.log('[prompt-generate] step:start compile');
          prompt = buildContextPack(intent, decompose, input);
          console.log('[prompt-generate] step:success compile, length:', prompt.length);
        } catch (err) {
          console.error('[prompt-generate] step:error compile', err);
          prompt = `# 开发任务\n\n基于以下需求开发：${input}\n\n技术栈：${intent.architecture.frontend} + ${intent.architecture.backend} + ${intent.architecture.db}\n\n请按照标准开发流程实现。`;
        }

        send({ type: 'progress', step: 'compile', status: 'done' });

        send({
          type: 'done',
          prompt,
          intent,
          decompose,
        });
        console.log('[prompt-generate] done');
      } catch (err) {
        const msg = err instanceof Error ? err.message : '生成失败，请重试';
        console.error('[prompt-generate] fatal error', err);
        send({ type: 'error', error: msg });
      } finally {
        if (pingTimer) clearInterval(pingTimer);
        try { controller.close(); } catch { /* already closed */ }
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
