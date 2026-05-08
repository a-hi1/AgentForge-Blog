'use client';

import { memo, useMemo, useState } from 'react';

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: string;
}

interface QualityScorePanelProps {
  steps: ExecutionStep[];
}

interface QualityDetail {
  label: string;
  score: number;
  weight: number;
  icon: string;
  reasons: string[];
}

interface QualityMetrics {
  overallScore: number;
  details: QualityDetail[];
  issues: string[];
}

function analyzeQuality(steps: ExecutionStep[]): QualityMetrics {
  const allOutput = steps.map(s => s.output).join('\n\n');

  if (!allOutput.trim()) {
    return {
      overallScore: 0,
      details: [],
      issues: ['无输出内容'],
    };
  }

  const chineseRatio = calculateChineseRatio(allOutput);
  const structureScore = calculateStructureScore(allOutput);
  const codeCompleteness = calculateCodeCompleteness(allOutput);
  const sceneRelevance = calculateSceneRelevance(allOutput, steps);
  const engineeringScore = calculateEngineeringScore(allOutput);

  const chinesePercent = Math.round(chineseRatio * 100);
  const chineseReasons: string[] = [];
  if (chinesePercent >= 85) chineseReasons.push('中文输出覆盖率优秀');
  else if (chinesePercent >= 60) chineseReasons.push('中文覆盖率达标，部分段落仍含英文');
  else chineseReasons.push('中文覆盖率不足，存在大量英文段落');

  const structReasons: string[] = [];
  const headingCount = (allOutput.match(/^#{1,3}\s/gm) || []).length;
  if (headingCount >= 4) structReasons.push(`检测到 ${headingCount} 个结构化标题`);
  if (/^[-*]\s/m.test(allOutput)) structReasons.push('包含有序/无序列表');
  if (/```/.test(allOutput)) structReasons.push('包含代码示例');

  const codeReasons: string[] = [];
  const fenceCount = (allOutput.match(/```/g) || []).length;
  if (fenceCount % 2 === 0) codeReasons.push('代码围栏完整闭合');
  else codeReasons.push('存在未闭合的代码围栏');
  const codeBlocks = allOutput.match(/```[\s\S]*?```/g) || [];
  codeReasons.push(`共 ${codeBlocks.length} 个代码块`);

  const sceneReasons: string[] = [];
  if (/表|字段|接口|模块|组件|函数|方法/.test(allOutput)) sceneReasons.push('包含具体工程术语');
  if (/\d+\.\s/.test(allOutput)) sceneReasons.push('包含结构化编号');

  const engReasons: string[] = [];
  if (/CREATE TABLE|model\s|interface\s|type\s/.test(allOutput)) engReasons.push('包含数据模型定义');
  if (/POST|GET|PUT|DELETE|\/api\//.test(allOutput)) engReasons.push('包含 API 接口设计');
  if (/\.env|process\.env|配置/.test(allOutput)) engReasons.push('包含配置说明');

  const details: QualityDetail[] = [
    { label: '中文输出率', score: chinesePercent, weight: 25, icon: '中', reasons: chineseReasons },
    { label: '结构完整度', score: Math.round(structureScore), weight: 25, icon: '结', reasons: structReasons },
    { label: '代码完整性', score: Math.round(codeCompleteness), weight: 20, icon: '码', reasons: codeReasons },
    { label: '场景贴合度', score: Math.round(sceneRelevance), weight: 15, icon: '贴', reasons: sceneReasons },
    { label: '工程可执行性', score: Math.round(engineeringScore), weight: 15, icon: '工', reasons: engReasons },
  ];

  const issues: string[] = [];
  if (chinesePercent < 50) issues.push(`中文占比偏低 (${chinesePercent}%)`);
  if (structureScore < 50) issues.push('输出结构不完整');
  if (codeCompleteness < 60) issues.push('代码块可能不完整');
  if (sceneRelevance < 40) issues.push('场景贴合度不足');
  if (engineeringScore < 40) issues.push('工程可执行性不足');

  const overallScore = Math.round(
    details.reduce((sum, d) => sum + d.score * d.weight / 100, 0)
  );

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    details,
    issues,
  };
}

function calculateChineseRatio(text: string): number {
  const cleanText = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]+`/g, '');
  const totalChars = cleanText.replace(/\s/g, '').length;
  if (totalChars === 0) return 1;
  const chineseChars = (cleanText.match(/[\u4e00-\u9fff]/g) || []).length;
  return Math.min(1, chineseChars / totalChars * 1.2);
}

function calculateStructureScore(text: string): number {
  let score = 0;
  if (/^#\s/m.test(text)) score += 35;
  const headingCount = (text.match(/^#{1,3}\s/gm) || []).length;
  if (headingCount >= 4) score += 30;
  else if (headingCount >= 2) score += 20;
  else if (headingCount >= 1) score += 10;
  if (/^[-*]\s/m.test(text)) score += 15;
  if (/```/.test(text)) score += 10;
  if (text.length > 500) score += 10;
  return Math.min(100, score);
}

function calculateCodeCompleteness(text: string): number {
  let score = 100;
  const fenceCount = (text.match(/```/g) || []).length;
  if (fenceCount % 2 !== 0) score -= 30;
  const codeBlocks = text.match(/```[\s\S]*?```/g) || [];
  for (const block of codeBlocks) {
    const code = block.replace(/```\w*\n?/g, '').replace(/```$/gm, '').trim();
    if (code.length < 10) score -= 15;
    const openBraces = (code.match(/{/g) || []).length;
    const closeBraces = (code.match(/}/g) || []).length;
    if (Math.abs(openBraces - closeBraces) > 1) score -= 10;
  }
  return Math.max(0, Math.min(100, score));
}

function calculateSceneRelevance(text: string, steps: ExecutionStep[]): number {
  let score = 50;
  const hasSpecificTerms = /表|字段|接口|模块|组件|函数|方法|配置|部署|测试/.test(text);
  if (hasSpecificTerms) score += 25;
  const hasNumbers = /\d+\.\s/.test(text);
  if (hasNumbers) score += 10;
  const hasCodeExamples = /```/.test(text);
  if (hasCodeExamples) score += 10;
  const completedSteps = steps.filter(s => s.status === 'completed').length;
  if (completedSteps > 0) score += 5;
  return Math.min(100, score);
}

function calculateEngineeringScore(text: string): number {
  let score = 30;
  if (/CREATE TABLE|model\s|interface\s|type\s/.test(text)) score += 20;
  if (/POST|GET|PUT|DELETE|\/api\//.test(text)) score += 20;
  if (/\.env|process\.env|配置|环境变量/.test(text)) score += 10;
  if (/docker|Dockerfile|vercel|deploy|部署/.test(text)) score += 10;
  if (/index|索引|constraint|约束|FOREIGN KEY|REFERENCES/.test(text)) score += 10;
  return Math.min(100, score);
}

function getScoreColor(score: number): string {
  if (score >= 85) return '#10B981';
  if (score >= 70) return '#3B82F6';
  if (score >= 50) return '#F59E0B';
  return '#EF4444';
}

function getScoreLabel(score: number): string {
  if (score >= 85) return '优秀';
  if (score >= 70) return '良好';
  if (score >= 50) return '及格';
  return '待改进';
}

function QualityScorePanel({ steps }: QualityScorePanelProps) {
  const metrics = useMemo(() => analyzeQuality(steps), [steps]);
  const [expandedDetail, setExpandedDetail] = useState<string | null>(null);

  if (steps.length === 0 || steps.every(s => !s.output)) return null;

  const scoreColor = getScoreColor(metrics.overallScore);

  return (
    <div className="p-5 glass-card rounded-xl mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-[#FAFAFA]">智能质量评分</h3>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold" style={{ color: scoreColor }}>
            {metrics.overallScore}
          </span>
          <span className="text-[#71717A] text-sm">/100</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-medium"
            style={{ backgroundColor: `${scoreColor}20`, color: scoreColor }}
          >
            {getScoreLabel(metrics.overallScore)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
        {metrics.details.map((item) => {
          const color = getScoreColor(item.score);
          const isExpanded = expandedDetail === item.label;
          return (
            <button
              key={item.label}
              onClick={() => setExpandedDetail(isExpanded ? null : item.label)}
              className={`p-3 rounded-lg bg-[#111113] border text-left transition-all ${
                isExpanded ? 'border-[rgba(59,130,246,0.3)]' : 'border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)]'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
                  {item.icon}
                </span>
                <span className="text-[11px] text-[#71717A] truncate">{item.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-lg font-bold" style={{ color }}>{item.score}</span>
                <span className="text-[#52525B] text-xs mb-0.5">%</span>
              </div>
              <div className="mt-2 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.score}%`, backgroundColor: color }}
                />
              </div>
              {isExpanded && item.reasons.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[rgba(255,255,255,0.05)]">
                  {item.reasons.map((reason, i) => (
                    <p key={i} className="text-[10px] text-[#A1A1AA] mb-1">• {reason}</p>
                  ))}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {metrics.issues.length > 0 && (
        <div className="p-3 rounded-lg bg-[rgba(245,158,11,0.05)] border border-[rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[#F59E0B] text-xs">⚠️</span>
            <span className="text-[#F59E0B] text-xs font-medium">优化建议</span>
          </div>
          <div className="space-y-1">
            {metrics.issues.map((issue, i) => (
              <p key={i} className="text-[#A1A1AA] text-xs">• {issue}</p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default memo(QualityScorePanel);
