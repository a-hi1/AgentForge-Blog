import { NextRequest } from 'next/server';
import {
  inferIntent,
  decideArchitecture,
  decomposeToAtomicTasks,
  IntentResult,
  ArchitectureResult,
  DecomposeResult,
} from '@/lib/prompt-orchestrator/reasoner';
import { buildAgentContract, formatContractAsMarkdown } from '@/lib/prompt-orchestrator/agentContract';

export const maxDuration = 300;
export const runtime = 'nodejs';

const PER_CALL_TIMEOUT = 45_000;
const HEARTBEAT_MS = 10_000;

function buildPromptFromData(
  intent: IntentResult,
  architecture: ArchitectureResult,
  decompose: DecomposeResult,
  userInput: string
): string {
  const contract = buildAgentContract();
  const contractMarkdown = formatContractAsMarkdown(contract);

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
    lines.push(`- 职责：${t.responsibility}`);
    lines.push(`- 输入：${t.input}`);
    lines.push(`- 输出：${t.output}`);
    if (t.dependencies.length > 0) lines.push(`- 依赖：${t.dependencies.join(', ')}`);
    lines.push(`- 实现要求：`);
    for (const req of t.implementationRequirements) lines.push(`  - ${req}`);
    if (t.forbiddenItems.length > 0) {
      lines.push(`- 禁止：`);
      for (const f of t.forbiddenItems) lines.push(`  - ${f}`);
    }
    return lines.join('\n');
  }).join('\n\n');

  const execOrder = decompose.phases.map(p => {
    const fileList = decompose.tasks.filter(t => t.phase === p.phase).map(t => t.file);
    return `### Phase ${p.phase}: ${p.label}\n文件：${fileList.join(', ')}\n完成后输出：DONE_PHASE_${p.phase}\n等待确认后再继续。`;
  }).join('\n\n');

  const validationItems = [
    '[ ] npm run dev 无报错',
    '[ ] TypeScript 0 errors',
    '[ ] 所有指定文件均已创建',
    '[ ] 每个文件的导出函数均可正常调用',
    '[ ] 无未声明的依赖',
  ];

  return `# AgentForge 生成的开发 Prompt

## Section 1: ROLE

你是资深全栈工程师。

目标：严格按以下要求实现，不做额外架构扩展。

禁止擅自：
- 替换技术栈
- 增加未列出的依赖
- 改变目录结构
- 提前实现后续 Phase 的内容

## Section 2: PROJECT CONTEXT

- 业务目标：${intent.businessGoal}
- 核心用户：${intent.userType}
- 产品形态：${intent.productShape}
- 项目阶段：${intent.lifecycle}
- 模糊点：${intent.ambiguity}
- MVP 范围：基于以上分析的最小可用版本

## Section 3: TECHNICAL DECISION

- 前端：${architecture.frontend}
- 后端：${architecture.backend}
- 数据库：${architecture.db}
- 基础设施：${architecture.infra.join(', ')}
- 选型理由：${architecture.reasoning}
- 被拒绝方案：${architecture.rejectedAlternatives.join(' | ')}

## Section 4: TARGET FILE TREE

\`\`\`
${fileTree}
\`\`\`

## Section 5: FILE TASKS

${fileTasks}

## Section 6: EXECUTION ORDER

${execOrder}

## Section 7: OUTPUT CONTRACT

每次输出必须严格按以下格式：

### Modified Files
列出所有被修改或新建的文件路径

### Code
完整代码，每个文件用 \`\`\`tsx 包裹

### Verification
如何验证代码正确运行

### Risks
可能的风险和注意事项

禁止输出解释性长文。仅输出代码和必要说明。

## Section 8: VALIDATION CHECKLIST

${validationItems.join('\n')}

## Section 9: BOUNDARY

禁止：
- 修改未在 FILE TASKS 中列出的文件
- 增加 mock 数据或测试桩
- 自动引入测试框架（除非任务明确要求）
- 自动更换 package manager
- 重构未指定的已有代码

## Section 10: ERROR FEEDBACK TEMPLATE

当遇到错误时，按以下格式反馈：

错误：[错误信息]
当前文件：[出错的文件路径]
期望：[期望的行为]
实际：[实际的行为]
日志：[相关日志]

${contractMarkdown}`;
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
        } catch {
          /* controller may be closed */
        }
      };

      const sendPing = () => {
        try {
          controller.enqueue(encoder.encode(`event: ping\ndata: keepalive\n\n`));
        } catch {
          /* ignore */
        }
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

        send({ type: 'progress', step: 'intent', status: 'running' });

        let intent: IntentResult;
        try {
          console.log('[prompt-generate] stage:start intent');
          intent = await withTimeout(inferIntent(input), PER_CALL_TIMEOUT, '意图识别');
          console.log('[prompt-generate] stage:success intent');
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        } catch (err) {
          console.error('[prompt-generate] stage:error intent', err);
          intent = {
            businessGoal: input.slice(0, 100),
            userType: '个人开发者',
            productShape: 'Web 应用',
            lifecycle: 'MVP',
            ambiguity: '意图识别降级，使用基础推断',
            decisionPoints: [input.slice(0, 50)],
          };
          send({ type: 'progress', step: 'intent', status: 'fallback', result: intent });
        }

        send({ type: 'progress', step: 'architecture', status: 'running' });

        let architecture: ArchitectureResult;
        try {
          console.log('[prompt-generate] stage:start architecture');
          architecture = await withTimeout(decideArchitecture(intent), PER_CALL_TIMEOUT, '架构决策');
          console.log('[prompt-generate] stage:success architecture');
          send({ type: 'progress', step: 'architecture', status: 'done', result: architecture });
        } catch (err) {
          console.error('[prompt-generate] stage:error architecture', err);
          architecture = {
            frontend: 'React + Next.js',
            backend: 'Next.js API Routes',
            db: 'Supabase (PostgreSQL)',
            infra: ['Vercel'],
            reasoning: '架构决策降级，使用通用全栈方案',
            rejectedAlternatives: [],
          };
          send({ type: 'progress', step: 'architecture', status: 'fallback', result: architecture });
        }

        send({ type: 'progress', step: 'decompose', status: 'running' });

        let decompose: DecomposeResult;
        try {
          console.log('[prompt-generate] stage:start decompose');
          decompose = await withTimeout(decomposeToAtomicTasks(intent, architecture, input), PER_CALL_TIMEOUT, '任务拆解');
          console.log('[prompt-generate] stage:success decompose, tasks:', decompose.tasks.length);
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        } catch (err) {
          console.error('[prompt-generate] stage:error decompose', err);
          decompose = {
            tasks: [
              {
                phase: 1,
                phaseLabel: '初始化',
                file: 'src/config/app.ts',
                responsibility: '应用配置',
                input: '无',
                output: 'AppConfig',
                dependencies: [],
                implementationRequirements: ['export const appConfig = {...}', 'export type AppConfig = {...}'],
                forbiddenItems: ['禁止硬编码'],
              },
              {
                phase: 2,
                phaseLabel: '核心逻辑',
                file: 'src/store/app.store.ts',
                responsibility: '状态管理',
                input: 'AppConfig',
                output: 'AppState',
                dependencies: ['src/config/app.ts'],
                implementationRequirements: ['export function useAppStore()', 'export function initState()'],
                forbiddenItems: ['禁止 class-based store'],
              },
            ],
            phases: [
              { phase: 1, label: '初始化', files: ['src/config/app.ts'] },
              { phase: 2, label: '核心逻辑', files: ['src/store/app.store.ts'] },
            ],
          };
          send({ type: 'progress', step: 'decompose', status: 'fallback', result: decompose });
        }

        send({ type: 'progress', step: 'compile', status: 'running' });

        let prompt: string;
        try {
          console.log('[prompt-generate] stage:start compile (programmatic)');
          prompt = buildPromptFromData(intent, architecture, decompose, input);
          console.log('[prompt-generate] stage:success compile, length:', prompt.length);
          send({ type: 'progress', step: 'compile', status: 'done' });
        } catch (err) {
          console.error('[prompt-generate] stage:error compile', err);
          prompt = `# 开发任务\n\n基于以下需求开发：${input}\n\n技术栈：${architecture.frontend} + ${architecture.backend} + ${architecture.db}\n\n请按照标准开发流程实现。`;
          send({ type: 'progress', step: 'compile', status: 'fallback' });
        }

        send({ type: 'done', prompt, intent, architecture, decompose });
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
