'use client';

import { memo, useMemo } from 'react';

interface ExecutionStep {
  agent: string;
  task: string;
  output: string;
  status: string;
}

interface QualityScorePanelProps {
  steps: ExecutionStep[];
}

interface QualityMetrics {
  overallScore: number;
  chineseRatio: number;
  structureScore: number;
  codeCompleteness: number;
  sceneRelevance: number;
  issues: string[];
}

function analyzeQuality(steps: ExecutionStep[]): QualityMetrics {
  const allOutput = steps.map(s => s.output).join('\n\n');
  
  if (!allOutput.trim()) {
    return { overallScore: 0, chineseRatio: 0, structureScore: 0, codeCompleteness: 0, sceneRelevance: 0, issues: ['无输出内容'] };
  }

  const chineseRatio = calculateChineseRatio(allOutput);
  const structureScore = calculateStructureScore(allOutput);
  const codeCompleteness = calculateCodeCompleteness(allOutput);
  const sceneRelevance = calculateSceneRelevance(allOutput, steps);

  const issues: string[] = [];
  if (chineseRatio < 0.5) issues.push(`中文占比偏低 (${Math.round(chineseRatio * 100)}%)`);
  if (structureScore < 50) issues.push('输出结构不完整');
  if (codeCompleteness < 60) issues.push('代码块可能不完整');
  if (sceneRelevance < 40) issues.push('场景贴合度不足');

  const overallScore = Math.round(
    chineseRatio * 30 + structureScore * 0.3 + codeCompleteness * 0.25 + sceneRelevance * 0.15
  );

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    chineseRatio,
    structureScore,
    codeCompleteness,
    sceneRelevance,
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

  if (steps.length === 0 || steps.every(s => !s.output)) return null;

  const scoreColor = getScoreColor(metrics.overallScore);

  const metricItems = [
    { label: '中文输出率', value: Math.round(metrics.chineseRatio * 100), unit: '%', icon: '中' },
    { label: '结构完整度', value: Math.round(metrics.structureScore), unit: '%', icon: '结' },
    { label: '代码完整性', value: Math.round(metrics.codeCompleteness), unit: '%', icon: '码' },
    { label: '场景贴合度', value: Math.round(metrics.sceneRelevance), unit: '%', icon: '贴' },
  ];

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

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {metricItems.map((item) => {
          const color = getScoreColor(item.value);
          return (
            <div key={item.label} className="p-3 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center" style={{ backgroundColor: `${color}20`, color }}>
                  {item.icon}
                </span>
                <span className="text-[11px] text-[#71717A]">{item.label}</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-lg font-bold" style={{ color }}>{item.value}</span>
                <span className="text-[#52525B] text-xs mb-0.5">{item.unit}</span>
              </div>
              <div className="mt-2 h-1 bg-[rgba(255,255,255,0.05)] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${item.value}%`, backgroundColor: color }}
                />
              </div>
            </div>
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
