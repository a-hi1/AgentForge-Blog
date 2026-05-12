export type IssueCategory =
  | 'nextjs_error'
  | 'typescript_error'
  | 'react_error'
  | 'supabase_error'
  | 'auth_error'
  | 'build_error'
  | 'hydration_error'
  | 'vercel_deploy'
  | 'css_styling'
  | 'api_error'
  | 'general';

export interface IssueDetection {
  category: IssueCategory;
  label: string;
  confidence: number;
  matchedPatterns: string[];
}

export interface FixPrompt {
  category: IssueCategory;
  label: string;
  prompt: string;
  diagnostics: string[];
}

const ISSUE_PATTERNS: { category: IssueCategory; label: string; patterns: string[] }[] = [
  {
    category: 'hydration_error',
    label: 'Hydration 错误',
    patterns: ['hydration', 'hydrat', 'did not match', 'server rendered', 'client-hydration', 'text content does not match', 'suppressHydrationWarning'],
  },
  {
    category: 'nextjs_error',
    label: 'Next.js 框架错误',
    patterns: ['next', 'app router', 'page.tsx', 'layout.tsx', 'nextjs', 'next.js', 'server component', 'use server', 'use client', 'dynamic server usage'],
  },
  {
    category: 'typescript_error',
    label: 'TypeScript 类型错误',
    patterns: ['typescript', 'type error', 'ts(', 'ts2', 'type assertion', 'generic', 'interface', '类型', 'no overload', 'incompatible type'],
  },
  {
    category: 'react_error',
    label: 'React 运行时错误',
    patterns: ['react', 'hooks', 'useeffect', 'usestate', 'render', 'jsx', 'component', 're-render', 'infinite loop', 'maximum update depth'],
  },
  {
    category: 'supabase_error',
    label: 'Supabase 错误',
    patterns: ['supabase', 'supabaseKey', 'supabaseUrl', 'createClient', 'row level security', 'rls', 'postgres', 'postgresql', 'policy'],
  },
  {
    category: 'auth_error',
    label: '认证/授权错误',
    patterns: ['auth', 'jwt', 'token', 'session', 'login', 'unauthorized', 'forbidden', '401', '403', 'nextauth', 'oauth'],
  },
  {
    category: 'build_error',
    label: '构建错误',
    patterns: ['build', 'compile', 'webpack', 'module not found', 'cannot find module', 'syntax error', 'unexpected token', 'esbuild', 'turbo'],
  },
  {
    category: 'vercel_deploy',
    label: 'Vercel 部署错误',
    patterns: ['vercel', 'deploy', 'deployment', 'edge runtime', 'serverless', 'function timeout', 'cold start', 'size limit'],
  },
  {
    category: 'css_styling',
    label: 'CSS/样式错误',
    patterns: ['tailwind', 'css', 'style', 'className', 'responsive', 'layout', 'flex', 'grid', 'overflow', 'z-index'],
  },
  {
    category: 'api_error',
    label: 'API 错误',
    patterns: ['api', 'fetch', 'axios', 'cors', '500', '404', 'endpoint', 'request', 'response', 'timeout', 'network'],
  },
];

export function detectIssue(input: string): IssueDetection {
  const lower = input.toLowerCase();
  const scores: { category: IssueCategory; label: string; score: number; matched: string[] }[] = [];

  for (const pattern of ISSUE_PATTERNS) {
    const matched = pattern.patterns.filter(p => lower.includes(p));
    if (matched.length > 0) {
      scores.push({
        category: pattern.category,
        label: pattern.label,
        score: matched.length,
        matched,
      });
    }
  }

  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0) {
    return {
      category: 'general',
      label: '通用问题',
      confidence: 30,
      matchedPatterns: [],
    };
  }

  const best = scores[0];
  return {
    category: best.category,
    label: best.label,
    confidence: Math.min(95, 40 + best.score * 15),
    matchedPatterns: best.matched,
  };
}

function buildFixPromptLocal(input: string, detection: IssueDetection): string {
  const categoryInstructions: Record<IssueCategory, string> = {
    hydration_error: `# 问题分类：React Hydration 不匹配

## 问题分析
Hydration 错误表示服务端渲染的 HTML 与客户端 React 挂载时的输出不一致。常见原因：
1. 使用了 \`typeof window !== 'undefined'\` 等客户端判断
2. 时间相关操作（Date.now()、new Date()）在服务端和客户端产生不同值
3. 随机数或 Math.random() 在两端不一致
4. 第三方库在 SSR 时产生不同输出
5. 浏览器扩展修改了 DOM

## 定位路径
- 检查报错组件中的条件渲染逻辑
- 查找 useEffect 内应该执行但被放在渲染中的代码
- 检查是否有 localStorage/sessionStorage 直接在渲染中读取
- 检查 suppressHydrationWarning 是否被滥用

## 修改范围
- 将客户端特定逻辑移入 useEffect
- 使用 \`next/dynamic\` 的 \`{ ssr: false }\` 选项避免 SSR
- 对时间显示使用固定格式或延迟渲染
- 使用 React.lazy + Suspense 包装不兼容 SSR 的组件

## 禁止改动
- 不要使用 suppressHydrationWarning 掩盖真实问题
- 不要移除 SSR 能力来规避问题

## 验收标准
- 控制台无 Hydration 警告
- 服务端和客户端渲染结果一致
- 页面首次加载无闪烁`,

    nextjs_error: `# 问题分类：Next.js 框架错误

## 问题分析
Next.js App Router 的常见错误包括：
1. Server Component 中使用了客户端 API（如 useState、useEffect）
2. 动态路由参数类型不匹配
3. API Route 的请求/响应处理不当
4. 中间件配置错误
5. 静态生成和动态渲染的冲突

## 定位路径
- 确认报错文件是否添加了 'use client' 指令
- 检查 Server Component 的 import 链是否混入客户端组件
- 查看 Next.js 的错误页面获取详细堆栈
- 检查 middleware.ts 的匹配规则

## 修改范围
- 在需要客户端功能的组件顶部添加 'use client'
- 使用 \`next/dynamic\` 动态导入客户端组件
- 确保 API Route 正确处理 async params
- 使用正确的 HTTP 方法（GET/POST/PUT/DELETE）

## 禁止改动
- 不要将整个应用改为客户端渲染
- 不要移除 TypeScript 严格模式

## 验收标准
- TypeScript 编译 0 错误
- 页面正常渲染，无 500 错误
- API 端点可用 Postman 测试通过`,

    typescript_error: `# 问题分类：TypeScript 类型错误

## 问题分析
常见 TypeScript 错误：
1. 类型不匹配（Type 'X' is not assignable to type 'Y'）
2. 可选属性未做空值检查
3. 泛型约束不满足
4. 接口定义与实际数据结构不一致
5. 第三方库缺少类型声明

## 定位路径
- 读取 tsconfig.json 确认 strict 模式配置
- 查看错误的完整类型链路
- 检查类型断言是否合理
- 确认第三方库的 @types 包版本

## 修改范围
- 添加精确的类型定义，避免 any
- 使用类型守卫（type guard）处理联合类型
- 使用 satisfies 替代 as 进行类型校验
- 为第三方库创建 .d.ts 声明文件

## 禁止改动
- 不要使用 @ts-ignore 或 @ts-expect-error 掩盖错误
- 不要关闭 strict 模式
- 不要使用 any 作为逃生舱

## 验收标准
- npx tsc --noEmit 输出 0 错误
- 所有函数参数和返回值都有明确类型
- 无 any 类型使用`,

    react_error: `# 问题分类：React 运行时错误

## 问题分析
常见 React 错误：
1. Hooks 调用规则违反（条件调用、循环调用）
2. useEffect 依赖数组缺失或不正确
3. 状态更新导致无限渲染循环
4. 组件卸载后的状态更新
5. 错误边界未捕获的异常

## 定位路径
- 查看浏览器控制台的 React 错误边界信息
- 检查 useEffect 的依赖数组
- 查找 setState 是否在渲染过程中被调用
- 使用 React DevTools Profiler 分析渲染性能

## 修改范围
- 修复 Hooks 调用顺序
- 正确设置 useEffect 依赖数组
- 使用 useCallback/useMemo 优化重渲染
- 添加 cleanup 函数防止内存泄漏

## 禁止改动
- 不要使用 dangerouslySetInnerHTML
- 不要跳过 ESLint 的 hooks 规则

## 验收标准
- 控制台无 React 警告
- 组件渲染次数合理
- 无内存泄漏`,

    supabase_error: `# 问题分类：Supabase 配置/连接错误

## 问题分析
常见 Supabase 错误：
1. supabaseKey 或 supabaseUrl 未配置或为空
2. 模块顶层调用 createClient 导致 SSR 崩溃
3. RLS 策略配置不当导致查询返回空
4. 数据库迁移未执行
5. 连接池配置不合理

## 定位路径
- 检查 .env.local 中 SUPABASE_URL 和 SUPABASE_ANON_KEY 是否正确
- 确认 createClient 是否在函数内调用（非模块顶层）
- 查看 Supabase Dashboard 的 SQL Editor 测试查询
- 检查 RLS 策略是否允许当前角色的访问

## 修改范围
- 使用懒加载模式初始化 Supabase 客户端
- 在所有数据库操作前检查 isSupabaseConfigured()
- 为每个表创建合适的 RLS 策略
- 添加优雅降级（Supabase 不可用时不崩溃）

## 禁止改动
- 不要禁用 RLS 来绕过权限问题
- 不要在客户端代码中使用 service_role key

## 验收标准
- 无环境变量缺失导致的崩溃
- RLS 策略正确保护数据
- 数据库操作有错误处理`,

    auth_error: `# 问题分类：认证/授权错误

## 问题分析
常见认证错误：
1. JWT Token 过期或格式错误
2. Session 管理不当
3. OAuth 回调配置错误
4. 权限检查遗漏
5. CORS 配置阻止认证请求

## 定位路径
- 检查 Token 的生成、传递和验证流程
- 确认 Session 存储和读取逻辑
- 查看 OAuth Provider 的回调 URL 配置
- 检查 API Route 的认证中间件

## 修改范围
- 实现 Token 刷新机制
- 添加统一的认证中间件
- 配置正确的 CORS 策略
- 实现权限检查装饰器

## 禁止改动
- 不要在客户端存储敏感信息
- 不要跳过 HTTPS 要求

## 验收标准
- 登录/登出流程正常
- Token 过期后自动刷新
- 未认证用户被正确拦截`,

    build_error: `# 问题分类：构建/编译错误

## 问题分析
常见构建错误：
1. 模块找不到（Module not found）
2. 语法错误（Syntax Error）
3. Webpack/Turbopack 配置问题
4. 依赖版本冲突
5. 环境变量未正确注入

## 定位路径
- 查看完整的构建错误输出
- 检查 import 路径是否正确
- 确认 node_modules 是否完整
- 检查 package.json 的依赖版本

## 修改范围
- 修复 import 路径（区分大小写）
- 清理 .next 缓存目录后重新构建
- 更新冲突的依赖版本
- 检查 tsconfig.json 的 paths 配置

## 禁止改动
- 不要降级 TypeScript 版本来绕过错误
- 不要修改 next.config.js 的 webpack 配置（除非必要）

## 验收标准
- npm run build 输出 0 错误
- 所有页面正确编译
- 无 TypeScript 类型错误`,

    vercel_deploy: `# 问题分类：Vercel 部署错误

## 问题分析
常见 Vercel 部署错误：
1. 环境变量未在 Vercel Dashboard 配置
2. Edge Runtime 不兼容某些 Node.js API
3. 函数大小超过限制
4. 冷启动超时
5. Serverless Function 执行超时

## 定位路径
- 查看 Vercel Dashboard 的 Deployment Logs
- 检查 Functions 标签页的错误信息
- 确认 Environment Variables 配置
- 检查 vercel.json 配置

## 修改范围
- 在 Vercel Dashboard 配置所有必要的环境变量
- 将不兼容 Edge Runtime 的代码改为 Node.js Runtime
- 优化函数大小（移除不必要的依赖）
- 使用 Streaming Response 处理长时间任务

## 禁止改动
- 不要将 service_role key 暴露给客户端
- 不要禁用 Build Checks

## 验收标准
- 部署成功无错误
- 所有环境变量正确注入
- 页面可正常访问`,

    css_styling: `# 问题分类：CSS/样式问题

## 问题分析
常见样式问题：
1. Tailwind CSS 类名不生效
2. 响应式布局在某些断点异常
3. z-index 层级冲突
4. 溢出（overflow）导致布局错乱
5. 暗色/亮色主题切换问题

## 定位路径
- 使用浏览器 DevTools 检查元素样式
- 查看 Tailwind 的编译输出是否包含该类
- 检查父容器的 overflow 和 position 属性
- 确认 CSS 优先级和层叠顺序

## 修改范围
- 使用 Tailwind 的 responsive 前缀处理断点
- 使用 CSS 变量统一管理主题色
- 使用 relative/absolute 定位配合 z-index
- 使用 clamp() 或 min/max 处理响应式尺寸

## 禁止改动
- 不要使用 !important 强制覆盖
- 不要内联大量样式

## 验收标准
- 移动端和桌面端布局正确
- 无溢出或裁切问题
- 主题切换正常`,

    api_error: `# 问题分类：API 调用错误

## 问题分析
常见 API 错误：
1. CORS 跨域请求被阻止
2. 请求超时
3. 响应格式不正确
4. 状态码处理不当
5. 网络连接问题

## 定位路径
- 查看浏览器 Network 面板的请求详情
- 检查请求 URL、Method、Headers
- 查看服务端日志
- 确认 API 端点是否正确

## 修改范围
- 添加统一的错误处理中间件
- 实现请求重试机制
- 配置正确的 CORS 策略
- 添加请求/响应拦截器

## 禁止改动
- 不要在前端硬编码 API Key
- 不要忽略错误状态码

## 验收标准
- API 调用有超时和重试机制
- 错误信息对用户友好
- 无 CORS 错误`,

    general: `# 问题分类：通用技术问题

## 问题分析
请提供以下信息以便精确定位：
1. 完整的错误信息或截图
2. 复现步骤
3. 期望行为 vs 实际行为
4. 相关代码片段

## 定位路径
- 检查浏览器控制台和终端输出
- 查看最近的代码变更
- 使用二分法定位问题代码

## 修改范围
- 根据具体错误类型确定

## 验收标准
- 问题不再复现
- 相关功能正常工作`,
  };

  const instruction = categoryInstructions[detection.category] || categoryInstructions.general;

  return `你是一位高级全栈工程师，专注于问题诊断和修复。

${instruction}

---

当前问题描述：
${input}

${detection.matchedPatterns.length > 0 ? `识别到的关键模式：${detection.matchedPatterns.join(', ')}` : ''}

请基于以上分析，输出一份完整的修复 Prompt：

1. 精确定位问题根因
2. 给出最小修改范围的修复方案
3. 列出修改的文件和具体改动
4. 提供验证步骤

要求：
- 所有解释使用中文
- 代码标识符允许英文
- 修复方案必须是最小改动原则
- 必须包含回归测试建议`;
}

const FIX_SYSTEM_PROMPT = `你是一位高级全栈工程师和问题诊断专家。

你的任务是根据用户提供的错误信息，生成一份完整的修复 Prompt。

输出格式要求：
1. 使用简体中文
2. 结构清晰，分步骤说明
3. 包含具体的代码修改建议
4. 包含验证和回归测试建议

禁止输出泛化建议，必须针对具体问题给出可执行的修复方案。`;

export async function generateFixPrompt(input: string): Promise<FixPrompt> {
  const detection = detectIssue(input);
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return {
      category: detection.category,
      label: detection.label,
      prompt: buildFixPromptLocal(input, detection),
      diagnostics: [
        `识别类型：${detection.label}（确信度 ${detection.confidence}%）`,
        `匹配模式：${detection.matchedPatterns.join(', ') || '无'}`,
        '注意：LLM API 未配置，使用本地规则生成修复方案',
      ],
    };
  }

  try {
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://open.bigmodel.cn/api/paas/v4';
    const model = process.env.OPENAI_MODEL || 'glm-4-flash';

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: FIX_SYSTEM_PROMPT },
          { role: 'user', content: buildFixPromptLocal(input, detection) },
        ],
        temperature: 0.3,
        max_tokens: 3000,
      }),
    });

    if (!response.ok) {
      return {
        category: detection.category,
        label: detection.label,
        prompt: buildFixPromptLocal(input, detection),
        diagnostics: [`识别类型：${detection.label}`, `LLM 调用失败 (${response.status})，使用本地规则`],
      };
    }

    const result = await response.json();
    const content = result.choices?.[0]?.message?.content || '';

    return {
      category: detection.category,
      label: detection.label,
      prompt: content || buildFixPromptLocal(input, detection),
      diagnostics: [
        `识别类型：${detection.label}（确信度 ${detection.confidence}%）`,
        `匹配模式：${detection.matchedPatterns.join(', ') || '无'}`,
        `生成方式：LLM 智能分析`,
      ],
    };
  } catch {
    return {
      category: detection.category,
      label: detection.label,
      prompt: buildFixPromptLocal(input, detection),
      diagnostics: [`识别类型：${detection.label}`, 'LLM 调用异常，使用本地规则'],
    };
  }
}
