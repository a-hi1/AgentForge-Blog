export interface RecommendedTask {
  id: string;
  title: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  eta: string;
  promptCategory: string;
}

export function generateRecommendations(): RecommendedTask[] {
  // 模拟基于历史记录、项目状态等生成的推荐任务
  return [
    {
      id: '1',
      title: '优化 Prompt Clarification Flow',
      reason: '根据最近 5 次执行，3 次任务因 Prompt 不够精确出现偏差',
      impact: 'high',
      eta: '30 分钟',
      promptCategory: '架构优化'
    },
    {
      id: '2',
      title: '增强移动端布局适配',
      reason: '用户反馈在小屏幕设备上操作体验欠佳',
      impact: 'medium',
      eta: '1 小时',
      promptCategory: 'UI优化'
    },
    {
      id: '3',
      title: '完善错误诊断机制',
      reason: '历史 20% 失败任务缺乏明确的失败原因',
      impact: 'high',
      eta: '2 小时',
      promptCategory: '系统增强'
    },
    {
      id: '4',
      title: '补充项目测试',
      reason: '检测到核心模块测试覆盖率低于 40%',
      impact: 'medium',
      eta: '3 小时',
      promptCategory: '测试'
    }
  ];
}
