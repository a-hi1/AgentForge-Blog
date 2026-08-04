import GlassCard from '@/components/shared/GlassCard';

interface AgentContribution {
  agent: string;
  percentage: number;
  color: string;
}

interface Project {
  id: string;
  name: string;
  description: string;
  techStack: string[];
  githubLink: string;
  demoLink?: string | null;
  status: string;
  agentContributions: AgentContribution[];
}

export default function ProjectCard({ project }: { project: Project }) {
  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-2 ${
              project.status === 'live' 
                ? 'bg-[rgba(16,185,129,0.1)] text-[#10b981] border border-[rgba(16,185,129,0.2)]' 
                : 'bg-[rgba(139,92,246,0.1)] text-[#8b5cf6] border border-[rgba(139,92,246,0.2)]'
            }`}>
              {project.status === 'live' ? 'Live' : 'Beta'}
            </span>
            <h3 className="text-xl font-semibold text-[#f8fafc] mb-2">
              {project.name}
            </h3>
          </div>
        </div>
        
        <p className="text-[#94a3b8] mb-4 leading-relaxed">
          {project.description}
        </p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {project.techStack.map((tech, index) => (
            <span
              key={index}
              className="px-3 py-1 text-xs font-medium text-[#818cf8] bg-[rgba(99,102,246,0.1)] rounded-md border border-[rgba(99,102,246,0.15)]"
            >
              {tech}
            </span>
          ))}
        </div>

        {project.agentContributions && project.agentContributions.length > 0 && (
          <div className="mb-6">
            <h4 className="text-sm font-medium text-[#64748b] mb-3">
              Agent Contributions
            </h4>
            <div className="space-y-2">
              {project.agentContributions.map((contribution, index) => (
                <div key={index} className="flex items-center gap-3">
                  <span className="text-xs text-[#94a3b8] w-24">
                    {contribution.agent}
                  </span>
                  <div className="flex-grow h-2 bg-[#1e293b] rounded-full overflow-hidden">
                    <div 
                      className="h-full rounded-full transition-all duration-1000"
                      style={{
                        width: `${contribution.percentage}%`,
                        backgroundColor: contribution.color
                      }}
                    />
                  </div>
                  <span className="text-xs text-[#64748b] w-10">
                    {contribution.percentage}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      
      <div className="border-t border-[rgba(255,255,255,0.08)] p-4 flex gap-4">
        <a
          href={project.githubLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium text-[#94a3b8] hover:text-[#818cf8] transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
          </svg>
          GitHub
        </a>
        {project.demoLink && (
          <a
            href={project.demoLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm font-medium text-[#94a3b8] hover:text-[#818cf8] transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
            Demo
          </a>
        )}
      </div>
    </GlassCard>
  );
}
