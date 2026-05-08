import GlassCard from '@/components/shared/GlassCard';

export default function AboutPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#818cf8] text-xs font-medium uppercase tracking-wider mb-4">
            Identity
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#f8fafc] mb-4">
            About
          </h1>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-4">
              AgentForge OS
            </h2>
            <p className="text-[#94a3b8] leading-relaxed mb-4">
              AgentForge OS is an AI engineering process visualization system. We showcase how AI agents participate in software development, from prompt to agent to build to deploy.
            </p>
            <p className="text-[#94a3b8] leading-relaxed">
              Our mission is to demonstrate the future of development where AI and human developers collaborate seamlessly.
            </p>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-4">
              What We Do
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  📝 Content Management
                </h3>
                <p className="text-[#94a3b8]">
                  Leveraging Hexo for static content management of articles and documentation.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  🧪 Process Visualization
                </h3>
                <p className="text-[#94a3b8]">
                  Showing AI engineering processes step by step through our Lab interface.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  🤖 Interactive Experience
                </h3>
                <p className="text-[#94a3b8]">
                  Providing a playground for users to interact with AI agents directly.
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  📦 Project Showcase
                </h3>
                <p className="text-[#94a3b8]">
                  Displaying real products built with AI-powered development workflows.
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-4">
              Architecture
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#818cf8] font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-[#f8fafc]">
                    Hexo Content Layer
                  </h3>
                  <p className="text-[#94a3b8] text-sm">
                    Static content management and Markdown rendering
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#818cf8] font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-[#f8fafc]">
                    Next.js Application Layer
                  </h3>
                  <p className="text-[#94a3b8] text-sm">
                    Main application with dynamic pages and components
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#818cf8] font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-[#f8fafc]">
                    Agent Runtime Layer
                  </h3>
                  <p className="text-[#94a3b8] text-sm">
                    AI execution and automation (coming soon)
                  </p>
                </div>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
