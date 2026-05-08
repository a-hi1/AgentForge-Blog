'use client';

import { Step } from '@/lib/types/execution';

interface CapabilityStoryboardProps {
  steps: Step[];
  memoriesUsed: any[];
  memoryInfluenced: boolean;
  adaptations: string[];
}

const agentExplanations: Record<string, string> = {
  'Architect Agent': '架构设计阶段：分析系统需求，规划模块结构和技术选型方案。',
  'Coding Agent': '代码生成阶段：基于架构方案编写生产级工程代码，包含错误处理和类型安全。',
  'Debug Agent': '质量审查阶段：验证代码质量，检查边界条件，确保工程规范达标。',
  'Optimization Agent': '性能优化阶段：分析性能瓶颈，实施缓存策略和查询优化。',
  'Deploy Agent': '部署规划阶段：制定容器化部署方案和 CI/CD 管线配置。',
};

export default function CapabilityStoryboard({ steps, memoriesUsed, memoryInfluenced, adaptations }: CapabilityStoryboardProps) {
  if (steps.length === 0) {
    return (
      <div className="glass-card rounded-xl p-6">
        <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">执行解释</h3>
        <p className="text-[#64748b] text-sm">
          启动场景后，此处将实时解释每个代理的执行逻辑和决策依据。
        </p>
      </div>
    );
  }

  const currentStep = steps[steps.length - 1];

  return (
    <div className="glass-card rounded-xl p-6 space-y-5">
      <h3 className="text-lg font-semibold text-[#f8fafc]">执行解释</h3>

      {memoryInfluenced && (
        <div className="p-3 bg-[rgba(99,102,241,0.08)] border border-[rgba(99,102,241,0.2)] rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm">🧠</span>
            <span className="text-sm text-[#818cf8] font-medium">记忆系统已介入</span>
          </div>
          <p className="text-xs text-[#64748b]">
            系统从历史执行中召回了 {memoriesUsed.length} 条相关记忆，已据此调整执行策略。
          </p>
        </div>
      )}

      {currentStep && (
        <div className="p-4 bg-[#0f172a] rounded-lg border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs text-[#64748b] font-mono">步骤 {currentStep.step}</span>
            <span className="text-xs text-[#818cf8]">{currentStep.agent}</span>
          </div>
          <p className="text-sm text-[#94a3b8] leading-relaxed">
            {agentExplanations[currentStep.agent] || `正在执行：${currentStep.task}`}
          </p>
        </div>
      )}

      {adaptations.length > 0 && (
        <div className="space-y-1.5">
          <h4 className="text-xs text-[#64748b] uppercase tracking-wider">自适应调整</h4>
          {adaptations.map((adaptation, i) => (
            <div key={i} className="flex items-start gap-2 p-2 bg-[rgba(139,92,246,0.05)] rounded-md">
              <span className="text-[#a78bfa] text-xs mt-0.5">→</span>
              <span className="text-xs text-[#94a3b8]">{adaptation}</span>
            </div>
          ))}
        </div>
      )}

      <div className="pt-2 border-t border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-[#64748b]">执行进度</span>
          <span className="text-xs text-[#818cf8] font-mono">
            {steps.filter(s => s.status === 'completed').length}/{steps.length}
          </span>
        </div>
        <div className="w-full bg-[#1e293b] rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-[#6366f1] to-[#8b5cf6] h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${steps.length > 0 ? (steps.filter(s => s.status === 'completed').length / steps.length) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
