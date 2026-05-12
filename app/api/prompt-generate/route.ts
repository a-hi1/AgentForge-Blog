import { NextRequest } from 'next/server';
import {
  inferIntent,
  decideArchitecture,
  generateArchitectOpinion,
  decomposeToAtomicTasks,
  detectProjectReality,
  generateEngineeringReminders,
  IntentResult,
  ArchitectureResult,
  ArchitectOpinion,
  DecomposeResult,
  ProjectReality,
  EngineeringReminder,
} from '@/lib/prompt-orchestrator/reasoner';

export const maxDuration = 300;
export const runtime = 'nodejs';

const PER_CALL_TIMEOUT = 45_000;
const HEARTBEAT_MS = 10_000;

function humanizePrompt(prompt: string): string {
  // 替换机械化的标题
  const titleReplacements: Record<string, string> = {
    '## 你的角色': '## 我们怎么合作',
    '## 当前情况': '## 项目背景',
    '## 为什么这样选': '## 这次更建议这样做',
    '## 这次不建议这样做': '## 这些方案先放一放',
    '## 架构师判断': '## 我的建议',
    '## 项目文件结构': '## 文件怎么组织',
    '## 每个文件要做什么': '## 具体任务',
    '## 执行顺序': '## 推进节奏',
    '## 你的输出格式': '## 交付格式',
    '## 完成后的验证清单': '## 怎么确认没问题',
    '## 边界约束': '## 这些事别做',
    '## 遇到错误时的反馈方式': '## 出问题了怎么办',
  };

  let result = prompt;
  for (const [old, replacement] of Object.entries(titleReplacements)) {
    result = result.replace(old, replacement);
  }

  // 替换过于正式的表达
  result = result.replace(/你是一位资深全栈工程师/g, '我们一起来做这个项目');
  result = result.replace(/你的工作方式：/g, '我的建议是这样推进：');
  result = result.replace(/你不应该做的事：/g, '但有些事我们先不做：');
  result = result.replace(/输出严格 JSON：/g, '按这个格式输出：');
  result = result.replace(/禁止/g, '不建议');
  result = result.replace(/违规/g, '不太合适');

  // 让语气更自然
  result = result.replace(/(\d+)\.\s/g, '$1. ');

  return result;
}

function complexityGuard(
  architecture: ArchitectureResult,
  decompose: DecomposeResult,
  reality: ProjectReality
): string[] {
  const warnings: string[] = [];
  const frontend = architecture.frontend.toLowerCase();
  const backend = architecture.backend.toLowerCase();
  const db = architecture.db.toLowerCase();

  // 检测过度设计
  if (reality.teamSize === 'solo' && reality.complexityBudget === 'minimal') {
    // 微服务检测
    if (architecture.infra.some(i => i.toLowerCase().includes('kubernetes') ||
        i.toLowerCase().includes('k8s') || i.toLowerCase().includes('docker'))) {
      warnings.push('个人项目不建议现在就上容器编排，先用 Vercel/Netlify 一键部署');
    }

    // 多租户检测
    if (backend.includes('tenant') || backend.includes('multi-tenant')) {
      warnings.push('多租户架构在 MVP 阶段会增加 3-5 倍开发量，先做单租户版本');
    }

    // RBAC 检测
    if (backend.includes('rbac') || backend.includes('role-based')) {
      warnings.push('完整的 RBAC 权限系统需要 2-3 周开发，先用简单的 admin/user 两种角色');
    }

    // 微前端检测
    if (frontend.includes('micro-frontend') || frontend.includes('qiankun')) {
      warnings.push('微前端适合大型团队协作，个人项目用单体应用更高效');
    }
  }

  // 检测超出 MVP 的功能
  if (reality.validationStage === 'idea' || reality.validationStage === 'prototype') {
    const overEngineeredFeatures = ['消息队列', '缓存层', '全文搜索', '实时推送', 'websocket'];
    for (const feature of overEngineeredFeatures) {
      if (backend.includes(feature) || architecture.infra.some(i => i.includes(feature))) {
        warnings.push(`${feature} 在验证阶段不是必需的，先用简单方案替代`);
      }
    }
  }

  // 检测任务复杂度
  if (decompose.tasks.length > 15 && reality.teamSize === 'solo') {
    warnings.push(`当前拆解了 ${decompose.tasks.length} 个文件任务，建议先聚焦核心的 5-8 个文件`);
  }

  // 检测数据库复杂度
  if (reality.validationStage === 'idea' || reality.validationStage === 'prototype') {
    if (db.includes('redis') || db.includes('elasticsearch') || db.includes('mongodb')) {
      if (!db.includes('supabase') && !db.includes('firebase')) {
        warnings.push('验证阶段用 PostgreSQL/SQLite 即可，NoSQL 数据库在需求稳定后再考虑');
      }
    }
  }

  return warnings;
}

function buildPromptFromData(
  intent: IntentResult,
  architecture: ArchitectureResult,
  opinion: ArchitectOpinion,
  decompose: DecomposeResult,
  userInput: string,
  reality: ProjectReality,
  reminders: EngineeringReminder[],
  complexityWarnings: string[]
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
    return `### 第 ${p.phase} 阶段：${p.label}\n涉及文件：${fileList.join(', ')}\n\n完成后请输出 DONE_PHASE_${p.phase}，我会确认后再继续。如果发现问题，我会在当前阶段修复后才推进。`;
  }).join('\n\n');

  const rejectionBlock = architecture.rejectedAlternatives.length > 0
    ? architecture.rejectedAlternatives.map(r => `- ${r}`).join('\n')
    : '- （本轮未产生需要明确拒绝的方案）';

  // 开发提醒块
  const reminderBlock = reminders.length > 0
    ? reminders.map(r =>
`**${r.pitfall}**
为什么：${r.why}
怎么避免：${r.howToAvoid}
相关技术：${r.relatedTech}`
      ).join('\n\n')
    : '- （当前方案相对成熟，没有特别需要提醒的坑）';

  // 复杂度警告块
  const complexityBlock = complexityWarnings.length > 0
    ? complexityWarnings.map(w => `- ${w}`).join('\n')
    : '- （当前复杂度适合项目阶段）';

  // 根据项目阶段调整 Prompt 深度
  const depthNote = reality.complexityBudget === 'minimal'
    ? '\n\n> 当前是验证阶段，保持轻量。能跑通核心流程就是成功。'
    : reality.complexityBudget === 'full'
    ? '\n\n> 项目已进入规模化阶段，代码质量和可维护性同样重要。'
    : '';

  const rawPrompt = `> ${opinion.recommendation}${depthNote}

---

## 我们怎么合作

我们一起来做这个项目。

我的建议是这样推进：
- 先理解需求和约束，再动手
- 严格按照下面的文件任务实现，不做额外扩展
- 如果发现任务描述有歧义，先问我，不要猜
- 每完成一个阶段，停下来等我确认

但有些事我们先不做：
- 替换技术栈或引入未列出的依赖
- 重构我没有要求修改的代码
- 提前实现后续阶段的内容
- 添加 mock 数据或测试桩（除非任务明确要求）

---

## 项目背景

**业务目标**：${intent.businessGoal}

**目标用户**：${intent.userType}

**产品形态**：${intent.productShape}

**项目阶段**：${intent.lifecycle}

**真实目标**：${reality.likelyGoal}

**团队规模**：${reality.teamSize === 'solo' ? '个人开发' : reality.teamSize === 'small' ? '小团队' : reality.teamSize === 'medium' ? '中型团队' : '大型团队'}

${intent.ambiguity ? `**需要关注**：${intent.ambiguity}` : ''}

---

## 这次更建议这样做

**前端**：${architecture.frontend}

**后端**：${architecture.backend}

**数据库**：${architecture.db}

**基础设施**：${architecture.infra.join('、')}

**选型逻辑**：${architecture.reasoning}

---

## 这些方案先放一放

${rejectionBlock}

---

## 我的建议

**应该做**：${opinion.recommendation}

**不应该做**：${opinion.avoid}

**为什么**：${opinion.rationale}

**风险提醒**：${opinion.riskNotes}

---

## 文件怎么组织

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

## 开发提醒

这些是根据你选择的技术栈和项目阶段，最容易踩的坑：

${reminderBlock}

---

## 当前阶段不要做的事

${complexityBlock}

---

## 交付格式

每次输出请按这个结构：

**修改的文件**
列出所有被修改或新建的文件路径

**代码**
完整代码，每个文件用代码块包裹

**验证方式**
如何确认代码正确运行

**风险和备注**
可能的问题、需要注意的边界情况

不要输出解释性长文。直接给代码和必要的说明。

---

## 怎么确认没问题

- [ ] npm run dev 无报错
- [ ] TypeScript 0 errors
- [ ] 所有指定文件均已创建
- [ ] 每个文件的导出函数均可正常调用
- [ ] 无未声明的额外依赖

---

## 这些事别做

- 修改未在"具体任务"中列出的文件
- 增加 mock 数据或测试桩
- 自动引入测试框架（除非任务明确要求）
- 自动更换 package manager
- 重构未指定的已有代码

---

## 出问题了怎么办

如果遇到问题，请按以下格式反馈，我会帮你定位：

**错误**：[错误信息]
**当前文件**：[出错的文件路径]
**期望**：[期望的行为]
**实际**：[实际的行为]
**日志**：[相关日志片段]`;

  return humanizePrompt(rawPrompt);
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

        send({ type: 'progress', step: 'opinion', status: 'running' });

        let opinion: ArchitectOpinion;
        try {
          console.log('[prompt-generate] stage:start opinion');
          opinion = await withTimeout(generateArchitectOpinion(intent, architecture), PER_CALL_TIMEOUT, '架构判断');
          console.log('[prompt-generate] stage:success opinion');
          send({ type: 'progress', step: 'opinion', status: 'done', result: opinion });
        } catch (err) {
          console.error('[prompt-generate] stage:error opinion', err);
          opinion = {
            recommendation: `对于「${intent.businessGoal}」，当前阶段建议先聚焦核心功能，快速验证可行性。`,
            avoid: '不要在验证期投入过多基础设施建设。',
            rationale: `目标用户是${intent.userType}，产品形态为${intent.productShape}，处于${intent.lifecycle}阶段。此时最重要的是验证核心价值，而非追求技术完美。`,
            riskNotes: '如果核心假设不成立，过多的前期投入会变成沉没成本。',
          };
          send({ type: 'progress', step: 'opinion', status: 'fallback', result: opinion });
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

        send({ type: 'progress', step: 'reality', status: 'running' });

        let reality: ProjectReality;
        try {
          console.log('[prompt-generate] stage:start reality');
          reality = detectProjectReality(intent, input);
          console.log('[prompt-generate] stage:success reality, teamSize:', reality.teamSize);
          send({ type: 'progress', step: 'reality', status: 'done', result: reality });
        } catch (err) {
          console.error('[prompt-generate] stage:error reality', err);
          reality = {
            teamSize: 'solo',
            urgency: 'medium',
            validationStage: 'mvp',
            likelyGoal: '快速验证核心价值',
            engineeringMaturity: 'intermediate',
            complexityBudget: 'moderate',
            testingStrategy: 'smoke',
          };
          send({ type: 'progress', step: 'reality', status: 'fallback', result: reality });
        }

        send({ type: 'progress', step: 'reminders', status: 'running' });

        let reminders: EngineeringReminder[];
        try {
          console.log('[prompt-generate] stage:start reminders');
          reminders = generateEngineeringReminders(architecture, decompose, reality);
          console.log('[prompt-generate] stage:success reminders, count:', reminders.length);
          send({ type: 'progress', step: 'reminders', status: 'done', result: reminders });
        } catch (err) {
          console.error('[prompt-generate] stage:error reminders', err);
          reminders = [];
          send({ type: 'progress', step: 'reminders', status: 'fallback', result: reminders });
        }

        send({ type: 'progress', step: 'complexity', status: 'running' });

        let complexityWarnings: string[];
        try {
          console.log('[prompt-generate] stage:start complexity');
          complexityWarnings = complexityGuard(architecture, decompose, reality);
          console.log('[prompt-generate] stage:success complexity, warnings:', complexityWarnings.length);
          send({ type: 'progress', step: 'complexity', status: 'done', result: complexityWarnings });
        } catch (err) {
          console.error('[prompt-generate] stage:error complexity', err);
          complexityWarnings = [];
          send({ type: 'progress', step: 'complexity', status: 'fallback', result: complexityWarnings });
        }

        send({ type: 'progress', step: 'compile', status: 'running' });

        let prompt: string;
        try {
          console.log('[prompt-generate] stage:start compile (programmatic)');
          prompt = buildPromptFromData(intent, architecture, opinion, decompose, input, reality, reminders, complexityWarnings);
          console.log('[prompt-generate] stage:success compile, length:', prompt.length);
          send({ type: 'progress', step: 'compile', status: 'done' });
        } catch (err) {
          console.error('[prompt-generate] stage:error compile', err);
          prompt = `# 开发任务\n\n基于以下需求开发：${input}\n\n技术栈：${architecture.frontend} + ${architecture.backend} + ${architecture.db}\n\n请按照标准开发流程实现。`;
          send({ type: 'progress', step: 'compile', status: 'fallback' });
        }

        send({ type: 'done', prompt, intent, architecture, opinion, decompose, reality, reminders, complexityWarnings });
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
