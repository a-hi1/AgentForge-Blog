'use client';

import { useState, useCallback, useEffect } from 'react';
import { getPromptById, getPromptHistory, PromptAsset } from '@/lib/prompt/history';
import { generateRepairPrompt, RepairInput } from '@/lib/prompt/refiner';

export default function PlaygroundPage() {
  const [savedPrompts, setSavedPrompts] = useState<PromptAsset[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [currentPrompt, setCurrentPrompt] = useState('');

  const [errorLog, setErrorLog] = useState('');
  const [failedFile, setFailedFile] = useState('');
  const [expectedBehavior, setExpectedBehavior] = useState('');
  const [actualBehavior, setActualBehavior] = useState('');

  const [repairPrompt, setRepairPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getPromptHistory({ limit: 100 }).then(setSavedPrompts).catch(() => setSavedPrompts([]));
  }, []);

  const handleLoad = useCallback(async () => {
    if (!selectedId) return;
    const p = await getPromptById(selectedId);
    if (p) setCurrentPrompt(p.fullPrompt);
  }, [selectedId]);

  const handleGenerateRepair = useCallback(() => {
    if (!currentPrompt.trim() || !errorLog.trim()) return;

    setIsGenerating(true);

    setTimeout(() => {
      const input: RepairInput = {
        originalPrompt: currentPrompt,
        failedStep: failedFile || '执行阶段',
        error: errorLog.trim().split('\n')[0].slice(0, 200),
        file: failedFile || undefined,
        expectedBehavior: expectedBehavior || undefined,
        actualBehavior: actualBehavior || undefined,
        log: errorLog.trim() || undefined,
      };

      const output = generateRepairPrompt(input);
      setRepairPrompt(output.repairPrompt);
      setIsGenerating(false);
    }, 50);
  }, [currentPrompt, errorLog, failedFile, expectedBehavior, actualBehavior]);

  const handleCopy = async () => {
    if (!repairPrompt) return;
    try {
      await navigator.clipboard.writeText(repairPrompt);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = repairPrompt;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="mb-10 animate-fade-up">
        <span className="badge badge-amber mb-4">Workbench</span>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
          结构化修复
        </h1>
        <p className="mt-2 text-sm text-[var(--text-secondary)] max-w-2xl">
          从历史 Prompt 与错误日志出发，生成最小可执行的修复指令。
        </p>
      </div>

      <div className="glass-card mesh-panel mb-6 p-5 sm:p-6 animate-fade-up">
        <h2 className="text-sm font-semibold text-white mb-3">选择 Prompt</h2>
        <div className="flex flex-col sm:flex-row gap-3">
          <label htmlFor="prompt-select" className="sr-only">历史 Prompt</label>
          <select
            id="prompt-select"
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-field flex-1"
          >
            <option value="">选择历史记录</option>
            {savedPrompts.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLoad}
            disabled={!selectedId}
            className="btn-secondary shrink-0"
          >
            加载
          </button>
        </div>
        {currentPrompt && (
          <div className="mt-3 rounded-xl bg-white/[0.03] border border-[var(--border)] p-3 max-h-32 overflow-y-auto">
            <p className="text-xs text-[var(--text-tertiary)] whitespace-pre-wrap font-mono">
              {currentPrompt.slice(0, 500)}
              {currentPrompt.length > 500 ? '…' : ''}
            </p>
          </div>
        )}
      </div>

      <div className="glass-card mb-6 p-5 sm:p-6 animate-fade-up animate-delay-1">
        <h2 className="text-sm font-semibold text-white mb-4">错误信息</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="error-log" className="mb-1.5 block text-xs text-[var(--text-muted)]">
              错误日志 *
            </label>
            <textarea
              id="error-log"
              value={errorLog}
              onChange={(e) => setErrorLog(e.target.value)}
              placeholder="粘贴错误信息或日志..."
              className="input-field resize-none font-mono"
              rows={4}
            />
          </div>
          <div>
            <label htmlFor="failed-file" className="mb-1.5 block text-xs text-[var(--text-muted)]">
              失败文件
            </label>
            <input
              id="failed-file"
              value={failedFile}
              onChange={(e) => setFailedFile(e.target.value)}
              placeholder="src/features/auth/auth.store.ts"
              className="input-field font-mono"
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="expected" className="mb-1.5 block text-xs text-[var(--text-muted)]">
                期望行为
              </label>
              <textarea
                id="expected"
                value={expectedBehavior}
                onChange={(e) => setExpectedBehavior(e.target.value)}
                placeholder="点击登录后跳转到首页"
                className="input-field resize-none"
                rows={3}
              />
            </div>
            <div>
              <label htmlFor="actual" className="mb-1.5 block text-xs text-[var(--text-muted)]">
                实际行为
              </label>
              <textarea
                id="actual"
                value={actualBehavior}
                onChange={(e) => setActualBehavior(e.target.value)}
                placeholder="点击后无反应，控制台报错"
                className="input-field resize-none"
                rows={3}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mb-6 animate-fade-up animate-delay-2">
        <button
          type="button"
          onClick={handleGenerateRepair}
          disabled={!currentPrompt.trim() || !errorLog.trim() || isGenerating}
          className="btn-primary w-full sm:w-auto"
        >
          {isGenerating ? '正在分析…' : '生成精准修复指令'}
        </button>
      </div>

      {repairPrompt && (
        <div className="glass-card p-5 sm:p-6 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-semibold text-white">修复指令</h2>
            <button type="button" onClick={handleCopy} className="btn-secondary text-xs">
              {copied ? '已复制' : '复制'}
            </button>
          </div>
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-5 max-h-[500px] overflow-y-auto">
            <pre className="whitespace-pre-wrap font-mono text-sm text-[var(--text-secondary)] leading-relaxed">
              {repairPrompt}
            </pre>
          </div>
        </div>
      )}

      {!repairPrompt && !isGenerating && (
        <div className="glass-card text-center py-14 px-6">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.034 1.105-.112 1.649-.236 1.44-.329 2.594-1.482 2.923-2.923.334-1.46.066-2.953-.845-3.864l-2.18-2.18c-.911-.911-2.404-1.179-3.864-.845-1.44.329-2.594 1.482-2.923 2.923a10.07 10.07 0 00-.236 1.649" />
            </svg>
          </div>
          <p className="text-sm text-[var(--text-secondary)]">结构化输入错误信息，生成精准修复指令</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">先加载历史 Prompt，再粘贴错误日志</p>
        </div>
      )}
    </div>
  );
}
