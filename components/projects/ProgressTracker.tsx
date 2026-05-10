'use client';

import { useState } from 'react';
import { ProjectPhase } from '@/lib/projects/projectState';

interface ProgressTrackerProps {
  phases: ProjectPhase[];
}

export default function ProgressTracker({ phases }: ProgressTrackerProps) {
  const [selectedPhase, setSelectedPhase] = useState<string | null>(null);

  return (
    <div className="p-6 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
      <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">开发阶段</h2>
      
      <div className="space-y-4">
        {phases.map((phase, index) => (
          <div 
            key={phase.id}
            className={`p-4 rounded-lg border transition-all cursor-pointer ${
              selectedPhase === phase.id
                ? 'border-[rgba(59,130,246,0.35)] bg-[rgba(59,130,246,0.05)]'
                : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(255,255,255,0.15)]'
            }`}
            onClick={() => setSelectedPhase(selectedPhase === phase.id ? null : phase.id)}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  phase.status === 'completed'
                    ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                    : phase.status === 'in-progress'
                    ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA]'
                    : 'bg-[rgba(255,255,255,0.05)] text-[#71717A]'
                }`}>
                  {phase.status === 'completed' ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : phase.status === 'in-progress' ? (
                    <div className="w-2 h-2 rounded-full bg-current animate-pulse" />
                  ) : (
                    <span className="text-xs font-medium">{index + 1}</span>
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-medium text-[#FAFAFA]">{phase.name}</h3>
                  <p className="text-xs text-[#71717A]">{phase.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs px-2 py-1 rounded-full ${
                  phase.status === 'completed'
                    ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                    : phase.status === 'in-progress'
                    ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA]'
                    : 'bg-[rgba(255,255,255,0.05)] text-[#71717A]'
                }`}>
                  {phase.status === 'completed' ? '已完成' : phase.status === 'in-progress' ? '进行中' : '待开始'}
                </span>
                <span className="text-sm font-semibold text-[#A1A1AA]">
                  {phase.completionPercentage}%
                </span>
              </div>
            </div>
            
            <div className="h-2 w-full bg-[rgba(255,255,255,0.06)] rounded-full overflow-hidden">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  phase.status === 'completed'
                    ? 'bg-[#10B981]'
                    : phase.status === 'in-progress'
                    ? 'bg-[#3B82F6]'
                    : 'bg-[#52525B]'
                }`}
                style={{ width: `${phase.completionPercentage}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
