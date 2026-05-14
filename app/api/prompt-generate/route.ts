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

const PER_CALL_TIMEOUT = 300_000; // 5分钟超时
const HEARTBEAT_MS = 10_000;

interface UnifiedIntent extends IntentResult {
  techStack: {
    frontend: string;
    backend: string;
    db: string;
    infra: string[];
  };
  coreFeatures: string[];
  dataModels: { name: string; fields: string[] }[];
  apiEndpoints: { method: string; path: string; description: string }[];
  securityNotes: string[];
}

// 降级默认技术栈
function getDefaultTechStack(): UnifiedIntent['techStack'] {
  return {
    frontend: "Next.js + React",
    backend: "Next.js API Routes",
    db: "LocalStorage / SQLite",
    infra: ["Vercel"]
  };
}

// 降级默认意图
function getDefaultIntent(userInput: string): UnifiedIntent {
  return {
    businessGoal: userInput,
    userType: "个人项目",
    productShape: "Web",
    lifecycle: "验证期",
    ambiguity: "继续推进开发",
    decisionPoints: [userInput],
    techStack: getDefaultTechStack(),
    coreFeatures: [userInput],
    dataModels: [],
    apiEndpoints: [],
    securityNotes: []
  };
}

async function inferUnifiedIntent(userInput: string): Promise<UnifiedIntent> {
  const system = `你是产品技术顾问+全栈架构师。分析用户需求，输出具体的开发方案。

## 核心原则
- **独立决策**：为每个需求选择最优的技术方案和架构，不要参考或模仿任何现有项目结构
- **最新最佳实践**：优先使用2024-2025年的主流方案和最新稳定版本的框架特性
- **架构适配**：根据项目规模（MVP/增长期）和形态（Mobile/Web/API）选择最合适的架构模式

## 约束规则（必须严格遵守）

### 功能约束
1. **只做用户要求的功能**：不要自行添加用户没提到的功能。coreFeatures数量应与用户描述的核心功能数量一致，不要凑数。
2. **功能描述要具体可开发**：不要写"个性化算法"这种模糊描述，要拆解成具体的数据操作（如"按分类汇总支出"、"计算月度消费趋势"、"对比预算与实际支出"）。

### 技术栈约束
3. **技术栈最简可行**：MVP阶段优先选成熟、简单、免费的技术。
   - Mobile → Expo + Supabase 或 Firebase（不要React Native裸项目+自建后端）
   - Web → Next.js + Supabase 或 Vercel
   - 纯前端SPA → Vite + React + LocalStorage
   - 不要同时选多个部署平台
   - infra数组最多2个元素
4. **技术栈只选一个**：每个维度（前端/后端/数据库）只能选一个具体技术。
5. **infra必须与技术栈一致**：
   - 如果用了Supabase → infra只填 ["Supabase"]，不要加Heroku/AWS等
   - 如果用了Firebase → infra只填 ["Firebase"]
   - 如果后端是"无" → infra不能包含自建服务器平台

### BaaS模式约束（Supabase/Firebase）
6. **如果数据库是Supabase或Firebase**（即BaaS模式）：
   - backend字段填"无"
   - apiEndpoints数组留空 [] — BaaS通过客户端SDK直接操作数据库，不需要自建API
   - 安全措施必须提到该BaaS的安全机制（Supabase用RLS策略，Firebase用Security Rules）
   - 不要提到HTTPS/密码哈希 — 这些BaaS平台默认提供
   - dataModels的字段类型要匹配该平台（Supabase用PostgreSQL类型，Firebase用Firestore类型）

### 自建后端模式约束
7. **如果backend不是"无"**（如Express/FastAPI等）：
   - apiEndpoints必须列出具体接口
   - 安全措施要具体（JWT、bcrypt哈希、CORS等）

### 数据模型约束
8. **数据模型一致**：同一实体不要既嵌入子文档又独立建collection。
   - 关系型DB（Supabase/PostgreSQL）→ 用外键关联，列出字段类型如 "amount: decimal(10,2)"
   - 文档型（MongoDB/Firestore）→ 可以嵌入但要合理

## 输出格式（严格JSON）
{
  "businessGoal": "一句话核心目标",
  "userType": "个人/小团队/公众产品",
  "productShape": "Web/Mobile/API/CLI",
  "lifecycle": "验证期/MVP/增长期",
  "ambiguity": "缺失的关键信息",
  "decisionPoints": ["关键决策点1", "关键决策点2"],
  "techStack": {
    "frontend": "具体技术（只选一个）",
    "backend": "具体技术（BaaS模式填'无'）",
    "db": "具体数据库（只选一个）",
    "infra": ["具体部署方案，最多2个，必须与技术栈一致"]
  },
  "coreFeatures": [
    "功能1：具体描述（只包含用户提到的功能，必须可开发，不要模糊描述）"
  ],
  "dataModels": [
    {
      "name": "实体名",
      "fields": ["字段名: 具体类型"]
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET/POST/PUT/DELETE",
      "path": "/api/具体资源名",
      "description": "接口功能"
    }
  ],
  "securityNotes": ["针对所选技术栈的具体安全措施"]
}`;

  try {
    return await callLLMWithJSON<UnifiedIntent>([
      { role: 'system', content: system },
      { role: 'user', content: userInput },
    ], 2, 0.25);
  } catch (error) {
    console.error('inferUnifiedIntent failed, using fallback:', error);
    return getDefaultIntent(userInput);
  }
}

function buildContextExport(
  intent: UnifiedIntent,
  decompose: DecomposeResult,
  userInput: string
): string {
  const tasks = decompose.tasks.map(t =>
    `- **${t.file}** — ${t.responsibility}${t.dependencies.length ? `（依赖：${t.dependencies.join(', ')}）` : ''}`
  ).join('\n');

  const phases = decompose.phases.map(p => {
    const files = decompose.tasks.filter(t => t.phase === p.phase).map(t => t.file);
    return `### Phase ${p.phase}: ${p.label}\n${files.map(f => `- ${f}`).join('\n')}`;
  }).join('\n\n');

  const ts = intent.techStack;

  // 核心功能
  const features = intent.coreFeatures?.length
    ? intent.coreFeatures.map((f, i) => `${i + 1}. ${f}`).join('\n')
    : '待定义';

  // 数据模型
  const models = intent.dataModels?.length
    ? intent.dataModels.map(m =>
      `**${m.name}**\n${m.fields.map(f => `- ${f}`).join('\n')}`
    ).join('\n\n')
    : '无特定数据模型';

  // API接口
  const isBaaS = ts.backend === '无' || ts.backend.toLowerCase() === 'none';
  const apis = intent.apiEndpoints?.length
    ? intent.apiEndpoints.map(a =>
      `- \`${a.method} ${a.path}\` — ${a.description}`
    ).join('\n')
    : isBaaS
    ? '无自建API — 使用客户端SDK直接操作数据库'
    : '无API接口（纯前端应用）';

  // 安全/隐私
  const security = intent.securityNotes?.length
    ? intent.securityNotes.map(s => `- ${s}`).join('\n')
    : '无特殊安全要求';

  // 依赖清单：根据技术栈推断需要安装的包
  const deps: string[] = [];
  const front = ts.frontend.toLowerCase();
  const back = ts.backend.toLowerCase();
  const dbType = ts.db.toLowerCase();

  if (front.includes('next')) deps.push('next', 'react', 'react-dom');
  else if (front.includes('expo')) deps.push('expo', 'react', 'react-native');
  else if (front.includes('react')) deps.push('react', 'react-dom');
  else if (front.includes('vue')) deps.push('vue');

  if (front.includes('tailwind')) deps.push('tailwindcss');

  if (back.includes('express')) deps.push('express');
  if (back.includes('prisma')) deps.push('prisma', '@prisma/client');

  if (dbType.includes('supabase')) deps.push('@supabase/supabase-js');
  else if (dbType.includes('firebase')) deps.push('firebase');
  else if (dbType.includes('prisma') || dbType.includes('postgresql')) deps.push('prisma', '@prisma/client');
  else if (dbType.includes('mongodb')) deps.push('mongodb');

  if (dbType.includes('zod') || front.includes('zod')) deps.push('zod');

  const depList = deps.length
    ? Array.from(new Set(deps)).map(d => `- ${d}`).join('\n')
    : '根据技术栈安装对应依赖';

  return `# ${intent.businessGoal}

## 项目上下文

- **用户**：${intent.userType}
- **形态**：${intent.productShape}
- **阶段**：${intent.lifecycle}
${intent.ambiguity ? `- **待确认**：${intent.ambiguity}` : ''}

## 核心功能

${features}

## 技术栈

- 前端：${ts.frontend}
- 后端：${ts.backend}
- 数据库：${ts.db}
- 基础设施：${ts.infra.join('、')}

## 数据模型

${models}

## API 接口

${apis}

## 安全与隐私

${security}

## 依赖清单

${depList}

## 文件任务

${tasks}

## 开发阶段

${phases}

## 开发约束

- 每个阶段完成后暂停，确认后再继续
- 不修改未列出的文件
- 不引入未列出的依赖
- 遇到歧义先确认再实现
- 严格遵循上述数据模型和API定义`;
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
        try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)); } catch { /* closed */ }
      };
      const sendPing = () => {
        try { controller.enqueue(encoder.encode(`event: ping\ndata: keepalive\n\n`)); } catch { /* ignore */ }
      };

      pingTimer = setInterval(sendPing, HEARTBEAT_MS);

      try {
        const body = await req.json();
        const userInput = body?.userInput;

        if (!userInput || typeof userInput !== 'string' || userInput.trim().length < 2) {
          send({ type: 'error', error: '请输入需求描述' });
          return;
        }

        const input = userInput.trim();

        // Step 1: Intent（带降级）
        send({ type: 'progress', step: 'intent', status: 'running' });
        let intent: UnifiedIntent;
        try {
          intent = await withTimeout(inferUnifiedIntent(input), PER_CALL_TIMEOUT, '意图识别');
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        } catch (err) {
          console.warn('[context-compiler] intent error, using fallback', err);
          intent = getDefaultIntent(input);
          send({ type: 'progress', step: 'intent', status: 'done', result: intent });
        }

        // Step 2: Decompose（带降级）
        send({ type: 'progress', step: 'decompose', status: 'running' });
        let decompose: DecomposeResult;
        try {
          decompose = await withTimeout(decomposeToAtomicTasks(intent, input), PER_CALL_TIMEOUT, '任务拆解');
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        } catch (err) {
          console.warn('[context-compiler] decompose error, using fallback', err);
          const simpleIntent: IntentResult = {
            businessGoal: intent.businessGoal,
            userType: intent.userType,
            productShape: intent.productShape,
            lifecycle: intent.lifecycle,
            ambiguity: intent.ambiguity,
            decisionPoints: intent.decisionPoints,
            techStack: intent.techStack,
          };
          decompose = await decomposeToAtomicTasks(simpleIntent, input);
          send({ type: 'progress', step: 'decompose', status: 'done', result: decompose });
        }

        // Step 3: Compile
        send({ type: 'progress', step: 'compile', status: 'running' });
        const prompt = buildContextExport(intent, decompose, input);
        send({ type: 'progress', step: 'compile', status: 'done' });

        send({ type: 'done', prompt, intent, decompose });
      } catch (err) {
        const msg = err instanceof Error ? err.message : '生成失败';
        send({ type: 'error', error: msg });
      } finally {
        if (pingTimer) clearInterval(pingTimer);
        try { controller.close(); } catch { /* closed */ }
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
