import { RepoTree } from './importer';

export interface CodeAnalysis {
  techStack: string[];
  architecture: 'monolith' | 'fullstack' | 'frontend' | 'api-first';
  features: string[];
  missingModules: string[];
  directorySummary: string;
}

export function analyzeCodebase(tree: RepoTree): CodeAnalysis {
  const techStack: string[] = [];
  const features: string[] = [];
  const missingModules: string[] = [];

  const paths = tree.items.map(i => i.path);
  const packageJson = tree.keyFiles.packageJson;

  if (packageJson?.dependencies || packageJson?.devDependencies) {
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    if (deps['next']) techStack.push('Next.js');
    if (deps['react']) techStack.push('React');
    if (deps['vue']) techStack.push('Vue');
    if (deps['express']) techStack.push('Express');
    if (deps['prisma']) techStack.push('Prisma');
    if (deps['@prisma/client']) techStack.push('PostgreSQL');
    if (deps['mongodb']) techStack.push('MongoDB');
    if (deps['tailwindcss']) techStack.push('Tailwind CSS');
    if (deps['@supabase/supabase-js']) techStack.push('Supabase');
    if (deps['firebase']) techStack.push('Firebase');
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

  return {
    techStack,
    architecture,
    features,
    missingModules,
    directorySummary: dirSummary || '基础结构'
  };
}
