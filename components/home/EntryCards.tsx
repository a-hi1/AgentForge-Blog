import Link from 'next/link';
import GlassCard from '@/components/shared/GlassCard';

const entries = [
  {
    title: '项目中心',
    description: '浏览由 AI 智能代理工程流构建的真实产品。',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
    href: '/projects',
  },
  {
    title: '实验室',
    description: '观察 AI 工程流程的实际运作，逐步可视化。',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
      </svg>
    ),
    href: '/lab',
  },
  {
    title: '智能交互',
    description: '直接在浏览器中与 AI 智能代理实时交互。',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    href: '/playground',
  },
];

export default function EntryCards() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-2xl md:text-3xl font-bold text-[#f8fafc] mb-3">
            系统入口
          </h2>
          <p className="text-[#64748b] text-sm max-w-xl mx-auto">
            从不同维度探索 AI 智能代理的工程能力。
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {entries.map((entry) => (
            <Link key={entry.href} href={entry.href}>
              <GlassCard className="p-6 h-full">
                <div className="flex flex-col h-full">
                  <div className="w-10 h-10 rounded-lg bg-[rgba(99,102,241,0.08)] flex items-center justify-center text-[#818cf8] mb-4">
                    {entry.icon}
                  </div>
                  <h3 className="text-lg font-semibold text-[#f8fafc] mb-2">
                    {entry.title}
                  </h3>
                  <p className="text-[#94a3b8] text-sm mb-4 flex-grow leading-relaxed">
                    {entry.description}
                  </p>
                  <div className="inline-flex items-center gap-1.5 text-[#818cf8] font-medium text-xs">
                    进入
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </div>
                </div>
              </GlassCard>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
