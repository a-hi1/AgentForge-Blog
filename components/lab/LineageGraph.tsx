'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Execution {
  id: string;
  prompt: string;
  timestamp: string;
  status?: string;
}

interface LineageGraphProps {
  executionId: string;
}

export default function LineageGraph({ executionId }: LineageGraphProps) {
  const [lineage, setLineage] = useState<Execution[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    loadLineage();
  }, [executionId]);
  
  async function loadLineage() {
    try {
      const response = await fetch(`/api/executions?lineage=${executionId}`);
      if (response.ok) {
        const data = await response.json();
        setLineage(data.lineage || [data]);
      }
    } catch (error) {
      console.error('Failed to load lineage:', error);
    } finally {
      setLoading(false);
    }
  }
  
  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="w-8 h-8 border-2 border-[#6366f1]/30 border-t-[#6366f1] rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-[#94a3b8]">Loading lineage...</p>
      </div>
    );
  }
  
  if (lineage.length === 0) {
    return (
      <div className="p-8 text-center glass-card rounded-lg">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-[#94a3b8] mb-2">No lineage data available</p>
        <p className="text-[#64748b] text-sm">Run more executions to see relationships</p>
      </div>
    );
  }
  
  return (
    <div className="p-6 glass-card rounded-xl">
      <h3 className="text-xl font-semibold text-[#f8fafc] mb-6">Execution Lineage</h3>
      
      <div className="relative">
        {lineage.map((exec, index) => (
          <div key={exec.id} className="relative">
            {/* Connecting line */}
            {index < lineage.length - 1 && (
              <div className="absolute left-6 top-12 bottom-0 w-0.5 bg-gradient-to-b from-[#6366f1]/50 to-transparent"></div>
            )}
            
            <div className="flex items-start gap-4 pb-6">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 z-10 ${
                exec.id === executionId 
                  ? 'bg-gradient-to-br from-[#6366f1] to-[#8b5cf6]' 
                  : 'bg-[#1e293b] border border-white/10'
              }`}>
                {exec.id === executionId ? (
                  <span className="text-lg">🎯</span>
                ) : (
                  <span className="text-lg">📝</span>
                )}
              </div>
              
              <div className="flex-1">
                <Link 
                  href={`/lab/${exec.id}`}
                  className={`block p-4 rounded-lg border transition-all ${
                    exec.id === executionId 
                      ? 'border-[#6366f1] bg-[rgba(99,102,241,0.1)]' 
                      : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs text-[#818cf8] font-medium">
                      {new Date(exec.timestamp).toLocaleString()}
                    </span>
                    {exec.status && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        exec.status === 'completed' ? 'bg-green-500/20 text-green-400' : 
                        exec.status === 'failed' ? 'bg-red-500/20 text-red-400' : 
                        'bg-yellow-500/20 text-yellow-400'
                      }`}>
                        {exec.status}
                      </span>
                    )}
                  </div>
                  <p className="text-[#94a3b8] text-sm line-clamp-2">
                    {exec.prompt}
                  </p>
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
