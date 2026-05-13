'use client';

import { useState, useCallback, useEffect } from 'react';
import { getPromptById, getPromptHistory, PromptAsset } from '@/lib/prompt/history';
import { generateRepairPrompt, formatRepairForCopy, RepairInput } from '@/lib/prompt/refiner';

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

  const handleCopy = () => {
    if (repairPrompt) {
      navigator.clipboard.writeText(repairPrompt);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white">Workbench</h1>
          <p className="mt-1 text-sm text-slate-400">结构化修复 — 精准定位问题，生成最小修复指令</p>
        </div>

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-3 text-sm font-semibold text-slate-300">选择 Prompt</h2>
          <div className="flex gap-3">
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white focus:border-cyan-500 focus:outline-none"
            >
              <option value="">选择历史记录</option>
              {savedPrompts.map(p => (
                <option key={p.id} value={p.id}>{p.title}</option>
              ))}
            </select>
            <button
              onClick={handleLoad}
              disabled={!selectedId}
              className="rounded-lg bg-slate-700 px-4 py-2.5 text-sm text-white hover:bg-slate-600 disabled:opacity-40 transition"
            >
              加载
            </button>
          </div>
          {currentPrompt && (
            <div className="mt-3 rounded-lg bg-slate-800/50 p-3 max-h-32 overflow-y-auto">
              <p className="text-xs text-slate-400 whitespace-pre-wrap">{currentPrompt.slice(0, 500)}{currentPrompt.length > 500 ? '...' : ''}</p>
            </div>
          )}
        </div>

        <div className="mb-6 rounded-xl border border-slate-700 bg-slate-900 p-5">
          <h2 className="mb-4 text-sm font-semibold text-slate-300">错误信息</h2>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">错误日志 *</label>
              <textarea
                value={errorLog}
                onChange={(e) => setErrorLog(e.target.value)}
                placeholder="粘贴错误信息或日志..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-red-500 focus:outline-none resize-none font-mono"
                rows={4}
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-slate-500">失败文件</label>
              <input
                value={failedFile}
                onChange={(e) => setFailedFile(e.target.value)}
                placeholder="src/features/auth/auth.store.ts"
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500 focus:outline-none font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">期望行为</label>
                <textarea
                  value={expectedBehavior}
                  onChange={(e) => setExpectedBehavior(e.target.value)}
                  placeholder="点击登录后跳转到首页"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs text-slate-500">实际行为</label>
                <textarea
                  value={actualBehavior}
                  onChange={(e) => setActualBehavior(e.target.value)}
                  placeholder="点击后无反应，控制台报错"
                  className="w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm text-white placeholder-slate-600 focus:border-red-500 focus:outline-none resize-none"
                  rows={3}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <button
            onClick={handleGenerateRepair}
            disabled={!currentPrompt.trim() || !errorLog.trim() || isGenerating}
            className="w-full rounded-lg bg-amber-600 px-6 py-3 text-sm font-medium text-white hover:bg-amber-500 disabled:opacity-40 transition"
          >
            {isGenerating ? '正在分析...' : '生成精准修复指令'}
          </button>
        </div>

        {repairPrompt && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-base font-semibold text-white">修复指令</h2>
              <button
                onClick={handleCopy}
                className="rounded-lg border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 transition"
              >
                复制
              </button>
            </div>
            <div className="rounded-xl border border-amber-800/50 bg-slate-900 p-5 max-h-[500px] overflow-y-auto">
              <pre className="whitespace-pre-wrap font-mono text-sm text-slate-200 leading-relaxed">{repairPrompt}</pre>
            </div>
          </div>
        )}

        {!repairPrompt && !isGenerating && (
          <div className="mt-12 text-center text-slate-600">
            <div className="text-4xl mb-3">🔧</div>
            <p>结构化输入错误信息，生成精准修复指令</p>
          </div>
        )}
      </div>
    </div>
  );
}
