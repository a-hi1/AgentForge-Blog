'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import AgentBadge from '@/components/agent/AgentBadge';
import AgentStatus from '@/components/agent/AgentStatus';
import MemoryPanel from '@/components/lab/MemoryPanel';

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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

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
  }, [input, isLoading, handleStreamEvent]);

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

  return (
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.08)] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
            <span className="text-[#94a3b8] text-sm font-medium">AI 工程控制台</span>
            <span className="text-[#475569] text-xs">|</span>
            <span className="text-[#64748b] text-xs">
              {isLoading ? '执行中...' : '就绪'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {messages.length > 0 && (
              <button onClick={clearHistory} className="text-xs text-[#64748b] hover:text-[#94a3b8] transition-colors px-2 py-1 rounded hover:bg-[rgba(255,255,255,0.05)]">
                清除历史
              </button>
            )}
            <div className="flex md:hidden gap-1">
              {(['templates', 'execution', 'intel'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === tab ? 'bg-[rgba(99,102,241,0.2)] text-[#818cf8]' : 'text-[#64748b] hover:text-[#94a3b8]'}`}
                >
                  {{ templates: '模板', execution: '执行', intel: '情报' }[tab]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex max-w-[1600px] mx-auto w-full">
        <aside className={`${activeTab === 'templates' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 border-r border-[rgba(255,255,255,0.08)] flex-col bg-[#0a0a0f]/50`}>
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#f8fafc] mb-3">任务模板</h2>
            <div className="flex flex-wrap gap-1.5">
              {categories.map(cat => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-2.5 py-1 text-xs rounded-md transition-all ${activeCategory === cat ? 'bg-[rgba(99,102,241,0.2)] text-[#818cf8] border border-[rgba(99,102,241,0.3)]' : 'text-[#64748b] hover:text-[#94a3b8] border border-transparent hover:border-[rgba(255,255,255,0.1)]'}`}
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
                className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(99,102,241,0.3)] hover:bg-[rgba(99,102,241,0.05)] transition-all group"
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-base">{template.icon}</span>
                  <span className="text-sm font-medium text-[#f8fafc] group-hover:text-[#818cf8] transition-colors">
                    {template.name}
                  </span>
                </div>
                <p className="text-xs text-[#64748b] line-clamp-2 leading-relaxed">
                  {template.prompt}
                </p>
                <div className="mt-2 flex items-center gap-1">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[#64748b]">
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
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[rgba(99,102,241,0.2)] to-[rgba(139,92,246,0.2)] flex items-center justify-center mb-6 border border-[rgba(99,102,241,0.2)]">
                  <svg className="w-8 h-8 text-[#818cf8]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-[#f8fafc] mb-2">AI 智能工程控制台</h2>
                <p className="text-[#64748b] text-sm mb-8 max-w-md">
                  描述你的工程需求，智能代理将协同执行架构设计、代码生成、质量审查和部署优化。
                </p>
                <div className="w-full max-w-lg space-y-2">
                  <p className="text-xs text-[#475569] mb-3 uppercase tracking-wider">快速开始</p>
                  {suggestions.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(s)}
                      className="w-full text-left p-3 rounded-lg border border-[rgba(255,255,255,0.06)] hover:border-[rgba(99,102,241,0.3)] hover:bg-[rgba(99,102,241,0.05)] transition-all text-sm text-[#94a3b8] hover:text-[#f8fafc]"
                    >
                      <span className="text-[#64748b] mr-2">{i + 1}.</span>
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
                        <div className="text-[#94a3b8] text-sm bg-[#0f172a] p-3 rounded-lg border border-[rgba(255,255,255,0.05)]">
                          {message.content}
                        </div>
                      )}
                      {message.steps.map((step) => (
                        <div
                          key={step.step}
                          className={`p-4 rounded-xl border transition-all ${
                            step.status === 'completed' ? 'border-[rgba(16,185,129,0.3)] bg-[rgba(16,185,129,0.05)]'
                            : step.status === 'executing' ? 'border-[rgba(99,102,241,0.3)] bg-[rgba(99,102,241,0.05)]'
                            : 'border-[rgba(255,255,255,0.08)] bg-[#1e293b]/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-[#64748b] text-xs font-mono">#{step.step}</span>
                            <AgentBadge agent={step.agent} size="sm" />
                            <AgentStatus status={step.status === 'executing' ? 'executing' : 'completed'} size="sm" />
                          </div>
                          <p className="text-[#94a3b8] text-sm mb-2">{step.task}</p>
                          {step.output && (
                            <div className="mt-3 p-3 bg-[#0f172a] rounded-lg border border-[rgba(255,255,255,0.05)]">
                              <pre className="text-[#94a3b8] whitespace-pre-wrap text-xs font-mono leading-relaxed">{step.output}</pre>
                            </div>
                          )}
                        </div>
                      ))}
                      {message.executionId && message.steps.length > 0 && message.steps.every(s => s.status === 'completed') && (
                        <div className="flex justify-center mt-4">
                          <Link href="/lab" className="inline-flex items-center gap-2 px-4 py-2 bg-[#1e293b] border border-[rgba(255,255,255,0.1)] rounded-lg text-[#94a3b8] hover:text-[#f8fafc] hover:border-[rgba(255,255,255,0.2)] transition-all text-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
                            在实验室查看完整报告
                          </Link>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className={`rounded-2xl px-4 py-3 ${
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white'
                        : 'bg-[#1e293b] border border-[rgba(255,255,255,0.08)] text-[#f8fafc]'
                    }`}>
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                      <p className={`text-[10px] mt-1.5 opacity-60 ${message.role === 'user' ? 'text-white/60' : 'text-[#64748b]'}`}>
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-[#1e293b] border border-[rgba(255,255,255,0.08)] rounded-2xl px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-1.5 h-1.5 bg-[#818cf8] rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-[#64748b]">智能代理执行中...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[rgba(255,255,255,0.08)] p-3 lg:p-4">
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => { setInput(e.target.value); setShowSuggestions(false); }}
                onKeyDown={handleKeyDown}
                placeholder="描述你的工程需求... (Ctrl+Enter 发送)"
                className="w-full bg-[#0f172a] border border-[rgba(255,255,255,0.1)] rounded-xl px-4 py-3 pr-28 text-[#f8fafc] placeholder-[#475569] focus:outline-none focus:border-[#6366f1] resize-none text-sm leading-relaxed min-h-[52px] max-h-[200px]"
                rows={1}
                disabled={isLoading}
              />
              <div className="absolute right-2 bottom-2 flex items-center gap-1.5">
                {isLoading && (
                  <button
                    onClick={() => { abortControllerRef.current?.abort(); setIsLoading(false); }}
                    className="p-2 rounded-lg bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 transition-all"
                    title="停止执行"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><rect x="6" y="6" width="12" height="12" rx="2" /></svg>
                  </button>
                )}
                <button
                  onClick={() => handleSend()}
                  disabled={isLoading || !input.trim()}
                  className="p-2 rounded-lg bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white hover:shadow-lg hover:shadow-[rgba(99,102,241,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  title="发送 (Ctrl+Enter)"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" /></svg>
                </button>
              </div>
            </div>
            <p className="text-[10px] text-[#475569] mt-2 text-center">
              Shift+Enter 换行 · Ctrl/Cmd+Enter 发送 · 左侧选择任务模板快速开始
            </p>
          </div>
        </main>

        <aside className={`${activeTab === 'intel' ? 'flex' : 'hidden'} md:flex w-full md:w-72 lg:w-80 border-l border-[rgba(255,255,255,0.08)] flex-col bg-[#0a0a0f]/50`}>
          <div className="p-4 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#f8fafc]">执行情报</h2>
          </div>
          <div className="flex-grow overflow-y-auto p-4 space-y-4">
            {lastExecution ? (
              <>
                <div className="space-y-2">
                  <h3 className="text-xs text-[#64748b] uppercase tracking-wider">当前状态</h3>
                  <div className="p-3 rounded-lg bg-[#1e293b]/50 border border-[rgba(255,255,255,0.06)]">
                    {currentRunningStep ? (
                      <div className="flex items-center gap-2">
                        <AgentBadge agent={currentRunningStep.agent} size="sm" />
                        <span className="text-xs text-[#94a3b8] truncate">{currentRunningStep.task}</span>
                      </div>
                    ) : completedSteps.length > 0 ? (
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-[#10b981]" />
                        <span className="text-xs text-[#10b981]">执行完成</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#64748b]">等待执行</span>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xs text-[#64748b] uppercase tracking-wider">Agent 序列</h3>
                  <div className="space-y-1.5">
                    {lastExecution.steps?.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 rounded-md bg-[rgba(255,255,255,0.02)]">
                        <div className={`w-1.5 h-1.5 rounded-full ${step.status === 'completed' ? 'bg-[#10b981]' : step.status === 'executing' ? 'bg-[#6366f1] animate-pulse' : 'bg-[#475569]'}`} />
                        <span className="text-xs text-[#94a3b8] truncate flex-grow">{step.agent}</span>
                        {step.status === 'completed' && (
                          <svg className="w-3 h-3 text-[#10b981] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {(lastExecution.memoriesUsed?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <h3 className="text-xs text-[#64748b] uppercase tracking-wider">记忆召回</h3>
                    <div className="p-3 rounded-lg bg-[rgba(99,102,241,0.05)] border border-[rgba(99,102,241,0.15)]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="text-sm">🧠</span>
                        <span className="text-xs text-[#818cf8] font-medium">
                          {lastExecution.memoriesUsed?.length} 条相关记忆
                        </span>
                      </div>
                      {lastExecution.memoryInfluenced && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(99,102,241,0.15)] text-[#818cf8]">
                          已影响执行策略
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <h3 className="text-xs text-[#64748b] uppercase tracking-wider">执行进度</h3>
                  <div className="p-3 rounded-lg bg-[#1e293b]/50 border border-[rgba(255,255,255,0.06)]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs text-[#94a3b8]">
                        {completedSteps.length} / {lastExecution.steps?.length || 0} 步骤
                      </span>
                      <span className="text-xs text-[#818cf8] font-mono">
                        {lastExecution.steps?.length ? Math.round((completedSteps.length / lastExecution.steps.length) * 100) : 0}%
                      </span>
                    </div>
                    <div className="w-full bg-[#1e293b] rounded-full h-1.5">
                      <div
                        className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${lastExecution.steps?.length ? (completedSteps.length / lastExecution.steps.length) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#475569]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                  </svg>
                </div>
                <p className="text-xs text-[#64748b]">执行任务后此处将显示实时情报</p>
              </div>
            )}
          </div>

          <div className="p-3 border-t border-[rgba(255,255,255,0.06)]">
            <Link href="/lab" className="flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-[#64748b] hover:text-[#818cf8] hover:bg-[rgba(99,102,241,0.05)] transition-all">
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
              查看完整实验室
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
