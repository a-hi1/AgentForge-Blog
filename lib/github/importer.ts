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

export async function fetchRepoMeta(
  owner: string,
  repo: string,
  token?: string
): Promise<RepoMeta> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!res.ok) {
    if (res.status === 404) throw new Error('仓库不存在或为私有仓库');
    if (res.status === 403) throw new Error('GitHub API 请求限流，请稍后重试或配置 GITHUB_TOKEN');
    throw new Error(`获取仓库信息失败: ${res.status}`);
  }

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
  token?: string
): Promise<RepoTree> {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`, { headers });
  if (!res.ok) {
    throw new Error(`获取文件树失败: ${res.status}`);
  }

  const data = await res.json();
  const items: RepoTreeItem[] = (data.tree || []).map((item: any) => ({
    path: item.path,
    type: item.type,
    size: item.size,
    sha: item.sha
  }));

  const keyFiles = await fetchKeyFiles(owner, repo, items, token);

  return { items, keyFiles };
}

async function fetchKeyFiles(
  owner: string,
  repo: string,
  items: RepoTreeItem[],
  token?: string
): Promise<RepoTree['keyFiles']> {
  const keyFiles: RepoTree['keyFiles'] = {};
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3.raw'
  };
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  const fetchFile = async (path: string) => {
    try {
      const res = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, { headers });
      if (res.ok) {
        return await res.text();
      }
    } catch {}
    return undefined;
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
