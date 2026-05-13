import GlassCard from '@/components/shared/GlassCard';

export default function AboutPage() {
  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-12">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[rgba(99,102,241,0.1)] border border-[rgba(99,102,241,0.2)] text-[#818cf8] text-xs font-medium uppercase tracking-wider mb-4">
            关于我们
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#f8fafc] mb-4">
            关于 AgentForge
          </h1>
        </div>

        <div className="space-y-6">
          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-4">
              AgentForge 智能工程系统
            </h2>
            <p className="text-[#94a3b8] leading-relaxed mb-4">
              AgentForge 是一个 Memory-Augmented Adaptive Engineering OS，基于多智能体协作 + 记忆增强 + 实时可观测的 AI 工程操作系统。
            </p>
            <p className="text-[#94a3b8] leading-relaxed">
              我们的使命是展示 AI 与人类开发者无缝协作的未来开发模式。
            </p>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-4">
              核心能力
            </h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  🤖 多智能体协作
                </h3>
                <p className="text-[#94a3b8]">
                  Architect / Coding / Debug / Deploy 多智能体流水线，自适应动态编排。
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  🧠 记忆增强
                </h3>
                <p className="text-[#94a3b8]">
                  历史经验检索、相似度匹配、经验复用，从每次执行中持续学习。
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  📊 可观测性
                </h3>
                <p className="text-[#94a3b8]">
                  实时日志、执行回放、对比分析，完整追踪每一次工程决策。
                </p>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                  📦 工程产物生成
                </h3>
                <p className="text-[#94a3b8]">
                  自动生成架构图、数据模型、API 接口、文件树和部署清单。
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-8">
            <h2 className="text-2xl font-bold text-[#f8fafc] mb-4">
              系统架构
            </h2>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#818cf8] font-bold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-[#f8fafc]">
                    前端展示层
                  </h3>
                  <p className="text-[#94a3b8] text-sm">
                    Next.js 14 App Router + Tailwind CSS + Glassmorphism
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#818cf8] font-bold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-[#f8fafc]">
                    Agent 运行时层
                  </h3>
                  <p className="text-[#94a3b8] text-sm">
                    多智能体协作 + 自适应规划 + 质量验证
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-lg bg-[rgba(99,102,241,0.1)] flex items-center justify-center text-[#818cf8] font-bold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-[#f8fafc]">
                    数据持久层
                  </h3>
                  <p className="text-[#94a3b8] text-sm">
                    Supabase PostgreSQL + 向量检索 + 记忆关系图谱
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
