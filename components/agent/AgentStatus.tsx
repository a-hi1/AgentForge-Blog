interface AgentStatusProps {
  status: 'thinking' | 'executing' | 'completed' | 'pending' | 'running' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AgentStatus({ status, size = 'md', className = '' }: AgentStatusProps) {
  const statusConfig = {
    thinking: {
      text: 'Thinking',
      color: 'text-[#8b5cf6]',
      bg: 'bg-[rgba(139,92,246,0.2)]',
      dot: 'bg-[#8b5cf6]',
      animate: true,
    },
    executing: {
      text: 'Executing',
      color: 'text-[#6366f1]',
      bg: 'bg-[rgba(99,102,241,0.2)]',
      dot: 'bg-[#6366f1]',
      animate: true,
    },
    pending: {
      text: 'Pending',
      color: 'text-[#64748b]',
      bg: 'bg-[rgba(255,255,255,0.05)]',
      dot: 'bg-[#64748b]',
      animate: false,
    },
    running: {
      text: 'Running',
      color: 'text-[#6366f1]',
      bg: 'bg-[rgba(99,102,241,0.2)]',
      dot: 'bg-[#6366f1]',
      animate: true,
    },
    failed: {
      text: 'Failed',
      color: 'text-[#ef4444]',
      bg: 'bg-[rgba(239,68,68,0.2)]',
      dot: 'bg-[#ef4444]',
      animate: false,
    },
    completed: {
      text: 'Completed',
      color: 'text-[#10b981]',
      bg: 'bg-[rgba(16,185,129,0.2)]',
      dot: 'bg-[#10b981]',
      animate: false,
    },
  };

  const config = statusConfig[status];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const dotSize = {
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full ${config.bg} ${config.color} border border-white/10 ${sizeClasses[size]} font-medium ${className}`}>
      <span className={`${dotSize[size]} rounded-full ${config.dot} ${config.animate ? 'animate-pulse' : ''}`}></span>
      <span>{config.text}</span>
    </span>
  );
}
