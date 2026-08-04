'use client';

import { memo } from 'react';

interface Step {
  id: string;
  title: string;
  output: string;
  type: string;
  status: string;
  timestamp: string;
}

const typeColors: Record<string, string> = {
  thinking: 'from-[#8B5CF6] to-[#3B82F6]',
  design: 'from-[#3B82F6] to-[#60A5FA]',
  code: 'from-[#10B981] to-[#34D399]',
  setup: 'from-[#F59E0B] to-[#FBBF24]',
};

const statusLabels: Record<string, string> = {
  completed: '已完成',
  in_progress: '执行中',
  pending: '待执行',
};

function renderMarkdown(text: string) {
  const lines = text.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeContent = '';
  let codeLang = '';
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1 my-2 text-[#A1A1AA] text-sm">
          {listItems.map((item, i) => (
            <li key={i} className="pl-2">{item}</li>
          ))}
        </ul>
      );
      listItems = [];
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre key={`code-${elements.length}`} className="bg-[#111113] rounded-lg p-4 my-3 overflow-x-auto border border-[rgba(255,255,255,0.06)]">
            <code className="text-[#A1A1AA] text-xs font-mono whitespace-pre">{codeContent.trim()}</code>
          </pre>
        );
        codeContent = '';
        codeLang = '';
        inCodeBlock = false;
      } else {
        flushList();
        inCodeBlock = true;
        codeLang = line.trim().slice(3);
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent += line + '\n';
      continue;
    }

    if (line.trim().startsWith('## ')) {
      flushList();
      elements.push(
        <h4 key={`h-${i}`} className="text-[#FAFAFA] font-semibold text-sm mt-4 mb-2 flex items-center gap-2">
          <span className="w-1 h-4 bg-[#3B82F6] rounded-full inline-block" />
          {line.trim().slice(3)}
        </h4>
      );
      continue;
    }

    if (line.trim().startsWith('### ')) {
      flushList();
      elements.push(
        <h5 key={`h3-${i}`} className="text-[#FAFAFA] font-medium text-sm mt-3 mb-1.5">
          {line.trim().slice(4)}
        </h5>
      );
      continue;
    }

    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      listItems.push(line.trim().slice(2));
      continue;
    }

    flushList();

    if (line.trim() === '') {
      elements.push(<div key={`br-${i}`} className="h-1.5" />);
      continue;
    }

    elements.push(
      <p key={`p-${i}`} className="text-[#A1A1AA] text-sm leading-relaxed my-1">{line}</p>
    );
  }

  flushList();
  if (inCodeBlock && codeContent.trim()) {
    elements.push(
      <pre key={`code-final`} className="bg-[#111113] rounded-lg p-4 my-3 overflow-x-auto border border-[rgba(255,255,255,0.06)]">
        <code className="text-[#A1A1AA] text-xs font-mono whitespace-pre">{codeContent.trim()}</code>
      </pre>
    );
  }

  return elements;
}

function extractSummary(output: string): string {
  const lines = output.split('\n').filter(l => l.trim() && !l.trim().startsWith('#') && !l.trim().startsWith('```'));
  return lines[0]?.slice(0, 120) || '';
}

function StepRendererInner({ step, isActive }: { step: Step; isActive: boolean }) {
  const summary = extractSummary(step.output);

  return (
    <div className={`p-5 rounded-xl border transition-all duration-300 ${
      isActive
        ? 'border-[#3B82F6]/40 bg-[rgba(24,24,27,0.8)] shadow-md'
        : 'border-[rgba(255,255,255,0.06)] bg-[rgba(24,24,27,0.5)]'
    }`}>
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${typeColors[step.type] || 'from-[#3B82F6] to-[#60A5FA]'} flex items-center justify-center text-white shrink-0`}>
          {step.status === 'completed' ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M5 13l4 4L19 7" /></svg>
          ) : step.status === 'in_progress' ? (
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle className="opacity-30" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" /><path className="opacity-90" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
          ) : (
            <span className="w-2 h-2 rounded-full bg-white/50" />
          )}
        </div>

        <div className="flex-grow min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-[#FAFAFA]">{step.title}</h3>
            <span className={`px-2 py-0.5 rounded text-[10px] font-medium ${
              step.status === 'completed'
                ? 'bg-[rgba(16,185,129,0.1)] text-[#10B981] border border-[rgba(16,185,129,0.2)]'
                : step.status === 'in_progress'
                ? 'bg-[rgba(59,130,246,0.1)] text-[#60A5FA] border border-[rgba(59,130,246,0.2)] animate-pulse'
                : 'bg-[rgba(255,255,255,0.05)] text-[#71717A] border border-[rgba(255,255,255,0.1)]'
            }`}>
              {statusLabels[step.status] || step.status}
            </span>
          </div>

          {summary && (
            <p className="text-[#71717A] text-xs mt-1 line-clamp-1">{summary}</p>
          )}
        </div>
      </div>

      <div className="ml-11">
        {renderMarkdown(step.output)}
      </div>
    </div>
  );
}

const StepRenderer = memo(StepRendererInner);
export default StepRenderer;
