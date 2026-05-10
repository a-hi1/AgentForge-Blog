export interface RecommendedTask {
  id: string;
  title: string;
  reason: string;
  impact: 'high' | 'medium' | 'low';
  eta: string;
  promptCategory: string;
}

export interface DailyTask {
  title: string;
  blocker: string;
  reason: string;
  benefit: string;
  eta: string;
  category: string;
  actionLabel: string;
  actionHref: string;
  priority: 'critical' | 'high' | 'medium';
  source: 'failed-prompt' | 'low-score' | 'project-stage' | 'default';
}

export function generateRecommendations(): RecommendedTask[] {
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

export function generateDailyTask(
  history: { id: string; title: string; input: string; feedback?: string; executionSuccess?: boolean; score?: number; category: string; fullPrompt: string }[],
  projectStage?: string
): DailyTask {
  const failed = history.filter(h => h.feedback === 'failed' || h.executionSuccess === false);
  if (failed.length > 0) {
    const worst = failed.sort((a, b) => (a.score ?? 50) - (b.score ?? 50))[0];
    return {
      title: `修复失败任务：${worst.title}`,
      blocker: `最近一次执行失败，Prompt 评分 ${worst.score ?? '未知'}`,
      reason: `「${worst.title}」执行未成功，${worst.feedback === 'failed' ? '反馈标记为失败' : '执行结果不理想'}。修复此任务可恢复进度。`,
      benefit: '消除当前阻塞，恢复项目推进节奏',
      eta: '20 分钟',
      category: worst.category,
      actionLabel: '生成修复 Prompt',
      actionHref: `/fix?error=${encodeURIComponent(worst.input || worst.title)}`,
      priority: 'critical',
      source: 'failed-prompt',
    };
  }

  const lowScore = history.filter(h => h.score !== undefined && h.score < 70 && h.feedback !== 'failed');
  if (lowScore.length > 0) {
    const target = lowScore.sort((a, b) => (a.score ?? 0) - (b.score ?? 0))[0];
    return {
      title: `优化低分 Prompt：${target.title}`,
      blocker: `评分仅 ${target.score} 分，执行效果受限`,
      reason: `「${target.title}」评分 ${target.score}，低于 70 分阈值。优化后可显著提升执行成功率。`,
      benefit: '提升 Prompt 质量，减少后续返工',
      eta: '15 分钟',
      category: target.category,
      actionLabel: '智能优化',
      actionHref: `/prompt/history?id=${target.id}`,
      priority: 'high',
      source: 'low-score',
    };
  }

  if (projectStage) {
    const stageTasks: Record<string, DailyTask> = {
      '产品收敛重构': {
        title: '精简弱价值模块，强化核心链路',
        blocker: '当前阶段需要聚焦核心功能',
        reason: '产品处于收敛阶段，应停止新增展示模块，集中精力打磨核心 Prompt → 执行 → 反馈闭环。',
        benefit: '系统更聚焦，每日可真实使用',
        eta: '1 小时',
        category: '产品优化',
        actionLabel: '进入 Prompt Studio',
        actionHref: '/prompt',
        priority: 'medium',
        source: 'project-stage',
      },
      'MVP 开发': {
        title: '推进 MVP 核心功能开发',
        blocker: 'MVP 尚未完成',
        reason: '项目处于 MVP 阶段，优先完成最小可用功能集。',
        benefit: '快速验证产品核心假设',
        eta: '2 小时',
        category: '功能开发',
        actionLabel: '生成开发 Prompt',
        actionHref: '/prompt',
        priority: 'medium',
        source: 'project-stage',
      },
    };
    if (stageTasks[projectStage]) return stageTasks[projectStage];
  }

  return {
    title: '开始今天的 Prompt 工作',
    blocker: '暂无明确阻塞',
    reason: '没有检测到失败任务或低分 Prompt，今天可以从新需求开始。',
    benefit: '积累 Prompt 资产，提升开发效率',
    eta: '30 分钟',
    category: '日常',
    actionLabel: '生成新 Prompt',
    actionHref: '/prompt',
    priority: 'medium',
    source: 'default',
  };
}
