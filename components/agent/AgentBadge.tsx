const agentColors = {
  'Architect Agent': { bg: 'bg-[rgba(139,92,246,0.2)]', text: 'text-[#8b5cf6]', border: 'border-[rgba(139,92,246,0.3)]' },
  'Coding Agent': { bg: 'bg-[rgba(16,185,129,0.2)]', text: 'text-[#10b981]', border: 'border-[rgba(16,185,129,0.3)]' },
  'Debug Agent': { bg: 'bg-[rgba(245,158,11,0.2)]', text: 'text-[#f59e0b]', border: 'border-[rgba(245,158,11,0.3)]' },
  'Deploy Agent': { bg: 'bg-[rgba(99,102,241,0.2)]', text: 'text-[#6366f1]', border: 'border-[rgba(99,102,241,0.3)]' },
};

const agentIcons = {
  'Architect Agent': '🏗️',
  'Coding Agent': '💻',
  'Debug Agent': '🔍',
  'Deploy Agent': '🚀',
};

interface AgentBadgeProps {
  agent: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function AgentBadge({ agent, size = 'md' }: AgentBadgeProps) {
  const colors = agentColors[agent as keyof typeof agentColors] || agentColors['Architect Agent'];
  const icon = agentIcons[agent as keyof typeof agentIcons] || '🤖';

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1.5 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-2 rounded-full ${colors.bg} ${colors.text} ${colors.border} border ${sizeClasses[size]} font-medium`}>
      <span>{icon}</span>
      <span>{agent}</span>
    </span>
  );
}
