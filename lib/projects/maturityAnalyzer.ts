import { RepoMeta, RepoTree } from '../github/importer';
import { CodeAnalysis } from '../github/codeAnalyzer';

export interface MaturityResult {
  score: number;
  level: 'initial' | 'prototype' | 'mvp' | 'beta' | 'production';
  levelLabel: string;
  phase: 'requirements' | 'architecture' | 'mvp' | 'extension' | 'testing' | 'deployment' | 'optimization';
  phaseLabel: string;
}

export function analyzeMaturity(
  meta: RepoMeta,
  tree: RepoTree,
  analysis: CodeAnalysis
): MaturityResult {
  const paths = tree.items.map(i => i.path);
  let score = 0;

  const hasTests = paths.some(p => /test|spec|__tests__/i.test(p));
  const hasCiCd = paths.some(p => /\.github\/workflows|\.gitlab-ci|ci\.yml/i.test(p));
  const hasDocs = tree.keyFiles.readme || paths.some(p => /docs\//i.test(p));
  const hasEnvExample = paths.some(p => /\.env(\.example)?/i.test(p));
  const hasDeployConfig = tree.keyFiles.vercelJson || tree.keyFiles.dockerfile;
  const hasDb = analysis.techStack.some(t => t.includes('Prisma') || t.includes('PostgreSQL') || t.includes('MongoDB'));

  if (hasTests) score += 20;
  if (hasCiCd) score += 20;
  if (hasDocs) score += 15;
  if (hasEnvExample) score += 10;
  if (hasDeployConfig) score += 15;
  if (hasDb) score += 20;
  score += Math.min(meta.stars, 10);
  score += Math.min(analysis.features.length * 3, 15);
  score = Math.min(100, Math.max(0, score));

  let level: MaturityResult['level'];
  let levelLabel: string;
  if (score <= 30) { level = 'initial'; levelLabel = '初始'; }
  else if (score <= 50) { level = 'prototype'; levelLabel = '原型'; }
  else if (score <= 70) { level = 'mvp'; levelLabel = 'MVP'; }
  else if (score <= 85) { level = 'beta'; levelLabel = 'Beta'; }
  else { level = 'production'; levelLabel = 'Production'; }

  let phase: MaturityResult['phase'];
  let phaseLabel: string;
  if (score <= 20) { phase = 'requirements'; phaseLabel = '需求分析'; }
  else if (score <= 35) { phase = 'architecture'; phaseLabel = '架构设计'; }
  else if (score <= 55) { phase = 'mvp'; phaseLabel = 'MVP开发'; }
  else if (score <= 70) { phase = 'extension'; phaseLabel = '功能扩展'; }
  else if (score <= 85) { phase = 'testing'; phaseLabel = '测试审计'; }
  else if (score <= 95) { phase = 'deployment'; phaseLabel = '部署上线'; }
  else { phase = 'optimization'; phaseLabel = '生产优化'; }

  return {
    score,
    level,
    levelLabel,
    phase,
    phaseLabel
  };
}

export function generateRecommendationPrompts(
  analysis: CodeAnalysis,
  maturity: MaturityResult
): { title: string; prompt: string }[] {
  const prompts: { title: string; prompt: string }[] = [];

  analysis.missingModules.forEach(missing => {
    if (missing === '认证模块') {
      prompts.push({
        title: '实现认证系统',
        prompt: `为当前 ${analysis.techStack.join(' + ')} 项目实现完整的用户认证系统，包括登录、注册、密码重置、会话管理等功能。`
      });
    } else if (missing === '部署配置') {
      prompts.push({
        title: '生成生产部署方案',
        prompt: `为当前项目生成完整的生产部署方案，包括 Docker 配置、CI/CD 流程、环境变量管理等。`
      });
    } else if (missing === '数据库 Schema') {
      prompts.push({
        title: '设计数据库 Schema',
        prompt: `为当前项目设计完整的数据库 Schema，考虑现有功能模块 ${analysis.features.join('、')} 的需求。`
      });
    } else if (missing === '环境变量示例') {
      prompts.push({
        title: '创建环境变量配置',
        prompt: `为当前项目创建 .env.example 文件，列出所有必要的环境变量及其说明。`
      });
    }
  });

  if (maturity.level === 'initial') {
    prompts.push({
      title: '搭建项目基础架构',
      prompt: `帮助搭建 ${analysis.techStack.join(' + ')} 项目的基础架构，包括目录结构、配置文件、基础组件等。`
    });
  } else if (maturity.level === 'prototype') {
    prompts.push({
      title: '实现核心 MVP 功能',
      prompt: `基于当前项目，帮助实现核心 MVP 功能，确保可演示的最小可行产品。`
    });
  } else if (maturity.level === 'mvp') {
    prompts.push({
      title: '扩展功能模块',
      prompt: `在现有 MVP 基础上，扩展更多功能模块，提升产品完整性。`
    });
  } else if (maturity.level === 'beta') {
    prompts.push({
      title: '完善测试覆盖',
      prompt: `为当前项目添加单元测试、集成测试和 E2E 测试，提升代码质量。`
    });
  } else {
    prompts.push({
      title: '性能优化',
      prompt: `对当前项目进行性能优化，包括代码分割、缓存策略、数据库优化等。`
    });
  }

  return prompts;
}
