interface Step {
  id: string;
  title: string;
  output: string;
  type: string;
  status: string;
  timestamp: string;
}

const typeColors = {
  thinking: 'from-[#8b5cf6] to-[#6366f1]',
  design: 'from-[#3b82f6] to-[#6366f1]',
  code: 'from-[#10b981] to-[#34d399]',
  setup: 'from-[#f59e0b] to-[#fbbf24]',
};

const typeBg = {
  thinking: 'bg-[rgba(139,92,246,0.1)]',
  design: 'bg-[rgba(99,102,241,0.1)]',
  code: 'bg-[rgba(16,185,129,0.1)]',
  setup: 'bg-[rgba(245,158,11,0.1)]',
};

export default function StepRenderer({ step, isActive }: { step: Step; isActive: boolean }) {
  return (
    <div className={`p-6 rounded-xl border transition-all duration-300 ${
      isActive 
        ? 'border-[#6366f1]/50 bg-[#1e293b]/80 shadow-lg'
        : 'border-[rgba(255,255,255,0.08)] bg-[#1e293b]/30'
    }`}>
      <div className="flex items-start gap-4">
        <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${typeColors[step.type as keyof typeof typeColors]} flex items-center justify-center text-white font-bold text-sm shrink-0`}>
          {step.status === 'completed' ? '✓' : step.status === 'in_progress' ? '…' : '○'}
        </div>
        
        <div className="flex-grow">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-semibold text-[#f8fafc]">
              {step.title}
            </h3>
            <span className={`px-2 py-1 rounded text-xs font-medium ${
              step.status === 'completed' 
                ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)]'
                : step.status === 'in_progress'
                ? 'bg-[rgba(99,102,241,0.1)] text-[#818cf8] border border-[rgba(99,102,241,0.2)] animate-pulse'
                : 'bg-[rgba(255,255,255,0.05)] text-[#64748b] border border-[rgba(255,255,255,0.1)]'
            }`}>
              {step.status === 'completed' ? 'Completed' : step.status === 'in_progress' ? 'In Progress' : 'Pending'}
            </span>
            <span className="text-[#64748b] text-xs">
              {new Date(step.timestamp).toLocaleTimeString()}
            </span>
          </div>
          
          <div className={`${typeBg[step.type as keyof typeof typeBg]} rounded-lg p-4 border border-[rgba(255,255,255,0.05)]`}>
            <pre className="text-[#94a3b8] whitespace-pre-wrap font-mono text-sm">
              {step.output}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
