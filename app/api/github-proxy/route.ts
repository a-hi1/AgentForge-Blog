import { NextRequest } from 'next/server';
import { enforceRateLimit } from '@/lib/rate-limiter';

export const runtime = 'nodejs';

const GITHUB_API = 'https://api.github.com';

function getHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'AgentForge-Blog',
  };
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }
  return headers;
}

export async function POST(req: NextRequest) {
  const limited = enforceRateLimit(req);
  if (limited) return limited;

  try {
    const body = await req.json();
    const { action, owner, repo, branch, path } = body;

    if (!action || !owner || !repo) {
      return Response.json({ error: '缺少必要参数' }, { status: 400 });
    }

    let url: string;
    let acceptHeader = 'application/vnd.github.v3+json';

    switch (action) {
      case 'meta':
        url = `${GITHUB_API}/repos/${owner}/${repo}`;
        break;
      case 'tree':
        if (!branch) return Response.json({ error: '缺少 branch 参数' }, { status: 400 });
        url = `${GITHUB_API}/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
        break;
      case 'file':
        if (!path) return Response.json({ error: '缺少 path 参数' }, { status: 400 });
        url = `${GITHUB_API}/repos/${owner}/${repo}/contents/${path}`;
        acceptHeader = 'application/vnd.github.v3.raw';
        break;
      default:
        return Response.json({ error: `未知 action: ${action}` }, { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        ...getHeaders(),
        'Accept': acceptHeader,
      },
    });

    if (!res.ok) {
      const errorMsg = res.status === 404
        ? '仓库不存在或为私有仓库'
        : res.status === 403
        ? 'GitHub API 请求限流，请稍后重试'
        : `GitHub API 错误: ${res.status}`;
      return Response.json({ error: errorMsg }, { status: res.status });
    }

    // For file content, return as text
    if (action === 'file') {
      const text = await res.text();
      return new Response(text, {
        headers: { 'Content-Type': 'text/plain' },
      });
    }

    // For meta and tree, return as JSON
    const data = await res.json();
    return Response.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : '代理请求失败';
    return Response.json({ error: msg }, { status: 500 });
  }
}
