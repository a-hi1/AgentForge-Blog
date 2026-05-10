'use client';

import { RecentActivity as RecentActivityType } from '@/lib/projects/projectState';
import Link from 'next/link';

interface RecentActivityProps {
  activities: RecentActivityType[];
}

const typeLabels: Record<string, string> = {
  'execution': '执行',
  'prompt': '提示词',
  'lab': '实验室',
  'fix': '修复',
};

export default function RecentActivity({ activities }: RecentActivityProps) {
  return (
    <div className="p-6 bg-[#111113] rounded-xl border border-[rgba(255,255,255,0.06)]">
      <h2 className="text-lg font-semibold text-[#FAFAFA] mb-4">最近活动</h2>
      
      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="py-8 text-center">
            <p className="text-[#71717A] text-sm">暂无活动记录</p>
            <p className="text-[#52525B] text-xs mt-1">前往 Playground 启动第一次执行</p>
          </div>
        ) : (
          activities.map((activity) => {
            const timeAgo = getTimeAgo(activity.timestamp);
            return (
              <div 
                key={activity.id}
                className="p-4 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-[10px] rounded-full ${
                        activity.status === 'completed'
                          ? 'bg-[rgba(16,185,129,0.15)] text-[#10B981]'
                          : activity.status === 'failed'
                          ? 'bg-[rgba(239,68,68,0.15)] text-[#EF4444]'
                          : 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA]'
                      }`}>
                        {typeLabels[activity.type] || activity.type}
                      </span>
                      <span className="text-xs text-[#71717A]">{timeAgo}</span>
                    </div>
                    <p className="text-sm text-[#A1A1AA]">{activity.task}</p>
                  </div>
                  <span className={`ml-4 flex-shrink-0 ${
                    activity.status === 'completed'
                      ? 'text-[#10B981]'
                      : activity.status === 'failed'
                      ? 'text-[#EF4444]'
                      : 'text-[#60A5FA]'
                  }`}>
                    {activity.status === 'completed' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : activity.status === 'failed' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                  </span>
                </div>
                {activity.relatedId && (
                  <Link 
                    href={`/lab/${activity.relatedId}`}
                    className="mt-2 inline-flex items-center gap-1 text-xs text-[#60A5FA] hover:text-[#3B82F6] transition-colors"
                  >
                    查看详情
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </Link>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function getTimeAgo(date: Date): string {
  const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
  
  if (seconds < 60) return '刚刚';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}分钟前`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}小时前`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}天前`;
  
  return date.toLocaleDateString('zh-CN');
}
