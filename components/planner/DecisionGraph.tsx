'use client';

import { memo, useState, useMemo, type ReactNode } from 'react';

interface DecisionNode {
  id: string;
  label: string;
  icon: ReactNode;
  detail: string;
  status: 'done' | 'active' | 'skipped';
}

interface DecisionGraphProps {
  prompt?: string;
  steps?: { agent: string; task: string; status: string }[];
  domain?: string;
  memoryInfluenced?: boolean;
  memoryCount?: number;
}

const iconProps = {
  className: 'w-3.5 h-3.5',
  fill: 'none',
  stroke: 'currentColor',
  viewBox: '0 0 24 24',
  'aria-hidden': true as const,
};

function DocIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  );
}

function BrainIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function BoltIcon() {
  return (
    <svg {...iconProps}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
    </svg>
  );
}

function DecisionGraph({ prompt, steps = [], domain, memoryInfluenced, memoryCount }: DecisionGraphProps) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const nodes: DecisionNode[] = useMemo(() => {
    const hasSteps = steps.length > 0;
    const detectedDomain = domain || detectDomainFromPrompt(prompt || '');

    return [
      {
        id: 'prompt',
        label: '需求解析',
        icon: <DocIcon />,
        detail: prompt ? `输入: "${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}"` : '等待输入',
        status: prompt ? 'done' : 'skipped',
      },
      {
        id: 'domain',
        label: '领域识别',
        icon: <TargetIcon />,
        detail: detectedDomain ? `检测到领域: ${detectedDomain}\n自动注入领域知识到后续 Agent 提示` : '通用领域模式',
        status: detectedDomain ? 'done' : 'skipped',
      },
      {
        id: 'memory',
        label: '记忆召回',
        icon: <BrainIcon />,
        detail: memoryInfluenced
          ? `召回 ${(memoryCount || 0)} 条相关记忆\n基于历史执行经验调整执行策略`
          : '首次执行，无可用记忆',
        status: memoryInfluenced ? 'done' : 'done',
      },
      {
        id: 'classify',
        label: '任务分类',
        icon: <TagIcon />,
        detail: `分析任务关键词\n${classifyFromPrompt(prompt || '')}`,
        status: prompt ? 'done' : 'skipped',
      },
      {
        id: 'plan',
        label: '动态规划',
        icon: <MapIcon />,
        detail: hasSteps
          ? `生成 ${steps.length} 步执行计划\n${steps.map((s, i) => `${i + 1}. ${s.agent}`).join('\n')}`
          : '根据任务类型动态编排 Agent 序列',
        status: hasSteps ? 'done' : 'skipped',
      },
      {
        id: 'execute',
        label: '协同执行',
        icon: <BoltIcon />,
        detail: hasSteps
          ? `已完成 ${steps.filter(s => s.status === 'completed').length}/${steps.length} 步`
          : '多 Agent 串行协同执行',
        status: hasSteps ? (steps.every(s => s.status === 'completed') ? 'done' : 'active') : 'skipped',
      },
    ];
  }, [prompt, steps, domain, memoryInfluenced, memoryCount]);

  return (
    <div className="space-y-1">
      {nodes.map((node, i) => (
        <div key={node.id}>
          <button
            type="button"
            onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
            aria-expanded={expandedNode === node.id}
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0 ${
              node.status === 'done' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
              : node.status === 'active' ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] animate-pulse'
              : 'bg-[rgba(255,255,255,0.03)] text-[var(--text-muted)]'
            }`}>
              {node.status === 'done' ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              ) : node.status === 'active' ? (
                <span className="w-1.5 h-1.5 rounded-full bg-current" />
              ) : (
                <span className="w-1.5 h-1.5 rounded-full border border-current" />
              )}
            </div>
            <span className="mr-1.5 text-[var(--text-tertiary)]">{node.icon}</span>
            <span className={`text-xs font-medium flex-grow ${
              node.status === 'done' ? 'text-[var(--text)]'
              : node.status === 'active' ? 'text-[#60A5FA]'
              : 'text-[var(--text-muted)]'
            }`}>
              {node.label}
            </span>
            <svg
              className={`w-3 h-3 text-[var(--text-muted)] transition-transform ${expandedNode === node.id ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          {expandedNode === node.id && (
            <div className="ml-10 mb-2 p-2.5 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[var(--border)]">
              <pre className="text-[var(--text-secondary)] text-[11px] whitespace-pre-wrap leading-relaxed font-sans">
                {node.detail}
              </pre>
            </div>
          )}
          {i < nodes.length - 1 && (
            <div className="ml-[26px] h-3 w-px bg-[var(--border)]" />
          )}
        </div>
      ))}
    </div>
  );
}

function detectDomainFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (['打卡', '签到', '习惯'].some(k => lower.includes(k))) return '打卡/签到系统';
  if (['博客', 'blog', '文章', 'cms'].some(k => lower.includes(k))) return '博客/CMS系统';
  if (['电商', '商城', '购物', '订单'].some(k => lower.includes(k))) return '电商/交易系统';
  if (['任务', 'todo', '待办'].some(k => lower.includes(k))) return '任务管理系统';
  if (['ai', '智能', 'agent', '机器学习'].some(k => lower.includes(k))) return 'AI/智能系统';
  if (['社交', '聊天', '社区'].some(k => lower.includes(k))) return '社交/社区系统';
  if (['数据', '分析', 'dashboard', '报表'].some(k => lower.includes(k))) return '数据分析系统';
  return '';
}

function classifyFromPrompt(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (['优化', '重构', '性能', '提升'].some(k => lower.includes(k))) return '分类结果: 优化任务 → 诊断→架构优化→重构→验证';
  if (['排查', '修复', 'debug', 'bug', '错误'].some(k => lower.includes(k))) return '分类结果: 排查任务 → Debug→Root Cause→实现→Regression';
  return '分类结果: 构建任务 → 产品分析→架构设计→实现→测试→部署';
}

export default memo(DecisionGraph);
