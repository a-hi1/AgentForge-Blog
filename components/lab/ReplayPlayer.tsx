'use client';

import { useState, useEffect, useRef } from 'react';
import AgentBadge from '../agent/AgentBadge';
import AgentStatus from '../agent/AgentStatus';

interface ExecutionStep {
  step: number;
  agent: string;
  task: string;
  output: string;
  status: string;
  timestamp: string;
}

interface ReplayPlayerProps {
  steps: ExecutionStep[];
  onComplete?: () => void;
}

export default function ReplayPlayer({ steps, onComplete }: ReplayPlayerProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [currentOutput, setCurrentOutput] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const totalSteps = steps.length;
  const isFinished = currentStepIndex >= totalSteps - 1;

  // 播放控制
  const startPlay = () => {
    setIsPlaying(true);
    if (currentStepIndex < 0) {
      setCurrentStepIndex(0);
    }
  };

  const pausePlay = () => {
    setIsPlaying(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const resetPlay = () => {
    setIsPlaying(false);
    setCurrentStepIndex(-1);
    setCurrentOutput('');
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const goToNext = () => {
    if (currentStepIndex < totalSteps - 1) {
      const nextIndex = currentStepIndex + 1;
      setCurrentStepIndex(nextIndex);
      setCurrentOutput('');
      // 模拟输出动画
      simulateStepOutput(steps[nextIndex].output);
    }
  };

  const goToPrevious = () => {
    if (currentStepIndex > 0) {
      const prevIndex = currentStepIndex - 1;
      setCurrentStepIndex(prevIndex);
      setCurrentOutput(steps[prevIndex].output);
    } else if (currentStepIndex === 0) {
      resetPlay();
    }
  };

  // 模拟输出动画
  const simulateStepOutput = (fullOutput: string) => {
    let charIndex = 0;
    const chars = fullOutput.split('');
    
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (charIndex < chars.length) {
        setCurrentOutput(chars.slice(0, charIndex + 1).join(''));
        charIndex++;
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        // 步骤完成后的延迟
        setTimeout(() => {
          if (isPlaying && currentStepIndex < totalSteps - 1) {
            goToNext();
          } else if (isPlaying && currentStepIndex === totalSteps - 1) {
            setIsPlaying(false);
            if (onComplete) {
              onComplete();
            }
          }
        }, 1000 / speed);
      }
    }, 30 / speed);
  };

  // 当播放状态改变
  useEffect(() => {
    if (isPlaying && currentStepIndex >= 0) {
      const step = steps[currentStepIndex];
      if (!currentOutput) {
        simulateStepOutput(step.output);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentStepIndex]);

  const currentStep = currentStepIndex >= 0 ? steps[currentStepIndex] : null;

  return (
    <div className="p-6 glass-card rounded-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#f8fafc]">Execution Replay</h2>
        <div className="flex items-center gap-2">
          <span className="text-sm text-[#64748b]">Speed:</span>
          {[1, 2, 4].map((s) => (
            <button
              key={s}
              onClick={() => setSpeed(s)}
              className={`px-3 py-1 text-sm rounded-lg transition-all ${
                speed === s
                  ? 'bg-[#6366f1] text-white'
                  : 'bg-[#1e293b]/80 text-[#94a3b8]'
              }`}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>

      {/* 进度条 */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-[#64748b] mb-2">
          <span>Step {currentStepIndex + 1} of {totalSteps}</span>
          <span>{isFinished ? 'Complete' : isPlaying ? 'Playing...' : 'Paused'}</span>
        </div>
        <div className="h-2 bg-[#1e293b] rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] transition-all"
            style={{ width: `${((currentStepIndex + 1) / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* 当前步骤 */}
      {currentStep && (
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-4">
            <AgentBadge agent={currentStep.agent} />
            <AgentStatus status={isPlaying ? 'executing' : 'completed'} />
          </div>
          <h3 className="text-lg font-semibold text-[#f8fafc] mb-4">
            {currentStep.task}
          </h3>
          <div className="p-4 bg-[#0f172a] rounded-lg border border-[rgba(255,255,255,0.05)]">
            <pre className="text-[#94a3b8] whitespace-pre-wrap font-mono text-sm">
              {currentOutput || currentStep.output}
            </pre>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={resetPlay}
          className="px-4 py-2 bg-[#1e293b]/80 text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-all"
        >
          Reset
        </button>
        <button
          onClick={goToPrevious}
          disabled={currentStepIndex <= 0}
          className="px-6 py-2 bg-[#1e293b]/80 text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-all disabled:opacity-50"
        >
          Previous
        </button>
        {isPlaying ? (
          <button
            onClick={pausePlay}
            className="px-8 py-3 bg-[#ef4444] text-white rounded-lg font-semibold hover:bg-[#dc2626] transition-all"
          >
            Pause
          </button>
        ) : (
          <button
            onClick={startPlay}
            disabled={isFinished}
            className="px-8 py-3 bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] text-white rounded-lg font-semibold hover:shadow-lg hover:shadow-[rgba(99,102,241,0.3)] transition-all disabled:opacity-50"
          >
            {isFinished ? 'Replay' : 'Play'}
          </button>
        )}
        <button
          onClick={goToNext}
          disabled={currentStepIndex >= totalSteps - 1}
          className="px-6 py-2 bg-[#1e293b]/80 text-[#94a3b8] rounded-lg hover:bg-[#334155] transition-all disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}
