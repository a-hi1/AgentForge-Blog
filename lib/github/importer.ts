export interface RepoMeta {
  name: string;
  description: string | null;
  stars: number;
  forks: number;
  defaultBranch: string;
  language: string | null;
  createdAt: string;
  updatedAt: string;
  owner: string;
  repo: string;
}

export interface RepoTreeItem {
  path: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
}

export interface RepoTree {
  items: RepoTreeItem[];
  keyFiles: {
    packageJson?: any;
    readme?: string;
    prismaSchema?: string;
    dockerfile?: string;
    vercelJson?: any;
    nextConfig?: any;
  };
}

export function parseRepoUrl(url: string): { owner: string; repo: string } {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/?#]+)/);
  if (!match) {
    throw new Error('无效的 GitHub 仓库地址格式');
  }
  return { owner: match[1], repo: match[2].replace(/\.git$/, '') };
}

async function proxyFetch(action: string, params: Record<string, string>) {
  const res = await fetch('/api/github-proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...params }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `请求失败: ${res.status}`);
  }

  return res;
}

export async function fetchRepoMeta(
  owner: string,
  repo: string,
): Promise<RepoMeta> {
  const res = await proxyFetch('meta', { owner, repo });
  const data = await res.json();
  return {
    name: data.name,
    description: data.description,
    stars: data.stargazers_count,
    forks: data.forks_count,
    defaultBranch: data.default_branch,
    language: data.language,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    owner,
    repo
  };
}

export async function fetchRepoTree(
  owner: string,
  repo: string,
  branch: string,
): Promise<RepoTree> {
  const res = await proxyFetch('tree', { owner, repo, branch });
  const data = await res.json();
  const items: RepoTreeItem[] = (data.tree || []).map((item: any) => ({
    path: item.path,
    type: item.type,
    size: item.size,
    sha: item.sha
  }));

  const keyFiles = await fetchKeyFiles(owner, repo, items);

  return { items, keyFiles };
}

async function fetchKeyFiles(
  owner: string,
  repo: string,
  items: RepoTreeItem[],
): Promise<RepoTree['keyFiles']> {
  const keyFiles: RepoTree['keyFiles'] = {};

  const fetchFile = async (path: string) => {
    try {
      const res = await proxyFetch('file', { owner, repo, path });
      return await res.text();
    } catch {
      return undefined;
    }
  };

  const packageJsonPath = items.find(i => i.path === 'package.json');
  if (packageJsonPath) {
    const content = await fetchFile('package.json');
    if (content) {
      try {
        keyFiles.packageJson = JSON.parse(content);
      } catch {}
    }
  }

  const readmePath = items.find(i => /^readme/i.test(i.path));
  if (readmePath) {
    const content = await fetchFile(readmePath.path);
    if (content) keyFiles.readme = content;
  }

  const prismaPath = items.find(i => i.path.startsWith('prisma/') && i.path.endsWith('.prisma'));
  if (prismaPath) {
    const content = await fetchFile(prismaPath.path);
    if (content) keyFiles.prismaSchema = content;
  }

  const dockerfilePath = items.find(i => /^dockerfile/i.test(i.path));
  if (dockerfilePath) {
    const content = await fetchFile(dockerfilePath.path);
    if (content) keyFiles.dockerfile = content;
  }

  const vercelPath = items.find(i => i.path === 'vercel.json');
  if (vercelPath) {
    const content = await fetchFile('vercel.json');
    if (content) {
      try {
        keyFiles.vercelJson = JSON.parse(content);
      } catch {}
    }
  }

  const nextConfigPath = items.find(i => /^next\.config/i.test(i.path));
  if (nextConfigPath) {
    keyFiles.nextConfig = await fetchFile(nextConfigPath.path);
  }

  return keyFiles;
}
