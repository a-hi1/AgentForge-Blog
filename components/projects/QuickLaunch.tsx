'use client';

import Link from 'next/link';

interface QuickLaunchProps {
  className?: string;
}

const launchItems = [
  {
    title: '继续开发',
    description: '启动智能执行，让 AI 代理完成任务',
    route: '/playground',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    color: 'text-[#60A5FA]',
    bgColor: 'bg-[rgba(59,130,246,0.15)]',
    borderColor: 'border-[rgba(59,130,246,0.25)]',
  },
  {
    title: '生成提示词',
    description: '使用 PromptOS 编排你的工作流',
    route: '/prompt',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
    color: 'text-[#A78BFA]',
    bgColor: 'bg-[rgba(139,92,246,0.15)]',
    borderColor: 'border-[rgba(139,92,246,0.25)]',
  },
  {
    title: '查看实验记录',
    description: '回顾历史执行，分析代理行为',
    route: '/lab',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    color: 'text-[#34D399]',
    bgColor: 'bg-[rgba(52,211,153,0.15)]',
    borderColor: 'border-[rgba(52,211,153,0.25)]',
  },
  {
    title: '问题修复',
    description: '遇到问题？让 AI 帮你诊断和修复',
    route: '/fix',
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    color: 'text-[#F59E0B]',
    bgColor: 'bg-[rgba(245,158,11,0.15)]',
    borderColor: 'border-[rgba(245,158,11,0.25)]',
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
