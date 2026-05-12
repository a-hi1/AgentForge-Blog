'use client';

import Link from 'next/link';

interface QuickLaunchProps {
  className?: string;
}

const launchItems = [
  {
    title: '方向探索',
    description: '输入模糊想法，AI 帮你展开、评估、收缩到 MVP',
    route: '/prompt/discovery',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
      </svg>
    ),
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[rgba(245,158,11,0.15)]',
    borderColor: 'border-[rgba(245,158,11,0.25)]',
  },
  {
    title: 'AI 导出',
    description: '生成 AI 可消费的项目上下文',
    route: '/prompt',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" />
      </svg>
    ),
    color: 'text-[#A78BFA]',
    bgColor: 'bg-[rgba(139,92,246,0.15)]',
    borderColor: 'border-[rgba(139,92,246,0.25)]',
  },
  {
    title: '项目记忆',
    description: '导入 GitHub 仓库，让 AI 理解你的项目',
    route: '/memory',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    color: 'text-[#60A5FA]',
    bgColor: 'bg-[rgba(59,130,246,0.15)]',
    borderColor: 'border-[rgba(59,130,246,0.25)]',
  },
  {
    title: '历史记录',
    description: '查看已保存的上下文和 Skill',
    route: '/prompt/history',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-[#34D399]',
    bgColor: 'bg-[rgba(52,211,153,0.15)]',
    borderColor: 'border-[rgba(52,211,153,0.25)]',
  },
];

export default function QuickLaunch({ className = '' }: QuickLaunchProps) {
  return (
    <div className={`p-6 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)] ${className}`}>
      <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">快速启动</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {launchItems.map((item) => (
          <Link
            key={item.route}
            href={item.route}
            className={`p-4 rounded-lg border transition-all hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/20 ${item.bgColor} ${item.borderColor}`}
          >
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg ${item.bgColor} ${item.color}`}>
                {item.icon}
              </div>
              <div>
                <h3 className="text-sm font-semibold text-[#FAFAFA]">{item.title}</h3>
                <p className="text-xs text-[#71717A] mt-1">{item.description}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
