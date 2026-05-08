interface AgentStatusProps {
  status: 'thinking' | 'executing' | 'completed' | 'pending' | 'running' | 'failed';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export default function AgentStatus({ status, size = 'md', className = '' }: AgentStatusProps) {
  const statusConfig = {
    thinking: {
      text: '思考中',
      color: 'text-[#8B5CF6]',
      bg: 'bg-[rgba(139,92,246,0.2)]',
      dot: 'bg-[#8B5CF6]',
      animate: true,
    },
    executing: {
      text: '执行中',
      color: 'text-[#3B82F6]',
      bg: 'bg-[rgba(59,130,246,0.2)]',
      dot: 'bg-[#3B82F6]',
      animate: true,
    },
    pending: {
      text: '待执行',
      color: 'text-[#71717A]',
      bg: 'bg-[rgba(255,255,255,0.05)]',
      dot: 'bg-[#71717A]',
      animate: false,
    },
    running: {
      text: '运行中',
      color: 'text-[#3B82F6]',
      bg: 'bg-[rgba(59,130,246,0.2)]',
      dot: 'bg-[#3B82F6]',
      animate: true,
    },
    failed: {
      text: '失败',
      color: 'text-[#ef4444]',
      bg: 'bg-[rgba(239,68,68,0.2)]',
      dot: 'bg-[#ef4444]',
      animate: false,
    },
    completed: {
      text: '已完成',
      color: 'text-[#10B981]',
      bg: 'bg-[rgba(16,185,129,0.2)]',
      dot: 'bg-[#10B981]',
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
