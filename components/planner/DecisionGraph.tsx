'use client';

import { memo, useState, useMemo } from 'react';

interface DecisionNode {
  id: string;
  label: string;
  icon: string;
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

function DecisionGraph({ prompt, steps = [], domain, memoryInfluenced, memoryCount }: DecisionGraphProps) {
  const [expandedNode, setExpandedNode] = useState<string | null>(null);

  const nodes: DecisionNode[] = useMemo(() => {
    const hasSteps = steps.length > 0;
    const detectedDomain = domain || detectDomainFromPrompt(prompt || '');

    return [
      {
        id: 'prompt',
        label: '需求解析',
        icon: '📝',
        detail: prompt ? `输入: "${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}"` : '等待输入',
        status: prompt ? 'done' : 'skipped',
      },
      {
        id: 'domain',
        label: '领域识别',
        icon: '🎯',
        detail: detectedDomain ? `检测到领域: ${detectedDomain}\n自动注入领域知识到后续 Agent 提示` : '通用领域模式',
        status: detectedDomain ? 'done' : 'skipped',
      },
      {
        id: 'memory',
        label: '记忆召回',
        icon: '🧠',
        detail: memoryInfluenced
          ? `召回 ${(memoryCount || 0)} 条相关记忆\n基于历史执行经验调整执行策略`
          : '首次执行，无可用记忆',
        status: memoryInfluenced ? 'done' : 'done',
      },
      {
        id: 'classify',
        label: '任务分类',
        icon: '🏷',
        detail: `分析任务关键词\n${classifyFromPrompt(prompt || '')}`,
        status: prompt ? 'done' : 'skipped',
      },
      {
        id: 'plan',
        label: '动态规划',
        icon: '🗺',
        detail: hasSteps
          ? `生成 ${steps.length} 步执行计划\n${steps.map((s, i) => `${i + 1}. ${s.agent}`).join('\n')}`
          : '根据任务类型动态编排 Agent 序列',
        status: hasSteps ? 'done' : 'skipped',
      },
      {
        id: 'execute',
        label: '协同执行',
        icon: '⚡',
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
            onClick={() => setExpandedNode(expandedNode === node.id ? null : node.id)}
            className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-[rgba(255,255,255,0.03)] transition-colors text-left"
          >
            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] shrink-0 ${
              node.status === 'done' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
              : node.status === 'active' ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] animate-pulse'
              : 'bg-[rgba(255,255,255,0.03)] text-[#52525B]'
            }`}>
              {node.status === 'done' ? '✓' : node.status === 'active' ? '◉' : '○'}
            </div>
            <span className="mr-1.5 text-xs">{node.icon}</span>
            <span className={`text-xs font-medium flex-grow ${
              node.status === 'done' ? 'text-[#E4E4E7]'
              : node.status === 'active' ? 'text-[#60A5FA]'
              : 'text-[#52525B]'
            }`}>
              {node.label}
            </span>
            <span className="text-[#52525B] text-[10px]">{expandedNode === node.id ? '▼' : '▶'}</span>
          </button>
          {expandedNode === node.id && (
            <div className="ml-10 mb-2 p-2.5 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)]">
              <pre className="text-[#A1A1AA] text-[11px] whitespace-pre-wrap leading-relaxed font-sans">
                {node.detail}
              </pre>
            </div>
          )}
          {i < nodes.length - 1 && (
            <div className="ml-[26px] h-3 w-px bg-[rgba(255,255,255,0.06)]" />
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
