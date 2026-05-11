'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import {
  createConversation,
  getRecentConversations,
  addMessage,
  loadMessages,
  searchConversations,
  updateConversation,
  togglePin,
  removeConversation,
  addRepairEntry,
} from '@/lib/session/conversations';
import type { Conversation, ConversationMessage, RepairEntry } from '@/lib/session/conversations';
import { generateRepairPrompt } from '@/lib/prompt/refiner';
import type { RepairResult } from '@/lib/prompt/refiner';
import { promoteToSkill } from '@/lib/session/skillStore';

export default function PlaygroundPage() {
  const [currentPrompt, setCurrentPrompt] = useState('');
  const [isHydrated, setIsHydrated] = useState(false);
  const [activeTab, setActiveTab] = useState<'prompt' | 'sessions' | 'history'>('prompt');
  const [copied, setCopied] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [issueInput, setIssueInput] = useState('');
  const [isRepairing, setIsRepairing] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [convSearch, setConvSearch] = useState('');
  const [showConvSearch, setShowConvSearch] = useState(false);
  const [repairResults, setRepairResults] = useState<RepairEntry[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<number | null>(null);
  const [showDiff, setShowDiff] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const issueRef = useRef<HTMLTextAreaElement>(null);

  const WORKBENCH_KEY = 'agentforge-workbench-prompt';

  useEffect(() => {
    setIsHydrated(true);
    try {
      const saved = localStorage.getItem(WORKBENCH_KEY);
      if (saved) setCurrentPrompt(saved);
    } catch {}
  }, []);

  useEffect(() => {
    if (isHydrated) {
      const timer = setTimeout(() => {
        localStorage.setItem(WORKBENCH_KEY, currentPrompt);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPrompt, isHydrated]);

  useEffect(() => {
    setConversations(getRecentConversations(20));
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const prompt = urlParams.get('prompt');
      if (prompt) setCurrentPrompt(prompt);
      const convId = urlParams.get('conv');
      if (convId) {
        setActiveConvId(convId);
        const msgs = loadMessages(convId);
        if (msgs.length > 0) {
          const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
          if (lastAssistant) setCurrentPrompt(lastAssistant.content);
          const conv = getRecentConversations(20).find(c => c.id === convId);
          if (conv) {
            setRepairResults(conv.repairHistory || []);
          }
        }
      }
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!currentPrompt.trim()) return;
    try {
      await navigator.clipboard.writeText(currentPrompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = currentPrompt;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [currentPrompt]);

  const handleExportMd = useCallback(() => {
    if (!currentPrompt.trim()) return;
    const blob = new Blob([currentPrompt], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'prompt.md';
    a.click();
    URL.revokeObjectURL(url);
  }, [currentPrompt]);

  const handleSaveAsCandidate = useCallback(() => {
    if (!currentPrompt.trim()) return;
    let convId = activeConvId;
    if (!convId) {
      const conv = createConversation(currentPrompt);
      convId = conv.id;
      setActiveConvId(convId);
    }
    addMessage(convId, 'assistant', currentPrompt);
    updateConversation(convId, {
      originalPrompt: currentPrompt,
      status: 'draft',
    });
    setConversations(getRecentConversations(20));
  }, [currentPrompt, activeConvId]);

  const handleStartTask = useCallback(() => {
    if (!currentPrompt.trim()) return;
    handleCopy();
    handleSaveAsCandidate();
  }, [currentPrompt, handleCopy, handleSaveAsCandidate]);

  const handleGenerateRepair = useCallback(async () => {
    if (!issueInput.trim() || !currentPrompt.trim()) return;
    setIsRepairing(true);

    try {
      let convId = activeConvId;
      if (!convId) {
        const conv = createConversation(currentPrompt);
        convId = conv.id;
        setActiveConvId(convId);
      }

      addMessage(convId, 'user', issueInput);

      const result: RepairResult = generateRepairPrompt({
        originalPrompt: currentPrompt,
        issueDescription: issueInput,
        previousFixes: repairResults.map(r => r.fixStrategy),
      });

      addRepairEntry(convId, {
        issueDescription: issueInput,
        repairPrompt: result.repairPrompt,
        rootCause: result.rootCause,
        fixStrategy: result.fixStrategy,
      });

      addMessage(convId, 'assistant', result.repairPrompt);

      const updatedConv = getRecentConversations(20).find(c => c.id === convId);
      if (updatedConv) {
        setRepairResults(updatedConv.repairHistory);
      }

      setCurrentPrompt(result.repairPrompt);
      setIssueInput('');
      setConversations(getRecentConversations(20));
    } catch (e) {
      console.error('Repair generation failed:', e);
    } finally {
      setIsRepairing(false);
    }
  }, [issueInput, currentPrompt, activeConvId, repairResults]);

  const handleNewConversation = useCallback(() => {
    const conv = createConversation();
    setActiveConvId(conv.id);
    setCurrentPrompt('');
    setRepairResults([]);
    setIssueInput('');
    setConversations(getRecentConversations(20));
  }, []);

  const handleSelectConversation = useCallback((conv: Conversation) => {
    setActiveConvId(conv.id);
    const msgs = loadMessages(conv.id);
    const lastAssistant = [...msgs].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) setCurrentPrompt(lastAssistant.content);
    setRepairResults(conv.repairHistory || []);
  }, []);

  const filteredConversations = useMemo(() => {
    if (!convSearch.trim()) return conversations;
    return searchConversations(convSearch);
  }, [conversations, convSearch]);

  const lineCount = useMemo(() => {
    return currentPrompt.split('\n').length;
  }, [currentPrompt]);

  const statusLabel = useMemo(() => {
    if (!activeConvId) return null;
    const conv = conversations.find(c => c.id === activeConvId);
    if (!conv) return null;
    switch (conv.status) {
      case 'draft': return { text: '草稿', color: 'text-[#F59E0B]', bg: 'bg-[rgba(245,158,11,0.1)]' };
      case 'repairing': return { text: '修复中', color: 'text-[#3B82F6]', bg: 'bg-[rgba(59,130,246,0.1)]' };
      case 'verified': return { text: '已验证', color: 'text-[#10B981]', bg: 'bg-[rgba(16,185,129,0.1)]' };
      case 'promoted': return { text: '已沉淀', color: 'text-[#A78BFA]', bg: 'bg-[rgba(167,139,250,0.1)]' };
      default: return null;
    }
  }, [activeConvId, conversations]);

  return (
    <>
    <div className="min-h-[calc(100vh-80px)] flex flex-col">
      <div className="border-b border-[rgba(255,255,255,0.06)] px-4 py-3">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-[#A78BFA] animate-pulse" />
            <span className="text-[#A1A1AA] text-sm font-medium">Prompt Workbench</span>
            {statusLabel && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full ${statusLabel.bg} ${statusLabel.color}`}>
                {statusLabel.text}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={!currentPrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.1)] text-[#A1A1AA] hover:text-[#FAFAFA] hover:border-[rgba(255,255,255,0.2)] transition-all disabled:opacity-30"
            >
              {copied ? (
                <>
                  <svg className="w-3.5 h-3.5 text-[#10B981]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  已复制
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  复制 Prompt
                </>
              )}
            </button>
            <button
              onClick={handleStartTask}
              disabled={!currentPrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gradient-to-r from-[#3B82F6] to-[#8B5CF6] text-white hover:shadow-lg hover:shadow-[rgba(59,130,246,0.3)] transition-all disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              开始任务
            </button>
            <button
              onClick={handleSaveAsCandidate}
              disabled={!currentPrompt.trim()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-[rgba(255,255,255,0.1)] text-[#71717A] hover:text-[#A1A1AA] hover:border-[rgba(255,255,255,0.2)] transition-all disabled:opacity-30"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              保存为候选
            </button>
            <div className="flex md:hidden gap-1">
              {(['prompt', 'sessions', 'history'] as const).map(tab => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-1 text-xs rounded-md transition-all ${activeTab === tab ? 'bg-[rgba(139,92,246,0.2)] text-[#A78BFA]' : 'text-[#71717A] hover:text-[#A1A1AA]'}`}
                >
                  {{ prompt: 'Prompt', sessions: '会话', history: '历史' }[tab]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-grow flex max-w-[1600px] mx-auto w-full">
        <aside className={`${activeTab === 'sessions' ? 'flex' : 'hidden'} md:flex w-full md:w-60 lg:w-72 border-r border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50`}>
          <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-semibold text-[#FAFAFA]">任务</h2>
              <button
                onClick={handleNewConversation}
                className="p-1.5 rounded-md bg-[rgba(139,92,246,0.15)] text-[#A78BFA] hover:bg-[rgba(139,92,246,0.25)] transition-all"
                title="新建任务"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
            {showConvSearch ? (
              <div className="flex items-center gap-1.5">
                <input
                  value={convSearch}
                  onChange={e => setConvSearch(e.target.value)}
                  placeholder="搜索任务..."
                  className="flex-1 bg-[rgba(255,255,255,0.05)] border border-[rgba(255,255,255,0.08)] rounded-md px-2 py-1 text-xs text-[#A1A1AA] placeholder-[#52525B] focus:outline-none focus:border-[#A78BFA]"
                  autoFocus
                />
                <button onClick={() => { setShowConvSearch(false); setConvSearch(''); }} className="text-[#52525B] hover:text-[#71717A]">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ) : (
              <button onClick={() => setShowConvSearch(true)} className="flex items-center gap-1.5 text-[10px] text-[#52525B] hover:text-[#71717A] transition-colors">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                搜索
              </button>
            )}
          </div>
          <div className="flex-grow overflow-y-auto p-2 space-y-0.5">
            {filteredConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <p className="text-xs text-[#52525B]">暂无任务</p>
                <button onClick={handleNewConversation} className="mt-2 text-xs text-[#A78BFA] hover:text-[#8B5CF6] transition-colors">
                  创建新任务
                </button>
              </div>
            ) : (
              filteredConversations.map(conv => {
                const convStatus = (() => {
                  switch (conv.status) {
                    case 'draft': return { icon: '📝', label: '草稿', color: 'text-[#F59E0B]' };
                    case 'repairing': return { icon: '🔧', label: '修复中', color: 'text-[#3B82F6]' };
                    case 'verified': return { icon: '✅', label: '已验证', color: 'text-[#10B981]' };
                    case 'promoted': return { icon: '⭐', label: '已沉淀', color: 'text-[#A78BFA]' };
                    default: return { icon: '📝', label: '', color: 'text-[#71717A]' };
                  }
                })();

                return (
                  <button
                    key={conv.id}
                    onClick={() => handleSelectConversation(conv)}
                    className={`w-full text-left p-2.5 rounded-lg transition-all group ${
                      activeConvId === conv.id
                        ? 'bg-[rgba(139,92,246,0.1)] border border-[rgba(139,92,246,0.2)]'
                        : 'hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      {conv.pinned && (
                        <svg className="w-3 h-3 text-[#F59E0B] shrink-0" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M16 12V4h1V2H7v2h1v8l-2 2v2h5.2v6h1.6v-6H18v-2l-2-2z" />
                        </svg>
                      )}
                      <span className="text-[10px]">{convStatus.icon}</span>
                      <span className="text-xs font-medium text-[#FAFAFA] truncate flex-1">{conv.title}</span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={e => { e.stopPropagation(); togglePin(conv.id); setConversations(getRecentConversations(20)); }}
                          className="p-0.5 rounded text-[#52525B] hover:text-[#F59E0B]"
                          title={conv.pinned ? '取消置顶' : '置顶'}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                          </svg>
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); removeConversation(conv.id); setConversations(getRecentConversations(20)); if (activeConvId === conv.id) { setActiveConvId(null); setCurrentPrompt(''); setRepairResults([]); } }}
                          className="p-0.5 rounded text-[#52525B] hover:text-[#EF4444]"
                          title="删除"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${convStatus.color}`}>{convStatus.label}</span>
                      <span className="text-[10px] text-[#3f3f46]">·</span>
                      <span className="text-[10px] text-[#52525B]">
                        {new Date(conv.updatedAt).toLocaleDateString() === new Date().toLocaleDateString()
                          ? new Date(conv.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(conv.updatedAt).toLocaleDateString()
                        }
                      </span>
                      {conv.repairHistory && conv.repairHistory.length > 0 && (
                        <>
                          <span className="text-[10px] text-[#3f3f46]">·</span>
                          <span className="text-[10px] text-[#52525B]">v{conv.currentVersion}</span>
                        </>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        <main className={`${activeTab === 'prompt' ? 'flex' : 'hidden'} md:flex flex-col flex-grow min-w-0`}>
          <div className="flex-grow overflow-y-auto flex flex-col">
            <div className={`${fullscreen ? 'fixed inset-0 z-50 bg-[#0A0A0C] flex flex-col' : 'flex-grow'} flex flex-col`}>
              <div className="flex items-center justify-between px-4 py-2 border-b border-[rgba(255,255,255,0.06)]">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#71717A]">Current Prompt</span>
                  <span className="text-[10px] text-[#52525B]">·</span>
                  <span className="text-[10px] text-[#52525B]">{lineCount} 行</span>
                  {activeConvId && (
                    <>
                      <span className="text-[10px] text-[#52525B]">·</span>
                      <span className="text-[10px] text-[#52525B]">v{conversations.find(c => c.id === activeConvId)?.currentVersion || 1}</span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setShowDiff(!showDiff)}
                    disabled={repairResults.length === 0}
                    className={`p-1.5 rounded-md text-xs transition-all ${showDiff ? 'bg-[rgba(139,92,246,0.15)] text-[#A78BFA]' : 'text-[#52525B] hover:text-[#71717A]'} disabled:opacity-30`}
                    title="显示版本差异"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                    </svg>
                  </button>
                  <button
                    onClick={handleExportMd}
                    disabled={!currentPrompt.trim()}
                    className="p-1.5 rounded-md text-[#52525B] hover:text-[#71717A] transition-all disabled:opacity-30"
                    title="导出 Markdown"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setFullscreen(!fullscreen)}
                    className="p-1.5 rounded-md text-[#52525B] hover:text-[#71717A] transition-all"
                    title={fullscreen ? '退出全屏' : '全屏'}
                  >
                    {fullscreen ? (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex-grow flex overflow-hidden">
                <div className="flex-grow flex">
                  <div className="w-12 shrink-0 bg-[rgba(255,255,255,0.02)] border-r border-[rgba(255,255,255,0.04)] overflow-y-auto py-3 text-right pr-2 select-none">
                    {Array.from({ length: lineCount }, (_, i) => (
                      <div key={i} className="text-[10px] text-[#3f3f46] leading-[1.7] h-[1.7em]">
                        {i + 1}
                      </div>
                    ))}
                  </div>
                  <textarea
                    ref={textareaRef}
                    value={currentPrompt}
                    onChange={e => setCurrentPrompt(e.target.value)}
                    className="flex-grow bg-transparent text-[#D4D4D8] text-sm font-mono leading-[1.7] p-3 resize-none focus:outline-none placeholder-[#3f3f46] min-h-full"
                    placeholder="在此输入或粘贴你的 Prompt...&#10;&#10;支持 Markdown 格式，可直接复制到 Cursor / Claude / GPT 使用"
                    spellCheck={false}
                  />
                </div>

                {showDiff && selectedVersion !== null && (
                  <div className="w-1/2 border-l border-[rgba(255,255,255,0.06)] overflow-y-auto p-4">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs text-[#71717A]">v{selectedVersion} 对比</span>
                      <button onClick={() => setShowDiff(false)} className="text-[#52525B] hover:text-[#71717A]">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                    <pre className="text-xs text-[#A1A1AA] whitespace-pre-wrap font-mono leading-relaxed">
                      {repairResults.find(r => r.version === selectedVersion)?.repairPrompt || ''}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-[rgba(255,255,255,0.06)] p-4 bg-[#09090B]/80">
              <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-4 h-4 text-[#F59E0B]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <span className="text-xs text-[#A1A1AA] font-medium">遇到问题？粘贴报错，生成修复 Prompt</span>
                </div>
                <div className="flex gap-2">
                  <textarea
                    ref={issueRef}
                    value={issueInput}
                    onChange={e => setIssueInput(e.target.value)}
                    placeholder="描述你在 Cursor / Claude 中遇到的问题，粘贴报错、日志、失败现象..."
                    className="flex-grow bg-[#111113] border border-[rgba(255,255,255,0.1)] rounded-lg px-3 py-2.5 text-sm text-[#FAFAFA] placeholder-[#52525B] focus:outline-none focus:border-[#F59E0B] resize-none min-h-[44px] max-h-[120px]"
                    rows={2}
                  />
                  <button
                    onClick={handleGenerateRepair}
                    disabled={!issueInput.trim() || !currentPrompt.trim() || isRepairing}
                    className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium bg-gradient-to-r from-[#F59E0B] to-[#EF4444] text-white hover:shadow-lg hover:shadow-[rgba(245,158,11,0.3)] transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    {isRepairing ? (
                      <span className="flex items-center gap-1.5">
                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        生成中...
                      </span>
                    ) : '生成修复 Prompt'}
                  </button>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[10px] text-[#52525B]">
                    {issueInput.length > 0 ? `${issueInput.length} 字符` : 'Ctrl+Enter 生成'}
                  </span>
                  <div className="flex items-center gap-2">
                    {['Cursor 报错', '构建失败', '类型错误', '运行时错误'].map(tag => (
                      <button
                        key={tag}
                        onClick={() => setIssueInput(prev => prev ? `${prev}\n${tag}` : tag)}
                        className="px-2 py-0.5 text-[10px] rounded border border-[rgba(255,255,255,0.06)] text-[#52525B] hover:text-[#A1A1AA] hover:border-[rgba(255,255,255,0.15)] transition-all"
                      >
                        {tag}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </main>

        <aside className={`${activeTab === 'history' ? 'flex' : 'hidden'} md:flex w-full md:w-64 lg:w-72 border-l border-[rgba(255,255,255,0.06)] flex-col bg-[#09090B]/50`}>
          <div className="p-3 border-b border-[rgba(255,255,255,0.06)]">
            <h2 className="text-sm font-semibold text-[#FAFAFA] mb-2">Repair History</h2>
            <span className="text-[10px] text-[#52525B]">
              {repairResults.length > 0 ? `${repairResults.length} 次修复` : '暂无修复记录'}
            </span>
          </div>
          <div className="flex-grow overflow-y-auto p-4">
            {repairResults.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-12 h-12 rounded-xl bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center mb-3">
                  <svg className="w-6 h-6 text-[#71717A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-[#71717A] mb-1">暂无修复记录</p>
                <p className="text-[10px] text-[#52525B]">反馈问题后将在此显示修复时间线</p>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.15)]">
                  <div className="w-6 h-6 rounded-full bg-[rgba(167,139,250,0.2)] flex items-center justify-center text-xs text-[#A78BFA] font-bold">
                    v1
                  </div>
                  <div>
                    <span className="text-xs text-[#FAFAFA]">原始 Prompt</span>
                    <p className="text-[10px] text-[#52525B]">初始版本</p>
                  </div>
                </div>

                {repairResults.map((entry, i) => (
                  <div key={entry.version}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <div className="w-px h-3 bg-[rgba(255,255,255,0.06)] ml-3" />
                      <svg className="w-3 h-3 text-[#3f3f46]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                      </svg>
                    </div>
                    <button
                      onClick={() => {
                        setSelectedVersion(entry.version);
                        setShowDiff(true);
                      }}
                      className={`w-full text-left p-2 rounded-lg transition-all ${
                        selectedVersion === entry.version
                          ? 'bg-[rgba(245,158,11,0.1)] border border-[rgba(245,158,11,0.2)]'
                          : 'hover:bg-[rgba(255,255,255,0.03)] border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 rounded-full bg-[rgba(245,158,11,0.2)] flex items-center justify-center text-xs text-[#F59E0B] font-bold">
                          v{entry.version}
                        </div>
                        <span className="text-xs text-[#FAFAFA]">修复 Prompt</span>
                      </div>
                      <p className="text-[10px] text-[#52525B] pl-8 truncate">{entry.rootCause}</p>
                      <p className="text-[10px] text-[#71717A] pl-8 mt-0.5">
                        {new Date(entry.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </button>
                  </div>
                ))}

                <button
                  onClick={() => {
                    if (!activeConvId) return;
                    const conv = conversations.find(c => c.id === activeConvId);
                    if (!conv) return;
                    updateConversation(activeConvId, { status: 'verified' });
                    setConversations(getRecentConversations(20));
                  }}
                  disabled={!activeConvId || repairResults.length === 0}
                  className="w-full mt-4 flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-[#10B981] hover:bg-[rgba(16,185,129,0.05)] border border-[rgba(16,185,129,0.15)] transition-all disabled:opacity-30"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  标记为已验证
                </button>

                <button
                  onClick={() => {
                    if (!activeConvId) return;
                    const conv = conversations.find(c => c.id === activeConvId);
                    if (!conv || !conv.originalPrompt) return;
                    promoteToSkill({
                      title: conv.title,
                      category: 'general',
                      sourceConversationId: conv.id,
                      prompt: conv.originalPrompt,
                      repairHistory: conv.repairHistory.map(r => r.fixStrategy),
                      successRate: 0.8,
                      usageCount: 1,
                      stabilityScore: 0.7,
                      manualConfirmed: true,
                    });
                    updateConversation(activeConvId, { status: 'promoted' });
                    setConversations(getRecentConversations(20));
                  }}
                  disabled={!activeConvId || repairResults.length === 0}
                  className="w-full flex items-center justify-center gap-2 p-2 rounded-lg text-xs text-[#A78BFA] hover:bg-[rgba(167,139,250,0.05)] border border-[rgba(167,139,250,0.15)] transition-all disabled:opacity-30"
                >
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                  沉淀为 Skill
                </button>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
    </>
  );
}
