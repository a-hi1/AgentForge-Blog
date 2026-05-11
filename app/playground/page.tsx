'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';
import MemoryPanel from '@/components/lab/MemoryPanel';
import ArtifactsPanel from '@/components/artifacts/ArtifactsPanel';
import DecisionGraph from '@/components/planner/DecisionGraph';
import { generateArtifacts, artifactsToMarkdown, artifactsToScaffold, artifactsToApiSpec } from '@/lib/agent-runtime/artifactGenerator';
import type { EngineeringArtifacts } from '@/lib/agent-runtime/artifactGenerator';
import { updateAssetExecutionResult } from '@/lib/prompt/history';
import type { ExecutionMode } from '@/lib/prompt/history';
import { saveContext, loadContext } from '@/lib/session/contextStore';
import { analyzeExecutionResult } from '@/lib/execution/resultAnalyzer';
import type { ExecutionTruthScore } from '@/lib/execution/resultAnalyzer';

interface Step {
  step: number;
  agent: string;
  task: string;
  output: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: Date;
  isExecution?: boolean;
  steps?: Step[];
  executionId?: string;
  memoriesUsed?: any[];
  memoryInfluenced?: boolean;
  adaptations?: string[];
}

interface TaskTemplate {
  id: string;
  category: string;
  name: string;
  prompt: string;
  icon: string;
}

interface ExecutionSummary {
  outcome: 'success' | 'partial' | 'failed';
  successReason: string;
  failureReason?: string;
  promptUpgradeNeeded: boolean;
  upgradeReason?: string;
  nextStep: string;
  completedSteps: number;
  totalSteps: number;
}

const taskTemplates: TaskTemplate[] = [
  { id: 't1', category: 'Web 系统', name: '全栈 SaaS 平台', prompt: 'Build a production-ready SaaS blog platform with authentication, CMS, and deployment pipeline', icon: '🌐' },
  { id: 't2', category: 'Web 系统', name: '实时仪表板', prompt: 'Build a real-time analytics dashboard with WebSocket integration and data visualization', icon: '📊' },
  { id: 't3', category: 'Agent 系统', name: '多 Agent 协作', prompt: 'Design and implement a multi-agent collaboration system with shared memory and task delegation', icon: '🤖' },
  { id: 't4', category: 'Agent 系统', name: '记忆增强管道', prompt: 'Build a memory-augmented agent pipeline with long-term recall and adaptive planning', icon: '🧠' },
  { id: 't5', category: '调试任务', name: '生产问题诊断', prompt: 'Debug and fix production performance issues in a high-traffic Node.js application', icon: '🔍' },
  { id: 't6', category: '调试任务', name: '内存泄漏分析', prompt: 'Identify and resolve memory leaks in a React application with complex state management', icon: '🐛' },
  { id: 't7', category: '性能优化', name: 'API 响应优化', prompt: 'Optimize API response times from 2s to under 200ms through caching, indexing, and query optimization', icon: '⚡' },
  { id: 't8', category: '性能优化', name: '前端渲染优化', prompt: 'Optimize React application rendering performance for large datasets with virtualization and memoization', icon: '🚀' },
  { id: 't9', category: '架构设计', name: '微服务拆分', prompt: 'Design microservice architecture to decompose a monolithic application into scalable services', icon: '🏗️' },
  { id: 't10', category: '架构设计', name: '事件驱动系统', prompt: 'Design an event-driven architecture with message queues, CQRS, and eventual consistency', icon: '📐' },
];

const suggestions = [
  '构建一个支持多人协作的在线文档编辑系统',
  '设计一个 AI 驱动的代码审查工具',
  '优化现有 API 的响应速度至 100ms 以内',
  '实现一个分布式任务调度系统',
  '构建一个生产级的日志分析平台',
];

const STORAGE_KEY = 'agentforge-playground-messages';

export default function PlaygroundPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isHydrated, setIsHydrated] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('全部');
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [currentExecutionId, setCurrentExecutionId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'templates' | 'execution' | 'intel'>('execution');
  const [artifacts, setArtifacts] = useState<EngineeringArtifacts | null>(null);
  const [lastPrompt, setLastPrompt] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [assetId, setAssetId] = useState<string | null>(null);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState<'success' | 'partial' | 'failed'>('success');
  const [feedbackRating, setFeedbackRating] = useState(0);
  const [feedbackNotes, setFeedbackNotes] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [executionSummary, setExecutionSummary] = useState<ExecutionSummary | null>(null);
  const [stepExpanded, setStepExpanded] = useState<Record<string, boolean>>({});
  const [showFullReport, setShowFullReport] = useState(false);
  const [reportSearch, setReportSearch] = useState('');
  const [activeSection, setActiveSection] = useState<string>('summary');
  const [showMemoryPanel, setShowMemoryPanel] = useState(true);
  const [showMetaPanel, setShowMetaPanel] = useState(true);
  const [executionMode, setExecutionMode] = useState<ExecutionMode>('real-api');
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualResultInput, setManualResultInput] = useState('');
  const [manualExternalAgent, setManualExternalAgent] = useState('');
  const [manualAnalysis, setManualAnalysis] = useState<ExecutionTruthScore | null>(null);
  const [analyzingResult, setAnalyzingResult] = useState(false);

  useEffect(() => {
    const ctx = loadContext();
    if (ctx.draftInput && !input) {
      setInput(ctx.draftInput);
    }
    if (ctx.expandedPanels) {
      setShowMemoryPanel(ctx.expandedPanels.memory ?? true);
      setShowMetaPanel(ctx.expandedPanels.meta ?? true);
    }
    saveContext({ lastPage: '/playground' });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      saveContext({
        draftInput: input,
        assetId: assetId ?? undefined,
        executionState: isLoading ? 'running' : messages.some(m => m.isExecution) ? 'completed' : 'idle',
      });
    }, 500);
    return () => clearTimeout(timer);
  }, [input, assetId, isLoading]);

  useEffect(() => {
    saveContext({ expandedPanels: { memory: showMemoryPanel, meta: showMetaPanel } });
  }, [showMemoryPanel, showMetaPanel]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const prompt = urlParams.get('prompt');
      if (prompt) {
        setInput(prompt);
      }
      const aid = urlParams.get('assetId');
      if (aid) {
        setAssetId(aid);
      }
    }
  }, []);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(taskTemplates.map(t => t.category)));
    return ['全部', ...cats];
  }, []);

  const filteredTemplates = useMemo(() => {
    if (activeCategory === '全部') return taskTemplates;
    return taskTemplates.filter(t => t.category === activeCategory);
  }, [activeCategory]);

  useEffect(() => {
    setIsHydrated(true);
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({
          ...m,
          timestamp: new Date(m.timestamp)
        })));
      }
    } catch (e) {
      console.error('Failed to load messages:', e);
    }
  }, []);

  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
  }, [messages, isHydrated]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const clearHistory = useCallback(() => {
    setMessages([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  const autoResizeTextarea = useCallback(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }
  }, []);

  useEffect(() => {
    autoResizeTextarea();
  }, [input, autoResizeTextarea]);

  const handleStreamEvent = useCallback((event: any, executionMsgId: string) => {
    setMessages(prev => prev.map(msg => {
      if (msg.id === executionMsgId && msg.isExecution && msg.steps) {
        if (event.type === 'memory_influence') {
          return { ...msg, memoriesUsed: event.memories, memoryInfluenced: event.memory_influenced, adaptations: event.adaptations };
        } else if (event.type === 'memory_status') {
          return { ...msg, content: event.message };
        } else if (event.type === 'execution_source') {
          return msg;
        } else if (event.type === 'step_error') {
          const newSteps = [...msg.steps];
          const idx = newSteps.findIndex(s => s.step === event.step);
          if (idx >= 0) newSteps[idx] = { ...newSteps[idx], status: 'failed', output: `❌ ${event.error}` };
          return { ...msg, steps: newSteps };
        } else if (event.type === 'step_start') {
          const newStep: Step = { step: event.step, agent: event.agent, task: event.task, output: '', status: 'executing' };
          return { ...msg, steps: [...msg.steps, newStep] };
        } else if (event.type === 'step_chunk') {
          const newSteps = [...msg.steps];
          const idx = newSteps.findIndex(s => s.step === event.step);
          if (idx >= 0) newSteps[idx] = { ...newSteps[idx], output: newSteps[idx].output + event.output };
          return { ...msg, steps: newSteps };
        } else if (event.type === 'step_complete') {
          const newSteps = [...msg.steps];
          const idx = newSteps.findIndex(s => s.step === event.step);
          if (idx >= 0) newSteps[idx] = { ...newSteps[idx], output: event.output, status: 'completed' };
          return { ...msg, steps: newSteps };
        } else if (event.type === 'complete') {
          return { ...msg, executionId: event.executionId || `exec-${Date.now()}` };
        }
      }
      return msg;
    }));
  }, []);

  const handleSend = useCallback(async (promptText?: string) => {
    const text = promptText || input;
    if (!text.trim() || isLoading) return;

    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    const executionMessage: Message = {
      id: (Date.now() + 1).toString(), role: 'agent', content: '', timestamp: new Date(),
      isExecution: true, steps: [], memoriesUsed: [], memoryInfluenced: false, adaptations: [],
    };

    setMessages(prev => [...prev, userMessage, executionMessage]);
    setInput('');
    setIsLoading(true);
    setShowSuggestions(false);
    setActiveTab('execution');

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text }),
        signal: controller.signal,
      });

      if (!response.ok) throw new Error(`请求失败：${response.statusText}`);

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value);
          for (const line of chunk.split('\n')) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data.trim()) {
                try { handleStreamEvent(JSON.parse(data), executionMessage.id); } catch {}
              }
            }
          }
        }
      }
      setLastPrompt(text);
      setMessages(prev => {
        const exec = prev.find(m => m.id === executionMessage.id);
        if (exec?.steps && exec.steps.length > 0) {
          const outputs = exec.steps.map(s => s.output).filter(Boolean);
          setArtifacts(generateArtifacts(text, outputs));

          const total = exec.steps.length;
          const done = exec.steps.filter((s: Step) => s.status === 'completed').length;
          const failed = exec.steps.filter((s: Step) => s.status === 'failed').length;
          const outcome: ExecutionSummary['outcome'] = failed > 0 ? 'failed' : done === total ? 'success' : 'partial';
          const hasOutput = outputs.length > 0;
          setExecutionSummary({
            outcome,
            successReason: outcome === 'success' ? `全部 ${total} 个步骤真实执行成功，产出了有效工程输出` : outcome === 'partial' ? `${done}/${total} 步骤完成，部分任务未完成` : `${failed} 个步骤执行失败`,
            failureReason: outcome !== 'success' ? (failed > 0 ? 'Agent API 执行出错，可能是 API 限流或 Prompt 指令不够精确' : '执行中断，可能需要更详细的上下文描述') : undefined,
            promptUpgradeNeeded: outcome !== 'success' || done < total || !hasOutput,
            upgradeReason: outcome !== 'success' ? '当前执行未完全成功，建议优化 Prompt 提高成功率' : !hasOutput ? '执行完成但未产出有效内容，建议补充更多细节' : undefined,
            nextStep: outcome === 'success' ? '在实验室查看完整报告，或导出工程产物' : outcome === 'partial' ? '使用问题修复工具分析失败原因' : '优化 Prompt 后重新执行',
            completedSteps: done,
            totalSteps: total,
          });
        }
        return prev;
      });
      if (assetId) {
        setTimeout(() => setShowFeedbackDialog(true), 600);
      }
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: 'agent',
          content: '智能代理暂时不可用，请稍后重试。如果问题持续，请检查网络连接。',
          timestamp: new Date(),
        }]);
      }
    } finally {
      setIsLoading(false);
      abortControllerRef.current = null;
    }
  }, [input, isLoading, handleStreamEvent, assetId]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }, [handleSend]);

  const selectTemplate = useCallback((template: TaskTemplate) => {
    setInput(template.prompt);
    setShowSuggestions(false);
    setActiveTab('execution');
    setTimeout(() => textareaRef.current?.focus(), 100);
  }, []);

  const lastExecution = useMemo(() => {
    return [...messages].reverse().find(m => m.isExecution && m.steps && m.steps.length > 0);
  }, [messages]);

  const currentRunningStep = useMemo(() => {
    return lastExecution?.steps?.find(s => s.status === 'executing');
  }, [lastExecution]);

  const completedSteps = useMemo(() => {
    return lastExecution?.steps?.filter(s => s.status === 'completed') || [];
  }, [lastExecution]);

  const handleExport = useCallback((type: 'techspec' | 'scaffold' | 'apispec' | 'prd') => {
    if (!artifacts) return;
    let content = '';
    let filename = '';
    switch (type) {
      case 'techspec':
        content = artifactsToMarkdown(artifacts, lastPrompt);
        filename = 'tech-spec.md';
        break;
      case 'scaffold':
        content = artifactsToScaffold(artifacts, lastPrompt);
        filename = 'scaffold.txt';
        break;
      case 'apispec':
        content = artifactsToApiSpec(artifacts);
        filename = 'api-spec.yaml';
        break;
      case 'prd':
        content = `# 产品需求文档\n\n> ${lastPrompt}\n\n` + artifactsToMarkdown(artifacts, lastPrompt);
        filename = 'prd.md';
        break;
    }
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }, [artifacts, lastPrompt]);

  const handleSubmitFeedback = useCallback(async () => {
    if (!assetId || feedbackRating === 0) return;
    setSubmittingFeedback(true);
    try {
      await updateAssetExecutionResult(assetId, {
        success: feedbackSuccess,
        rating: feedbackRating,
        notes: feedbackNotes || undefined,
        provenance: {
          executionMode: executionMode,
          realExecution: executionMode === 'real-api',
          externalAgent: executionMode === 'manual' ? manualExternalAgent : undefined,
          userRating: feedbackRating,
        },
      });
      setShowFeedbackDialog(false);
    } catch (e) {
      console.error('Feedback submit failed:', e);
    } finally {
      setSubmittingFeedback(false);
    }
  }, [assetId, feedbackSuccess, feedbackRating, feedbackNotes, executionMode, manualExternalAgent]);

  const handleManualSend = useCallback(() => {
    if (!input.trim() || isLoading) return;
    const text = input;
    const userMessage: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    const agentMessage: Message = {
      id: (Date.now() + 1).toString(), role: 'agent',
      content: `📋 Prompt 已生成，请复制以下内容发送给外部 Agent 执行：\n\n${text}\n\n执行完成后，请在下方粘贴结果。`,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage, agentMessage]);
    setInput('');
    setShowSuggestions(false);
    setShowManualInput(true);
    setManualResultInput('');
    setManualAnalysis(null);
    setLastPrompt(text);
  }, [input, isLoading]);

  const handleAnalyzeManualResult = useCallback(async () => {
    if (!manualResultInput.trim() || !lastPrompt) return;
    setAnalyzingResult(true);
    try {
      const analysis = analyzeExecutionResult(manualResultInput, lastPrompt);
      setManualAnalysis(analysis);

      const analysisMessage: Message = {
        id: Date.now().toString(), role: 'agent',
        content: `🔍 结果分析完成\n\n综合评分: ${analysis.overall}/100\n成功率: ${analysis.successRate}%\n完整性: ${analysis.completeness}%\n工程可落地性: ${analysis.engineeringQuality}%\n${analysis.errorPatterns.length > 0 ? `\n⚠️ 发现问题:\n${analysis.errorPatterns.map(p => `- ${p}`).join('\n')}` : ''}${analysis.needsPromptUpgrade ? `\n\n💡 Prompt 建议升级:\n${analysis.upgradeSuggestions.map(s => `- ${s}`).join('\n')}` : ''}`,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, analysisMessage]);

      if (assetId) {
        await updateAssetExecutionResult(assetId, {
          success: analysis.overall >= 60 ? 'success' : analysis.overall >= 40 ? 'partial' : 'failed',
          rating: Math.ceil(analysis.overall / 20),
          notes: `手动执行 | 外部Agent: ${manualExternalAgent || '未指定'} | 评分: ${analysis.overall}`,
          provenance: {
            executionMode: 'manual',
            realExecution: true,
            externalAgent: manualExternalAgent || undefined,
            executionSource: 'manual-bridge',
            userRating: Math.ceil(analysis.overall / 20),
          },
        });
      }
    } catch (e) {
      console.error('Analysis failed:', e);
    } finally {
      setAnalyzingResult(false);
    }
  }, [manualResultInput, lastPrompt, assetId, manualExternalAgent]);

  const handleModeSwitch = useCallback((mode: ExecutionMode) => {
    setExecutionMode(mode);
    setShowManualInput(false);
    setManualResultInput('');
    setManualAnalysis(null);
  }, []);

  return (
    <>
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[#A1A1AA] text-sm font-medium">AI 工程控制台</span>
            <span className="text-[#71717A] text-xs hidden sm:inline">|</span>
            <div className="hidden sm:flex items-center gap-1 bg-[rgba(255,255,255,0.03)] rounded-lg p-0.5 border border-[rgba(255,255,255,0.06)]">
              {([
                { mode: 'real-api' as ExecutionMode, label: '真实执行' },
                { mode: 'manual' as ExecutionMode, label: '手动桥接' },
                { mode: 'mock' as ExecutionMode, label: '模拟执行' },
              ]).map(opt => (
                <button
                  key={opt.mode}
                  onClick={() => handleModeSwitch(opt.mode)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    executionMode === opt.mode
                      ? opt.mode === 'real-api' ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                        : opt.mode === 'manual' ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA]'
                        : 'bg-[rgba(161,161,170,0.15)] text-[#A1A1AA]'
                      : 'text-[#71717A] hover:text-[#A78BFA] hover:bg-[rgba(139,92,246,0.08)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <Link href="/prompt" className="px-3 py-1 text-xs font-medium rounded-md text-[#71717A] hover:text-[#A78BFA] hover:bg-[rgba(139,92,246,0.08)] transition-all hidden sm:inline-block">
              提示词模式
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-[#71717A] hover:text-[#A1A1AA] transition-colors px-2 py-1 rounded hover:bg-[rgba(255,255,255,0.05)]">
                清除历史
              </button>
            )}
            <div className="flex md:hidden gap-1">
              {(['templates', 'execution', 'intel'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === tab ? 'bg-[rgba(59,130,246,0.2)] text-[#60A5FA]' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
                >
                  {{ templates: '模板', execution: '执行', intel: '情报' }[tab]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex max-w-[1600px] mx-auto w-full">
        <aside className={`${activeTab === 'templates' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50`}>
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA] mb-3">任务模板</h2>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${activeCategory === cat ? 'bg-[rgba(59,130,246,0.2)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)]' : 'text-[#71717A] hover:text-[#A1A1AA] border border-transparent hover:border-[rgba(255,255,255,0.1)]'}`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-grow overflow-y-auto p-3 space-y-2">
            {filteredTemplates.map(template => (
              <button
                key={template.id}
                onClick={() => selectTemplate(template)}
                className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.05)] transition-all group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{template.icon}</span>
                  <span className="text-sm font-medium text-[#FAFAFA] group-hover:text-[#60A5FA] transition-colors">
                    {template.name}
                  </span>
                </div>
                <p className="text-xs text-[#71717A] line-clamp-2 leading-relaxed">
                  {template.prompt}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[#71717A]">
                    {template.category}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className={`${activeTab === 'execution' ? 'flex' : 'hidden'} md:flex flex-col flex-grow min-w-0`}>
          <div className="flex-grow overflow-y-auto p-4 lg:p-6 space-y-4">
            {messages.length === 0 && showSuggestions && (
              <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(59,130,246,0.2)] to-[rgba(139,92,246,0.2)] flex items-center justify-center mb-6 border border-[rgba(59,130,246,0.2)]">
                  <svg className="w-8 h-8 text-[#60A5FA]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#FAFAFA] mb-2">AI 智能工程控制台</h2>
                <p className="text-[#71717A] text-sm mb-8 max-w-md">
                  描述你的工程需求，智能代理将协同执行架构设计、代码生成、质量审查和部署优化。
                </p>
                <div className="w-full max-w-lg space-y-2">
                  <p className="text-xs text-[#71717A] mb-3 uppercase tracking-wider">快速开始</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(59,130,246,0.3)] hover:bg-[rgba(59,130,246,0.05)] transition-all text-sm text-[#A1A1AA] hover:text-[#FAFAFA]"
                    >
                      <span className="text-[#71717A] mr-2">{i + 1}.</span>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] ${message.role === 'user' ? 'max-w-[70%]' : 'w-full max-w-4xl'}`}>
                  {message.isExecution && message.steps ? (
                    <div className="space-y-3">
                      {(message.memoryInfluenced || (message.memoriesUsed?.length ?? 0) > 0) && (
                        <MemoryPanel memories={message.memoriesUsed ?? []} memoryInfluenced={message.memoryInfluenced} adaptations={message.adaptations} compact={true} />
                      )}
                      {message.content && (
                        <div className="text-[#A1A1AA] text-sm bg-[#111113] p-3 rounded-lg border border-[rgba(255,255,255,0.05)]">
                          {message.content}
                        </div>
                      )}
                      {message.steps.map((step) => {
                        const stepKey = `${message.id}-${step.step}`;
                        const isExecDone = step.status === 'completed' || step.status === 'failed';
                        const isExpanded = stepExpanded[stepKey] ?? !isExecDone;
                        return (
                          <div
                            key={step.step}
                            data-section={step.step === 1 ? 'architecture' : step.step === 2 ? 'implementation' : step.step === 3 ? 'risks' : 'recommendations'}
                            className={`rounded-xl border transition-all overflow-hidden ${
                              step.status === 'completed' ? 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)]'
                              : step.status === 'executing' ? 'border-[rgba(59,130,246,0.3)] bg-[rgba(59,130,246,0.05)]'
                              : 'border-[rgba(255,255,255,0.06)] bg-[rgba(24,24,27,0.3)]'
                            }`}
                          >
                            <button
                              onClick={() => setStepExpanded(prev => ({ ...prev, [stepKey]: !isExpanded }))}
                              className="w-full flex items-center gap-3 p-4 hover:bg-[rgba(255,255,255,0.02)] transition-colors text-left"
                            >
                              <svg className={`w-3 h-3 text-[#52525B] shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                              <span className="text-[#71717A] text-xs font-mono">#{step.step}</span>
                              <AgentBadge agent={step.agent} size="sm" />
                              <AgentStatus status={step.status === 'executing' ? 'executing' : 'completed'} size="sm" />
                              <span className="text-xs text-[#52525B] ml-auto shrink-0">{step.task}</span>
                              {!isExpanded && step.output && (
                                <span className="text-[10px] text-[#52525B] shrink-0">{step.output.split('\n').length} 行</span>
                              )}
                            </button>
                            {isExpanded && (
                              <div className="px-4 pb-4 pl-10">
                                <p className="text-[#A1A1AA] text-sm mb-2">{step.task}</p>
                                {step.output && (
                                  <div className="mt-2 p-3 bg-[#111113] rounded-lg border border-[rgba(255,255,255,0.05)]">
                                    <pre className="text-[#A1A1AA] whitespace-pre-wrap text-xs font-mono leading-relaxed max-h-[500px] overflow-y-auto">{step.output}</pre>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      {message.executionId && message.steps.length > 0 && message.steps.every(s => s.status === 'completed') && (
                        <div className="flex justify-center mt-4">
                          <Link href="/lab" className="inline-flex items-center gap-2 px-4 py-2 bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            在实验室查看完整报告
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white'
                        : 'bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.06)] text-[#FAFAFA]'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-[10px] mt-1.5 opacity-60 ${message.role === 'user' ? 'text-white/60' : 'text-[#71717A]'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.06)] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#60A5FA] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#60A5FA] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#60A5FA] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-[#71717A]">智能代理执行中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {showManualInput && executionMode === 'manual' && (
            <div className="border-t border-[rgba(59,130,246,0.2)] bg-[rgba(59,130,246,0.03)] p-4 lg:p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#60A5FA] animate-pulse" />
                  <span className="text-sm font-medium text-[#60A5FA]">手动执行桥接</span>
                </div>
                <button onClick={() => { setShowManualInput(false); setManualAnalysis(null); }} className="text-[#71717A] hover:text-[#A1A1AA] transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label className="text-xs text-[#71717A] shrink-0">外部 Agent：</label>
                <div className="flex gap-1.5 flex-wrap">
                  {['Cursor', 'Claude', 'GPT', 'Gemini', '其他'].map(agent => (
                    <button
                      key={agent}
                      onClick={() => setManualExternalAgent(agent)}
                      className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                        manualExternalAgent === agent
                          ? 'bg-[rgba(59,130,246,0.2)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)]'
                          : 'text-[#71717A] border border-[rgba(255,255,255,0.08)] hover:border-[rgba(59,130,246,0.2)]'
                      }`}
                    >
                      {agent}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-[#71717A] mb-1.5">粘贴外部 Agent 的执行结果：</label>
                <textarea
                  value={manualResultInput}
                  onChange={e => setManualResultInput(e.target.value)}
                  placeholder="将外部 Agent 的输出结果粘贴到这里...&#10;&#10;支持 Markdown 格式"
                  className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] rounded-lg px-4 py-3 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#3B82F6] resize-none min-h-[120px] max-h-[300px]"
                  rows={5}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={handleAnalyzeManualResult}
                  disabled={!manualResultInput.trim() || analyzingResult}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-lg hover:shadow-[rgba(59,130,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {analyzingResult ? '分析中...' : '分析结果'}
                </button>
                <span className="text-[10px] text-[#71717A]">
                  {manualResultInput.length > 0 ? `${manualResultInput.length} 字符` : '等待输入'}
                </span>
              </div>

              {manualAnalysis && (
                <div className="p-4 rounded-lg bg-[rgba(24,24,27,0.7)] border border-[rgba(255,255,255,0.08)] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-[#FAFAFA]">执行真实性评分</span>
                    <span className={`text-lg font-bold ${
                      manualAnalysis.overall >= 70 ? 'text-[#10B981]' :
                      manualAnalysis.overall >= 50 ? 'text-[#F59E0B]' : 'text-[#EF4444]'
                    }`}>
                      {manualAnalysis.overall}/100
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      { label: '成功率', value: manualAnalysis.successRate, color: '#10B981' },
                      { label: '完整性', value: manualAnalysis.completeness, color: '#3B82F6' },
                      { label: '工程质量', value: manualAnalysis.engineeringQuality, color: '#8B5CF6' },
                    ].map(item => (
                      <div key={item.label} className="text-center">
                        <div className="text-xs text-[#71717A] mb-1">{item.label}</div>
                        <div className="text-sm font-semibold" style={{ color: item.color }}>{item.value}%</div>
                      </div>
                    ))}
                  </div>
                  {manualAnalysis.errorPatterns.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-xs text-[#F59E0B]">⚠️ 发现问题：</span>
                      {manualAnalysis.errorPatterns.map((p, i) => (
                        <p key={i} className="text-xs text-[#A1A1AA] pl-3">• {p}</p>
                      ))}
                    </div>
                  )}
                  {manualAnalysis.needsPromptUpgrade && manualAnalysis.upgradeSuggestions.length > 0 && (
                    <div className="p-2 rounded-md bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)] space-y-1">
                      <span className="text-xs text-[#A78BFA]">💡 Prompt 升级建议：</span>
                      {manualAnalysis.upgradeSuggestions.map((s, i) => (
                        <p key={i} className="text-xs text-[#71717A] pl-3">• {s}</p>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="border-t border-[rgba(255,255,255,0.06)] p-3 lg:p-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setShowSuggestions(false); }}
                onKeyDown={handleKeyDown}
                placeholder={executionMode === 'manual' ? '输入 Prompt，将发送给外部 Agent 执行...' : '描述你的工程需求... (Ctrl+Enter 发送)'}
                className="w-full bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 pr-28 text-[#FAFAFA] placeholder-[#71717A] focus:outline-none focus:border-[#3B82F6] resize-none text-sm leading-relaxed min-h-[52px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                {isLoading && (
                  <button
                    onClick={() => { abortControllerRef.current?.abort(); setIsLoading(false); }}
                    className="p-2 rounded-lg bg-[rgba(239,68,68,0.1)] text-[#ef4444] hover:bg-[rgba(239,68,68,0.2)] transition-all"
                    title="停止执行"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  </button>
                )}
                <button
                  onClick={() => executionMode === 'manual' ? handleManualSend() : handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-lg bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-lg hover:shadow-[rgba(59,130,246,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title={executionMode === 'manual' ? '生成 Prompt (手动桥接)' : '发送 (Ctrl+Enter)'}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[#71717A] mt-2 text-center">
              Shift+Enter 换行 · Ctrl/Cmd+Enter 发送 · 左侧选择任务模板快速开始
            </p>
          </div>
        </main>

        <aside className={`${activeTab === 'intel' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 border-l border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50`}>
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA]">执行情报</h2>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {lastExecution ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs text-[#71717A] uppercase tracking-wider">报告导航</h3>
                  <div className="space-y-0.5">
                    {[
                      { id: 'summary', label: '执行摘要' },
                      { id: 'architecture', label: '架构设计' },
                      { id: 'implementation', label: '实现细节' },
                      { id: 'risks', label: '风险提示' },
                      { id: 'recommendations', label: '下一步' },
                    ].map(item => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveSection(item.id);
                          const el = document.querySelector(`[data-section="${item.id}"]`);
                          el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        }}
                        className={`w-full text-left px-3 py-1.5 rounded-md text-xs transition-colors ${
                          activeSection === item.id
                            ? 'text-[#FAFAFA] bg-[rgba(59,130,246,0.1)] border border-[rgba(59,130,246,0.2)]'
                            : 'text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.03)]'
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  {lastExecution && lastExecution.steps && lastExecution.steps.length > 0 && (
                    <button
                      onClick={() => setShowFullReport(true)}
                      className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-[#60A5FA] hover:bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)] transition-all"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                      查看完整报告
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs text-[#71717A] uppercase tracking-wider">当前状态</h3>
                  <div className="p-3 rounded-lg bg-[rgba(24,24,27,0.5)] border border-[rgba(255,255,255,0.06)]">
                    {currentRunningStep ? (
                      <div className="flex items-center gap-2">
                        <AgentBadge agent={currentRunningStep.agent} size="sm" />
                        <span className="text-xs text-[#A1A1AA] truncate">{currentRunningStep.task}</span>
                      </div>
                    ) : completedSteps.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#10B981]" />
                        <span className="text-xs text-[#10B981]">执行完成</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#71717A]">等待执行</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs text-[#71717A] uppercase tracking-wider">Agent 序列</h3>
                  <div className="space-y-1.5">
                    {lastExecution.steps?.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-[rgba(255,255,255,0.02)]">
                        <div className={`w-1.5 h-1.5 rounded-full ${step.status === 'completed' ? 'bg-[#10B981]' : step.status === 'executing' ? 'bg-[#3B82F6] animate-pulse' : 'bg-[#71717A]'}`} />
                        <span className="text-xs text-[#A1A1AA] truncate flex-grow">{step.agent}</span>
                        {step.status === 'completed' && (
                          <svg className="w-3 h-3 text-[#10B981] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {(lastExecution.memoriesUsed?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs text-[#71717A] uppercase tracking-wider">记忆召回</h3>
                    <div className="p-3 rounded-lg bg-[rgba(59,130,246,0.05)] border border-[rgba(59,130,246,0.15)]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">🧠</span>
                        <span className="text-xs text-[#60A5FA] font-medium">
                          {lastExecution.memoriesUsed?.length} 条相关记忆
                        </span>
                      </div>
                      {lastExecution.memoryInfluenced && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA]">
                          已影响执行策略
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xs text-[#71717A] uppercase tracking-wider">执行进度</h3>
                  <div className="p-3 rounded-lg bg-[rgba(24,24,27,0.5)] border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#A1A1AA]">
                        {completedSteps.length} / {lastExecution.steps?.length || 0} 步骤
                      </span>
                      <span className="text-xs text-[#60A5FA] font-mono">
                        {lastExecution.steps?.length ? Math.round((completedSteps.length / lastExecution.steps.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-[rgba(24,24,27,0.72)] rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${lastExecution.steps?.length ? (completedSteps.length / lastExecution.steps.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs text-[#71717A] uppercase tracking-wider">决策链路</h3>
                  <div className="p-3 rounded-lg bg-[rgba(24,24,27,0.5)] border border-[rgba(255,255,255,0.06)]">
                    <DecisionGraph
                      prompt={lastPrompt}
                      steps={lastExecution.steps || []}
                      memoryInfluenced={lastExecution.memoryInfluenced}
                      memoryCount={lastExecution.memoriesUsed?.length}
                    />
                  </div>
                </div>

                {executionSummary && (
                  <div className="space-y-2" data-section="summary">
                    <h3 className="text-xs text-[#71717A] uppercase tracking-wider">执行结果智能分析</h3>
                    <div className={`p-3 rounded-lg border ${
                      executionSummary.outcome === 'success' ? 'bg-[rgba(16,185,129,0.05)] border-[rgba(16,185,129,0.2)]' :
                      executionSummary.outcome === 'partial' ? 'bg-[rgba(245,158,11,0.05)] border-[rgba(245,158,11,0.2)]' :
                      'bg-[rgba(239,68,68,0.05)] border-[rgba(239,68,68,0.2)]'
                    }`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium ${
                          executionSummary.outcome === 'success' ? 'text-[#10B981]' :
                          executionSummary.outcome === 'partial' ? 'text-[#F59E0B]' :
                          'text-[#EF4444]'
                        }`}>
                          {executionSummary.outcome === 'success' ? '执行成功' : executionSummary.outcome === 'partial' ? '部分成功' : '执行失败'}
                        </span>
                        <span className="text-[10px] text-[#71717A]">{executionSummary.completedSteps}/{executionSummary.totalSteps} 步骤</span>
                      </div>
                      <p className="text-xs text-[#A1A1AA] mb-2">{executionSummary.successReason}</p>
                      {executionSummary.failureReason && (
                        <p className="text-xs text-[#EF4444] mb-2">原因：{executionSummary.failureReason}</p>
                      )}
                      {executionSummary.promptUpgradeNeeded && (
                        <div className="mb-2 p-2 rounded-md bg-[rgba(139,92,246,0.08)] border border-[rgba(139,92,246,0.15)]">
                          <p className="text-[10px] text-[#A78BFA]">Prompt 建议升级</p>
                          {executionSummary.upgradeReason && <p className="text-[10px] text-[#71717A] mt-0.5">{executionSummary.upgradeReason}</p>}
                        </div>
                      )}
                      <div className="flex items-center gap-1.5">
                        <svg className="w-3.5 h-3.5 text-[#60A5FA] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                        </svg>
                        <span className="text-xs text-[#60A5FA]">{executionSummary.nextStep}</span>
                      </div>
                    </div>
                  </div>
                )}

                {artifacts && completedSteps.length > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs text-[#71717A] uppercase tracking-wider">工程产物</h3>
                    <ArtifactsPanel artifacts={artifacts} onExport={handleExport} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </div>
                <p className="text-xs text-[#71717A]">执行任务后此处将显示实时情报</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
            <Link href="/lab" className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-[#71717A] hover:text-[#60A5FA] hover:bg-[rgba(59,130,246,0.05)] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              查看完整实验室
            </Link>
          </div>
        </aside>
      </div>
    </div>

    {showFeedbackDialog && (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
        <div className="w-full max-w-md mx-4 bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-2xl p-6 shadow-2xl">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-[#FAFAFA]">执行结果反馈</h3>
            <button onClick={() => setShowFeedbackDialog(false)} className="text-[#71717A] hover:text-[#FAFAFA] transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs text-[#71717A] mb-2">本次执行是否成功？</label>
              <div className="flex gap-2">
                {([
                  { value: 'success' as const, label: '成功', color: '#10B981' },
                  { value: 'partial' as const, label: '部分成功', color: '#F59E0B' },
                  { value: 'failed' as const, label: '失败', color: '#EF4444' },
                ]).map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setFeedbackSuccess(opt.value)}
                    className="flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all"
                    style={feedbackSuccess === opt.value ? {
                      borderColor: opt.color,
                      backgroundColor: `${opt.color}15`,
                      color: opt.color,
                    } : {
                      borderColor: 'rgba(255,255,255,0.1)',
                      color: '#71717A',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#71717A] mb-2">评分</label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setFeedbackRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <svg className={`w-7 h-7 ${star <= feedbackRating ? 'text-yellow-400' : 'text-[#52525B]'}`} fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                ))}
                {feedbackRating > 0 && (
                  <span className="ml-2 text-sm text-[#A1A1AA] self-center">{feedbackRating}/5</span>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs text-[#71717A] mb-1.5">备注（可选）</label>
              <textarea
                value={feedbackNotes}
                onChange={e => setFeedbackNotes(e.target.value)}
                placeholder="补充说明执行效果..."
                className="w-full bg-[#0a0a0c] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#3B82F6] resize-none"
                rows={3}
              />
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button
              onClick={() => setShowFeedbackDialog(false)}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA] transition-all"
            >
              跳过
            </button>
            <button
              onClick={handleSubmitFeedback}
              disabled={submittingFeedback || feedbackRating === 0}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-lg hover:shadow-[rgba(59,130,246,0.3)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submittingFeedback ? '提交中...' : '提交反馈'}
            </button>
          </div>
        </div>
      </div>
    )}

    {showFullReport && lastExecution && lastExecution.steps && lastExecution.steps.length > 0 && (
      <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setShowFullReport(false)}>
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
        <div
          className="relative w-full max-w-2xl bg-[#0A0A0C] border-l border-[rgba(255,255,255,0.08)] overflow-y-auto"
          onClick={e => e.stopPropagation()}
        >
          <div className="sticky top-0 z-10 bg-[#0A0A0C] border-b border-[rgba(255,255,255,0.06)] p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">完整执行报告</h2>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.06)] text-[#71717A]">{lastExecution.steps?.length || 0} 步骤</span>
            </div>
            <div className="flex items-center gap-2">
              <input
                value={reportSearch}
                onChange={e => setReportSearch(e.target.value)}
                placeholder="搜索报告..."
                className="px-3 py-1.5 rounded-lg bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] text-xs text-[#A1A1AA] placeholder-[#52525B] focus:outline-none focus:border-[#3B82F6] w-40"
              />
              <button
                onClick={() => {
                  const fullText = (lastExecution.steps ?? []).map((s: any) =>
                    `### [${s.agent}] ${s.task}\n\n${s.output || ''}`
                  ).join('\n\n---\n\n');
                  navigator.clipboard.writeText(fullText);
                }}
                className="p-2 rounded-lg text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                title="复制全部"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
              <button
                onClick={() => {
                  const md = `# 执行报告\n\n${lastExecution.content || ''}\n\n${(lastExecution.steps ?? []).map((s: any) =>
                    `## [${s.agent}] ${s.task}\n\n${s.output || ''}`
                  ).join('\n\n---\n\n')}`;
                  const blob = new Blob([md], { type: 'text/markdown' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'execution-report.md'; a.click();
                  URL.revokeObjectURL(url);
                }}
                className="p-2 rounded-lg text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.05)] transition-colors"
                title="导出 Markdown"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
              <button onClick={() => setShowFullReport(false)} className="p-2 rounded-lg text-[#71717A] hover:text-[#FAFAFA] hover:bg-[rgba(255,255,255,0.05)] transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {lastExecution.content && (
            <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
              <p className="text-sm text-[#A1A1AA] leading-relaxed whitespace-pre-wrap">{lastExecution.content}</p>
            </div>
          )}

          <div className="p-4 space-y-4">
            {(lastExecution.steps ?? []).map((step: any) => {
              const matchesSearch = !reportSearch ||
                step.task.toLowerCase().includes(reportSearch.toLowerCase()) ||
                (step.output && step.output.toLowerCase().includes(reportSearch.toLowerCase()));
              if (!matchesSearch) return null;
              return (
                <div key={step.step} className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
                  <div className="flex items-center gap-3 p-3 bg-[rgba(255,255,255,0.02)]">
                    <span className="text-[#71717A] text-xs font-mono">#{step.step}</span>
                    <AgentBadge agent={step.agent} size="sm" />
                    <span className="text-xs text-[#A1A1AA] flex-1">{step.task}</span>
                  </div>
                  {step.output && (
                    <div className="p-3 border-t border-[rgba(255,255,255,0.04)]">
                      <pre className="text-xs text-[#D4D4D8] whitespace-pre-wrap leading-relaxed font-mono">{step.output}</pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    )}
    </>
  );
}
