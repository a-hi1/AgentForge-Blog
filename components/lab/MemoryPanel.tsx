'use client';

import { useState, memo } from 'react';

interface RetrievedMemory {
  memory: {
    id: string;
    execution_id: string;
    prompt: string;
    summary: string;
    lessons: any;
    tags: string[];
    importance_score: number;
    created_at: string;
  };
  relevance_score: number;
  relevance_reason: string;
}

interface MemoryPanelProps {
  memories?: RetrievedMemory[];
  memoryInfluenced?: boolean;
  adaptations?: string[];
  compact?: boolean;
}

function MemoryPanelInner({ 
  memories = [], 
  memoryInfluenced = false, 
  adaptations = [], 
  compact = false 
}: MemoryPanelProps) {
  const [expanded, setExpanded] = useState(!compact);
  
  if (!memories || memories.length === 0) {
    if (compact) {
      return null;
    }
    return (
      <div className="p-4 glass-card rounded-lg text-center">
        <div className="w-10 h-10 mx-auto mb-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(255,255,255,0.06)] flex items-center justify-center">
          <span className="text-lg">🧠</span>
        </div>
        <p className="text-[#71717A] text-sm">系统正在积累工程记忆</p>
        <p className="text-[#71717A] text-xs mt-1">执行更多任务后将建立记忆召回能力</p>
      </div>
    );
  }
  
  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div 
        className="p-4 flex items-center justify-between cursor-pointer hover:bg-[rgba(255,255,255,0.02)]"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <span className="text-lg">🧠</span>
          <div>
            <h3 className="text-[#FAFAFA] text-sm font-medium">
              {compact ? '记忆系统' : `已召回 ${memories.length} 条相关记忆`}
            </h3>
            {memoryInfluenced && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[rgba(59,130,246,0.15)] text-[#60A5FA] mt-1">
                已影响执行策略
              </span>
            )}
          </div>
        </div>
        <svg 
          className={`w-4 h-4 text-[#71717A] transition-transform ${expanded ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>
      
      {expanded && (
        <div className="p-4 border-t border-[rgba(255,255,255,0.06)] space-y-4">
          {adaptations.length > 0 && (
            <div>
              <h4 className="text-xs text-[#60A5FA] mb-2 font-medium">已应用的自适应策略</h4>
              <div className="space-y-1.5">
                {adaptations.map((adapt, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <svg className="w-3.5 h-3.5 text-[#3B82F6] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-[#A1A1AA] text-xs">{adapt}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h4 className="text-xs text-[#60A5FA] mb-2 font-medium">召回的记忆</h4>
            <div className="space-y-2.5">
              {memories.map((memory) => (
                <div key={memory.memory.id} className="p-3 bg-[#111113] rounded-lg border border-[rgba(255,255,255,0.04)]">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(59,130,246,0.15)] text-[#60A5FA] font-mono">
                      {(memory.relevance_score * 100).toFixed(0)}% 相关
                    </span>
                    <span className="text-[10px] text-[#71717A]">{memory.relevance_reason}</span>
                  </div>
                  <p className="text-xs text-[#A1A1AA] mb-2 line-clamp-2">
                    {memory.memory.prompt}
                  </p>
                  {memory.memory.tags && memory.memory.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {memory.memory.tags.map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.04)] text-[#71717A]">
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  {memory.memory.summary && (
                    <p className="text-[10px] text-[#71717A] mt-1.5 line-clamp-2">
                      {memory.memory.summary}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const MemoryPanel = memo(MemoryPanelInner);
export default MemoryPanel;
