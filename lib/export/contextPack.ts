import { CodeAnalysis, TechDecision } from '@/lib/github/codeAnalyzer';
import { RepoMeta } from '@/lib/github/importer';

export type ExportTarget = 'claude' | 'cursor' | 'gpt';

export function buildClaudeContext(meta: RepoMeta, analysis: CodeAnalysis): string {
  const tech = analysis.techStack.join('、');
  const arch = { monolith: '单体', fullstack: '全栈', frontend: '前端', 'api-first': 'API优先' }[analysis.architecture];

  return `# ${meta.name}

## 项目信息
- 仓库: ${meta.owner}/${meta.repo}
- 语言: ${meta.language || '未知'}
- Stars: ${meta.stars}
- 描述: ${meta.description || '无'}

## 技术栈
${tech}

## 架构
${arch}

## 文件结构
${analysis.directorySummary}

## 已识别功能
${analysis.features.join('、')}

## 缺失模块
${analysis.missingModules.join('、')}

## 技术决策
${analysis.techDecisions.map(d => `- ${d.decision}: ${d.why}`).join('\n')}

## 项目约束
- 不修改未列出的文件
- 不引入未列出的依赖
- 遇到歧义先确认再实现
- 每个阶段完成后暂停确认`;
}

export function buildCursorRules(meta: RepoMeta, analysis: CodeAnalysis): string {
  const tech = analysis.techStack.join(', ');
  return `You are working on a project called ${meta.name}.

## Tech Stack
${tech}

## Architecture
${analysis.architecture}

## Project Structure
${analysis.directorySummary}

## Key Decisions
${analysis.techDecisions.map(d => `- ${d.decision}: ${d.why}`).join('\n')}

## Rules
- DO NOT modify files outside the task scope
- DO NOT introduce unlisted dependencies
- Always confirm before implementing ambiguous requirements
- Pause after each phase completion

## Context
${meta.description || 'No additional context.'}`;
}

export function buildGPTSystemPrompt(meta: RepoMeta, analysis: CodeAnalysis): string {
  return `你是 ${meta.name} 项目的开发助手。

项目技术栈: ${analysis.techStack.join('、')}
架构: ${analysis.architecture}
文件结构: ${analysis.directorySummary}

关键决策:
${analysis.techDecisions.map(d => `- ${d.decision}: ${d.why}`).join('\n')}

约束:
- 不修改未列出的文件
- 不引入未列出的依赖
- 遇到歧义先确认再实现`;
}

export function buildContextPack(target: ExportTarget, meta: RepoMeta, analysis: CodeAnalysis): string {
  switch (target) {
    case 'claude': return buildClaudeContext(meta, analysis);
    case 'cursor': return buildCursorRules(meta, analysis);
    case 'gpt': return buildGPTSystemPrompt(meta, analysis);
  }
}
