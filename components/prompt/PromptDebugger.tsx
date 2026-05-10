'use client';

import { useState } from 'react';

export type ErrorCategory =
  | 'frontend-ui'
  | 'backend-logic'
  | 'api'
  | 'database'
  | 'deploy'
  | 'performance'
  | 'prompt-ambiguity';

export interface DebugResult {
  category: ErrorCategory;
  categoryLabel: string;
  attribution: string;
  errorFragment: string;
  fixSuggestions: string[];
  fixedPrompt: string;
  confidence: number;
}

const CATEGORY_CONFIG: Record<ErrorCategory, { label: string; icon: string; color: string }> = {
  'frontend-ui': { label: '前端 UI', icon: '🎨', color: 'text-pink-400 bg-pink-500/10 border-pink-500/30' },
  'backend-logic': { label: '后端逻辑', icon: '⚙️', color: 'text-blue-400 bg-blue-500/10 border-blue-500/30' },
  'api': { label: 'API', icon: '🔌', color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30' },
  'database': { label: '数据库', icon: '🗄️', color: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  'deploy': { label: '部署', icon: '🚀', color: 'text-green-400 bg-green-500/10 border-green-500/30' },
  'performance': { label: '性能', icon: '⚡', color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30' },
  'prompt-ambiguity': { label: 'Prompt 表达歧义', icon: '💬', color: 'text-purple-400 bg-purple-500/10 border-purple-500/30' },
};

const ERROR_PATTERNS: { pattern: RegExp; category: ErrorCategory; attribution: string; fragmentHint: string; suggestions: string[] }[] = [
  {
    pattern: /样式|布局|css|ui|界面|显示|渲染|组件|响应式|移动端|居中|对齐|间距/i,
    category: 'frontend-ui',
    attribution: '前端 UI 渲染或样式问题，Prompt 中对 UI 细节描述不够精确',
    fragmentHint: '涉及样式/布局/UI 相关的指令片段',
    suggestions: [
      '明确指定 UI 框架（如 Tailwind CSS、Ant Design）',
      '详细描述目标 UI 的具体样式参数',
      '提供参考截图或设计稿描述',
      '指定响应式断点和适配要求',
    ],
  },
  {
    pattern: /接口|api|请求|http|fetch|axios|restful|graphql|endpoint|路由|cors|404|500|401|403/i,
    category: 'api',
    attribution: 'API 接口调用或路由配置问题，Prompt 缺少接口规范描述',
    fragmentHint: '涉及 API/接口/请求 的指令片段',
    suggestions: [
      '明确指定 API 端点路径和 HTTP 方法',
      '定义请求/响应的数据结构（Schema）',
      '说明认证方式和权限要求',
      '添加错误处理和重试策略',
    ],
  },
  {
    pattern: /数据库|sql|查询|表|字段|索引|迁移|supabase|postgres|mysql|mongo|事务|锁|死锁/i,
    category: 'database',
    attribution: '数据库操作或数据模型问题，Prompt 对数据结构定义不完整',
    fragmentHint: '涉及数据库/表/查询 的指令片段',
    suggestions: [
      '明确指定数据库类型和版本',
      '定义完整的表结构和字段类型',
      '说明索引策略和查询优化需求',
      '描述数据迁移和回滚方案',
    ],
  },
  {
    pattern: /部署|发布|ci|cd|docker|vercel|nginx|域名|ssl|环境变量|构建|打包|上线/i,
    category: 'deploy',
    attribution: '部署流程或环境配置问题，Prompt 缺少部署环境的具体描述',
    fragmentHint: '涉及部署/发布/环境 的指令片段',
    suggestions: [
      '明确目标部署平台（Vercel、AWS、自建服务器）',
      '列出所有必需的环境变量',
      '描述 CI/CD 流程要求',
      '说明域名和 SSL 配置需求',
    ],
  },
  {
    pattern: /性能|慢|卡顿|超时|内存|cpu|缓存|懒加载|优化|渲染速度|白屏|首屏/i,
    category: 'performance',
    attribution: '性能瓶颈问题，Prompt 未设定明确的性能目标和约束',
    fragmentHint: '涉及性能/速度/优化 的指令片段',
    suggestions: [
      '设定具体的性能指标（如 LCP < 2.5s）',
      '明确数据量级和并发要求',
      '指定缓存策略和失效机制',
      '描述性能测试和监控方案',
    ],
  },
  {
    pattern: /逻辑|条件|判断|计算|算法|流程|状态|bug|错误|异常|undefined|null|类型|类型错误/i,
    category: 'backend-logic',
    attribution: '后端业务逻辑错误，Prompt 对业务规则描述存在歧义或遗漏',
    fragmentHint: '涉及业务逻辑/条件判断/状态管理 的指令片段',
    suggestions: [
      '用伪代码或流程图描述核心业务逻辑',
      '列出所有边界条件和异常情况',
      '明确状态转换规则',
      '添加输入验证和错误处理要求',
    ],
  },
  {
    pattern: /不明确|不清楚|模糊|歧义|理解错误|不是我想要|偏差|偏离|预期不符|结果不对/i,
    category: 'prompt-ambiguity',
    attribution: 'Prompt 表述存在歧义，AI 对意图理解偏差',
    fragmentHint: '表述模糊或存在多种理解方式的指令片段',
    suggestions: [
      '使用具体数字替代模糊描述（如"少量"→"最多5个"）',
      '提供输入/输出示例（Few-shot）',
      '明确排除不需要的行为',
      '使用结构化格式（Markdown 列表/表格）组织 Prompt',
    ],
  },
];

function classifyError(errorDesc: string): { category: ErrorCategory; attribution: string; fragmentHint: string; suggestions: string[] } {
  for (const p of ERROR_PATTERNS) {
    if (p.pattern.test(errorDesc)) {
      return { category: p.category, attribution: p.attribution, fragmentHint: p.fragmentHint, suggestions: p.suggestions };
    }
  }
  return {
    category: 'prompt-ambiguity',
    attribution: '无法精确归因，建议从 Prompt 表述清晰度入手',
    fragmentHint: '整体 Prompt 结构',
    suggestions: [
      '重新审视需求描述的完整性',
      '将复杂任务拆分为多个子任务',
      '添加具体的验收标准',
      '提供参考实现或示例',
    ],
  };
}

function extractErrorFragment(errorDesc: string): string {
  const lines = errorDesc.split('\n').filter(l => l.trim());
  const errorLines = lines.filter(l =>
    /error|错误|fail|失败|exception|异常|undefined|null|cannot|unable|bug/i.test(l)
  );
  if (errorLines.length > 0) return errorLines.slice(0, 3).join('\n');
  if (lines.length <= 3) return errorDesc;
  return lines.slice(0, 3).join('\n') + '\n...';
}

function generateFixedPrompt(errorDesc: string, category: ErrorCategory): string {
  const cfg = CATEGORY_CONFIG[category];
  return `## 修复版 Prompt

### 角色
你是一位专业的 ${cfg.label} 工程师，擅长诊断和修复相关问题。

### 任务
请分析并修复以下问题：

${errorDesc.split('\n').map(l => `> ${l}`).join('\n')}

### 要求
1. 首先定位问题根因
2. 提供最小化的修复方案
3. 确保修复不会引入新问题
4. 添加必要的错误处理

### 输出格式
- **问题分析**：简述根因
- **修复方案**：具体的代码/配置变更
- **验证步骤**：如何确认修复成功
- **预防措施**：如何避免类似问题`;
}

interface PromptDebuggerProps {
  initialError?: string;
  onApplyFix?: (fixedPrompt: string) => void;
}

export default function PromptDebugger({ initialError = '', onApplyFix }: PromptDebuggerProps) {
  const [errorInput, setErrorInput] = useState(initialError);
  const [debugResult, setDebugResult] = useState<DebugResult | null>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    if (!errorInput.trim()) return;
    setAnalyzing(true);

    await new Promise(r => setTimeout(r, 800));

    const classification = classifyError(errorInput);
    const result: DebugResult = {
      category: classification.category,
      categoryLabel: CATEGORY_CONFIG[classification.category].label,
      attribution: classification.attribution,
      errorFragment: extractErrorFragment(errorInput),
      fixSuggestions: classification.suggestions,
      fixedPrompt: generateFixedPrompt(errorInput, classification.category),
      confidence: errorInput.length > 50 ? 85 : 65,
    };

    setDebugResult(result);
    setAnalyzing(false);
  };

  return (
    <div className="space-y-6">
      <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50">
        <h2 className="text-lg font-bold text-white mb-4">Prompt Debugger</h2>
        <p className="text-sm text-gray-400 mb-4">粘贴 Agent 执行失败描述，自动分析问题根因并生成修复版 Prompt</p>
        <textarea
          value={errorInput}
          onChange={e => setErrorInput(e.target.value)}
          placeholder="粘贴错误信息、执行失败描述、或不理想的执行结果..."
          className="w-full h-40 px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none font-mono"
        />
        <button
          onClick={handleAnalyze}
          disabled={!errorInput.trim() || analyzing}
          className="mt-3 px-6 py-2.5 rounded-lg bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-500 hover:to-orange-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium transition-all"
        >
          {analyzing ? '分析中...' : '🔍 分析问题'}
        </button>
      </div>

      {debugResult && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl bg-slate-900/40 border border-slate-700/50">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-white">问题归因</h3>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2.5 py-1 rounded-full border ${CATEGORY_CONFIG[debugResult.category].color}`}>
                  {CATEGORY_CONFIG[debugResult.category].icon} {debugResult.categoryLabel}
                </span>
                <span className="text-xs text-gray-500">置信度 {debugResult.confidence}%</span>
              </div>
            </div>
            <p className="text-sm text-gray-300">{debugResult.attribution}</p>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-red-500/20">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              错误片段定位
            </h3>
            <pre className="text-sm text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg p-4 font-mono whitespace-pre-wrap">
              {debugResult.errorFragment}
            </pre>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-yellow-500/20">
            <h3 className="text-base font-bold text-white mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              修复建议
            </h3>
            <ul className="space-y-2">
              {debugResult.fixSuggestions.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-yellow-400 mt-0.5 shrink-0">{i + 1}.</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          <div className="p-5 rounded-xl bg-slate-900/40 border border-green-500/20">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                完整修复版 Prompt
              </h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(debugResult.fixedPrompt);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-gray-300 text-xs transition-colors"
                >
                  复制
                </button>
                {onApplyFix && (
                  <button
                    onClick={() => onApplyFix(debugResult.fixedPrompt)}
                    className="px-3 py-1.5 rounded-lg bg-green-600/20 hover:bg-green-600/30 border border-green-500/30 text-green-400 text-xs transition-colors"
                  >
                    应用修复
                  </button>
                )}
              </div>
            </div>
            <pre className="text-sm text-gray-300 bg-green-500/5 border border-green-500/20 rounded-lg p-4 whitespace-pre-wrap font-sans">
              {debugResult.fixedPrompt}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
