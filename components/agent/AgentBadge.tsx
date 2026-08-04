const agentColors = {
  'Architect Agent': { bg: 'bg-[rgba(139,92,246,0.2)]', text: 'text-[#8B5CF6]', border: 'border-[rgba(139,92,246,0.3)]' },
  'Coding Agent': { bg: 'bg-[rgba(16,185,129,0.2)]', text: 'text-[#10B981]', border: 'border-[rgba(16,185,129,0.3)]' },
  'Debug Agent': { bg: 'bg-[rgba(245,158,11,0.2)]', text: 'text-[#F59E0B]', border: 'border-[rgba(245,158,11,0.3)]' },
  'Deploy Agent': { bg: 'bg-[rgba(59,130,246,0.2)]', text: 'text-[#3B82F6]', border: 'border-[rgba(59,130,246,0.3)]' },
};

function AgentIcon({ agent, className = 'w-3.5 h-3.5' }: { agent: string; className?: string }) {
  const props = {
    className,
    fill: 'none',
    stroke: 'currentColor',
    viewBox: '0 0 24 24',
    'aria-hidden': true as const,
  };

  if (agent.includes('Architect')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    );
  }
  if (agent.includes('Coding')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  if (agent.includes('Debug')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    );
  }
  if (agent.includes('Deploy')) {
    return (
      <svg {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
      </svg>
    );
  }
  return (
    <svg {...props}>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  );
}

interface AgentBadgeProps {
  agent: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AgentBadge({ agent, size = 'md' }: AgentBadgeProps) {
  const colors = agentColors[agent as keyof typeof agentColors] || agentColors['Architect Agent'];

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  const iconSize = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full ${colors.bg} ${colors.text} ${colors.border} border ${sizeClasses[size]} font-medium`}>
      <AgentIcon agent={agent} className={iconSize[size]} />
      <span>{agent}</span>
    </span>
  );
}
