import { callLLMWithJSON } from './llm';

export type ReasoningStepType = 'intent' | 'decompose' | 'compile';

export interface IntentResult {
  businessGoal: string;
  userType: string;
  productShape: string;
  lifecycle: string;
  ambiguity: string;
  decisionPoints: string[];
  techStack?: {
    frontend: string;
    backend: string;
    db: string;
    infra?: string[];
  };
}

export interface AtomicTask {
  phase: number;
  phaseLabel: string;
  file: string;
  responsibility: string;
  input: string;
  output: string;
  dependencies: string[];
}

export interface DecomposeResult {
  tasks: AtomicTask[];
  phases: { phase: number; label: string; files: string[] }[];
}

export interface ReasoningStep {
  type: ReasoningStepType;
  label: string;
  result: IntentResult | DecomposeResult | string;
  status: 'done' | 'error';
}

// 降级用的默认任务模板（Next.js Web项目）
function getDefaultDecompose(businessGoal?: string): DecomposeResult {
  const goal = businessGoal || '应用';
  return {
    tasks: [
      {
        phase: 1,
        phaseLabel: "项目初始化",
        file: "package.json",
        responsibility: `${goal}项目配置和依赖管理`,
        input: "项目需求",
        output: "依赖配置",
        dependencies: []
      },
      {
        phase: 1,
        phaseLabel: "项目初始化",
        file: "app/layout.tsx",
        responsibility: "根布局组件，包含全局样式和元数据",
        input: "页面组件",
        output: "布局结构",
        dependencies: []
      },
      {
        phase: 2,
        phaseLabel: "核心功能",
        file: "types/index.ts",
        responsibility: "TypeScript类型定义",
        input: "业务需求",
        output: "类型定义",
        dependencies: []
      },
      {
        phase: 2,
        phaseLabel: "核心功能",
        file: "lib/db.ts",
        responsibility: "数据库连接和基础操作",
        input: "业务逻辑",
        output: "数据访问层",
        dependencies: ["types/index.ts"]
      },
      {
        phase: 3,
        phaseLabel: "UI组件",
        file: "components/Header.tsx",
        responsibility: "页面头部导航组件",
        input: "路由状态",
        output: "导航界面",
        dependencies: ["types/index.ts"]
      },
      {
        phase: 3,
        phaseLabel: "UI组件",
        file: "app/page.tsx",
        responsibility: `${goal}首页`,
        input: "路由",
        output: "页面内容",
        dependencies: ["components/Header.tsx", "lib/db.ts"]
      },
      {
        phase: 4,
        phaseLabel: "API接口",
        file: "app/api/data/route.ts",
        responsibility: "核心数据CRUD接口",
        input: "HTTP请求",
        output: "JSON响应",
        dependencies: ["lib/db.ts", "types/index.ts"]
      }
    ],
    phases: [
      { phase: 1, label: "项目初始化", files: ["package.json", "app/layout.tsx"] },
      { phase: 2, label: "核心功能", files: ["types/index.ts", "lib/db.ts"] },
      { phase: 3, label: "UI组件", files: ["components/Header.tsx", "app/page.tsx"] },
      { phase: 4, label: "API接口", files: ["app/api/data/route.ts"] }
    ]
  };
}

export async function inferIntent(userInput: string): Promise<IntentResult> {
  const system = `你是产品技术顾问。分析用户想法，输出JSON：

{
  "businessGoal": "用户想解决的核心问题",
  "userType": "个人/小团队/公众产品",
  "productShape": "Web/Mobile/API/CLI",
  "lifecycle": "验证期/MVP/增长期",
  "ambiguity": "缺失的关键信息",
  "decisionPoints": ["关键线索1", "关键线索2"]
}`;

  try {
    return await callLLMWithJSON<IntentResult>([
      { role: 'system', content: system },
      { role: 'user', content: userInput },
    ], 2, 0.25);
  } catch (error) {
    console.error('inferIntent failed, using fallback:', error);
    // 降级返回默认值
    return {
      businessGoal: userInput,
      userType: "个人项目",
      productShape: "Web",
      lifecycle: "验证期",
      ambiguity: "需要更多细节",
      decisionPoints: [userInput]
    };
  }
}

export async function decomposeToAtomicTasks(
  intent: IntentResult,
  userInput: string
): Promise<DecomposeResult> {
  const system = `你是高级全栈工程师。把需求拆解为具体的开发任务。

## 重要规则
1. 文件名必须具体有意义，不要用 xxx.ts 这种占位符
2. 每个文件的职责要明确到具体做什么，不要泛泛而谈
3. 依赖关系要准确，指向实际的文件路径
4. 阶段划分要合理：先基础设施 → 核心逻辑 → UI → 测试
5. 文件结构必须匹配所选技术栈的框架惯例：
   - Expo/React Native → app/(tabs)/, components/, hooks/, services/, types/
   - Next.js → app/, components/, lib/, types/
   - Vite+React → src/views/, src/components/, src/services/, src/types/
   - 不要一律用 src/utils/ 这种通用结构
6. MVP阶段最小化文件数量，不要过度拆分
7. 必须包含导航/路由/入口结构文件
8. 不要创建用户需求中未提到的功能对应的文件

## 输出格式（严格JSON）
{
  "tasks": [{
    "phase": 1,
    "phaseLabel": "阶段名称",
    "file": "具体文件路径.tsx",
    "responsibility": "具体做什么（不要泛泛而谈）",
    "input": "输入什么",
    "output": "输出什么",
    "dependencies": ["具体的依赖文件路径"]
  }],
  "phases": [{
    "phase": 1,
    "label": "阶段名称",
    "files": ["具体文件1", "具体文件2"]
  }]
}`;

  const ts = intent.techStack;
  const techInfo = ts ? `前端=${ts.frontend}, 后端=${ts.backend}, 数据库=${ts.db}` : '未指定';
  const userMessage = `需求：${userInput}
目标：${intent.businessGoal}
用户：${intent.userType}
形态：${intent.productShape}
阶段：${intent.lifecycle}
技术栈：${techInfo}`;

  try {
    return await callLLMWithJSON<DecomposeResult>([
      { role: 'system', content: system },
      { role: 'user', content: userMessage },
    ], 2, 0.3);
  } catch (error) {
    console.error('decomposeToAtomicTasks failed, using fallback:', error);
    return getDefaultDecompose(intent.businessGoal);
  }
}
