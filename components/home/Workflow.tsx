const steps = [
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    title: '需求定义',
    description: '理解并分析工程问题',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    title: '智能规划',
    description: '记忆驱动的自适应方案',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    ),
    title: '多代理协同',
    description: '架构 / 编码 / 审查 / 部署',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    ),
    title: '代码生成',
    description: '生产级工程代码输出',
  },
  {
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    title: '记忆存储',
    description: '工程经验持续积累',
  },
];

export default function Workflow() {
  return (
    <section className="py-16 px-4 bg-[#111113]">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-2xl md:text-3xl font-bold text-[#FAFAFA] mb-3">
            工程执行流程
          </h2>
          <p className="text-[#71717A] text-sm max-w-xl mx-auto">
            从需求到部署，AI 智能代理的完整工程链路。
          </p>
        </div>

        <div className="relative">
          <div className="hidden md:block absolute top-8 left-[10%] right-[10%] h-[1px] bg-gradient-to-r from-transparent via-[rgba(59,130,246,0.3)] to-transparent" />

          <div className="flex flex-col md:flex-row items-center justify-between gap-6 md:gap-4">
            {steps.map((step, index) => (
              <div key={index} className="flex flex-col items-center text-center relative z-10 w-full md:w-auto">
                <div className="w-14 h-14 rounded-full bg-[rgba(24,24,27,0.72)] border border-[rgba(255,255,255,0.1)] flex items-center justify-center text-[#60A5FA] mb-3 hover:border-[rgba(59,130,246,0.4)] transition-all">
                  {step.icon}
                </div>
                <h3 className="text-sm font-semibold text-[#FAFAFA] mb-1">{step.title}</h3>
                <p className="text-[#71717A] text-xs">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
