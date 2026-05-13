import { RepoTree } from './importer';

export interface RepoHealth {
  hasTests: boolean;
  hasDocs: boolean;
  hasCI: boolean;
  hasLinting: boolean;
  hasTypeScript: boolean;
  hasEnvExample: boolean;
  techDebtScore: number;
  openTodos: string[];
  suggestions: { issue: string; prompt: string }[];
}

export interface TechDecision {
  decision: string;
  why: string;
  source: 'package.json' | 'readme' | 'config' | 'commit';
}

export interface CodeAnalysis {
  techStack: string[];
  architecture: 'monolith' | 'fullstack' | 'frontend' | 'api-first';
  features: string[];
  missingModules: string[];
  directorySummary: string;
  health: RepoHealth;
  techDecisions: TechDecision[];
  todos: string[];
}

export function scanTodos(items: { path: string }[]): string[] {
  const todoFiles = items.filter(i =>
    /\.(ts|tsx|js|jsx|py|rb|go|rs|java|swift|kt)$/.test(i.path) &&
    !i.path.includes('node_modules') &&
    !i.path.includes('dist') &&
    !i.path.includes('.next')
  );
  return todoFiles.map(f => f.path);
}

export function extractTechDecisions(tree: RepoTree): TechDecision[] {
  const decisions: TechDecision[] = [];
  const pkg = tree.keyFiles.packageJson;
  const readme = tree.keyFiles.readme;

  if (pkg) {
    const deps = { ...pkg.dependencies, ...pkg.devDependencies } as Record<string, string>;

    if (deps['next']) {
      decisions.push({ decision: 'Next.js', why: '选择 Next.js 作为全栈框架（SSR/ISR/API Routes）', source: 'package.json' });
    }
    if (deps['tailwindcss']) {
      decisions.push({ decision: 'Tailwind CSS', why: '使用原子化 CSS 框架，避免维护独立 CSS 文件', source: 'package.json' });
    }
    if (deps['prisma'] || deps['@prisma/client']) {
      decisions.push({ decision: 'Prisma', why: '使用 Prisma ORM 管理数据库 Schema 和迁移', source: 'package.json' });
    }
    if (deps['@supabase/supabase-js']) {
      decisions.push({ decision: 'Supabase', why: '选择 Supabase 作为 BaaS（认证/数据库/存储）', source: 'package.json' });
    }
    if (deps['firebase']) {
      decisions.push({ decision: 'Firebase', why: '选择 Firebase 作为 BaaS', source: 'package.json' });
    }
    if (deps['zustand']) {
      decisions.push({ decision: 'Zustand', why: '选择 Zustand 作为轻量级状态管理', source: 'package.json' });
    }
    if (deps['react-hook-form']) {
      decisions.push({ decision: 'React Hook Form', why: '选择 RHF 管理表单状态', source: 'package.json' });
    }
    if (deps['zustand']) {
      decisions.push({ decision: 'Zustand', why: '选择 Zustand 轻量状态管理，避免 Redux 样板代码', source: 'package.json' });
    }
  }

  if (readme) {
    if (/typescript/i.test(readme)) {
      decisions.push({ decision: 'TypeScript', why: '项目使用 TypeScript 保证类型安全', source: 'readme' });
    }
    if (/monorepo/i.test(readme)) {
      decisions.push({ decision: 'Monorepo', why: '项目采用 Monorepo 架构管理多包', source: 'readme' });
    }
  }

  if (tree.keyFiles.nextConfig) {
    decisions.push({ decision: 'Next.js Config', why: '自定义 Next.js 配置（可能存在特殊部署需求）', source: 'config' });
  }
  if (tree.keyFiles.dockerfile) {
    decisions.push({ decision: 'Docker', why: '项目配置了 Docker 容器化部署', source: 'config' });
  }
  if (tree.keyFiles.vercelJson) {
    decisions.push({ decision: 'Vercel', why: '项目部署在 Vercel 平台', source: 'config' });
  }

  return decisions;
}

export function analyzeCodebase(tree: RepoTree): CodeAnalysis {
  const techStack: string[] = [];
  const features: string[] = [];
  const missingModules: string[] = [];
  const todos: string[] = scanTodos(tree.items);

  const paths = tree.items.map(i => i.path);
  const packageJson = tree.keyFiles.packageJson;

  if (packageJson?.dependencies || packageJson?.devDependencies) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps['next']) techStack.push('Next.js');
    if (deps['react']) techStack.push('React');
    if (deps['vue']) techStack.push('Vue');
    if (deps['express']) techStack.push('Express');
    if (deps['prisma'] || deps['@prisma/client']) techStack.push('Prisma + PostgreSQL');
    if (deps['mongodb'] || deps['mongoose']) techStack.push('MongoDB');
    if (deps['tailwindcss']) techStack.push('Tailwind CSS');
    if (deps['@supabase/supabase-js']) techStack.push('Supabase');
    if (deps['firebase']) techStack.push('Firebase');
    if (deps['typescript'] || deps['@types/*']) techStack.push('TypeScript');
    if (deps['zustand']) techStack.push('Zustand');
  }

  if (tree.keyFiles.dockerfile) techStack.push('Docker');
  if (tree.keyFiles.vercelJson) techStack.push('Vercel');

  const hasAppDir = paths.some(p => p.startsWith('app/'));
  const hasPagesDir = paths.some(p => p.startsWith('pages/'));
  const hasSrcDir = paths.some(p => p.startsWith('src/'));
  const hasApiDir = paths.some(p => p.includes('api/'));
  const hasAuth = paths.some(p => /auth|login|register/i.test(p));
  const hasPayment = paths.some(p => /payment|stripe|checkout/i.test(p));
  const hasBlog = paths.some(p => /blog|post|article/i.test(p));
  const hasDashboard = paths.some(p => /dashboard|admin/i.test(p));
  const hasComments = paths.some(p => /comment|review/i.test(p));
  const hasUpload = paths.some(p => /upload|file|media/i.test(p));
  const hasNotification = paths.some(p => /notification|alert/i.test(p));

  if (hasAuth) features.push('认证');
  if (hasPayment) features.push('支付');
  if (hasBlog) features.push('博客');
  if (hasDashboard) features.push('Dashboard');
  if (hasComments) features.push('评论');
  if (hasUpload) features.push('上传');
  if (hasNotification) features.push('通知');

  if (!hasAuth) missingModules.push('认证模块');
  if (!tree.keyFiles.vercelJson && !tree.keyFiles.dockerfile) missingModules.push('部署配置');
  if (!tree.keyFiles.prismaSchema && !paths.some(p => p.includes('schema'))) missingModules.push('数据库 Schema');
  if (!paths.some(p => /\.env(\.example)?/i.test(p))) missingModules.push('环境变量示例');

  let architecture: CodeAnalysis['architecture'] = 'monolith';
  if (hasApiDir && !hasAppDir && !hasPagesDir) {
    architecture = 'api-first';
  } else if ((hasAppDir || hasPagesDir) && hasApiDir) {
    architecture = 'fullstack';
  } else if ((hasAppDir || hasPagesDir) && !hasApiDir) {
    architecture = 'frontend';
  }

  const dirSummary = [
    hasAppDir ? 'app/' : null,
    hasPagesDir ? 'pages/' : null,
    hasSrcDir ? 'src/' : null,
    hasApiDir ? 'api/' : null,
    tree.keyFiles.prismaSchema ? 'prisma/' : null
  ].filter(Boolean).join(' ');

  const hasTests = paths.some(p => /test|spec|__tests__|\.test\.|\.spec\./i.test(p));
  const hasDocs = !!tree.keyFiles.readme || paths.some(p => p.startsWith('docs/'));
  const hasCI = paths.some(p => /\.github\/workflows|\.gitlab-ci|ci\.yml/i.test(p));
  const hasLinting = paths.some(p => /\.eslintrc|\.prettierrc|eslint\.config/i.test(p));
  const hasTypeScript = paths.some(p => /\.ts$|\.tsx$|tsconfig/i.test(p));
  const hasEnvExample = paths.some(p => /\.env\.example/i.test(p));

  let techDebtScore = 100;
  if (!hasTests) techDebtScore -= 25;
  if (!hasDocs) techDebtScore -= 15;
  if (!hasCI) techDebtScore -= 15;
  if (!hasLinting) techDebtScore -= 10;
  if (!hasTypeScript) techDebtScore -= 10;
  if (!hasEnvExample) techDebtScore -= 5;
  if (missingModules.length > 2) techDebtScore -= 20;
  techDebtScore = Math.max(0, techDebtScore);

  const suggestions: { issue: string; prompt: string }[] = [];
  if (!hasTests) {
    suggestions.push({
      issue: '缺失测试',
      prompt: `为当前项目 ${techStack.join(' + ')} 生成完整的测试套件`
    });
  }
  if (!hasDocs) {
    suggestions.push({
      issue: '缺失文档',
      prompt: '为当前项目生成完整的 README 文档和 API 文档'
    });
  }
  if (!hasCI) {
    suggestions.push({
      issue: '缺失 CI/CD',
      prompt: '为当前项目配置 GitHub Actions CI/CD 流程'
    });
  }

  return {
    techStack,
    architecture,
    features,
    missingModules,
    directorySummary: dirSummary || '基础结构',
    health: {
      hasTests, hasDocs, hasCI, hasLinting, hasTypeScript, hasEnvExample, techDebtScore,
      openTodos: [],
      suggestions
    },
    techDecisions: extractTechDecisions(tree),
    todos
  };
}
