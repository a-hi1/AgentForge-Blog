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

## 约束规则（必须严格遵守）
1. **只做用户要求的功能**：不要自行添加用户没提到的功能。coreFeatures数量应与用户描述的核心功能数量一致，不要凑数。
2. **技术栈最简可行**：MVP阶段优先选成熟、简单、免费的技术。
   - Mobile → Expo + Supabase 或 Firebase（不要React Native裸项目+自建后端）
   - Web → Next.js + Supabase 或 Vercel
   - 纯前端SPA → Vite + React + LocalStorage
   - 不要同时选多个部署平台（如同时用Amplify和Heroku）
   - infra数组最多2个元素
3. **技术栈只选一个**：每个维度（前端/后端/数据库）只能选一个具体技术，不要给"或"的选项
4. **数据模型一致**：同一实体不要既嵌入子文档又独立建collection。如果用关系型DB（Supabase/PostgreSQL），用外键关联；如果用文档型（MongoDB/Firestore），可以嵌入但要合理
5. **API路径用实际资源名**：不要用 \`{userId}\` 等占位符，用具体路径如 \`/api/transactions\`
6. **如果有安全/隐私要求**：给出具体方案

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
    "backend": "具体技术（只选一个，纯前端填'无'）",
    "db": "具体数据库（只选一个）",
    "infra": ["具体部署方案，最多2个"]
  },
  "coreFeatures": [
    "功能1：具体描述（只包含用户提到的功能）"
  ],
  "dataModels": [
    {
      "name": "实体名",
      "fields": ["字段名: 类型", "字段名: 类型"]
    }
  ],
  "apiEndpoints": [
    {
      "method": "GET/POST/PUT/DELETE",
      "path": "/api/具体资源名",
      "description": "接口功能"
    }
  ],
  "securityNotes": ["具体安全措施"]
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
  const apis = intent.apiEndpoints?.length
    ? intent.apiEndpoints.map(a =>
      `- \`${a.method} ${a.path}\` — ${a.description}`
    ).join('\n')
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
