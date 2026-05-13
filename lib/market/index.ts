export interface TrendingRepo {
  name: string;
  fullName: string;
  description: string;
  stars: number;
  language: string;
  url: string;
}

export interface HNItem {
  title: string;
  url: string;
  points: number;
  comments: number;
}

export async function fetchGitHubTrending(): Promise<TrendingRepo[]> {
  try {
    const res = await fetch('https://api.github.com/search/repositories?q=created:>2024-01-01&sort=stars&order=desc&per_page=10', {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: Record<string, unknown>) => ({
      name: String(item.name || ''),
      fullName: String(item.full_name || ''),
      description: String(item.description || ''),
      stars: Number(item.stargazers_count || 0),
      language: String(item.language || ''),
      url: String(item.html_url || ''),
    }));
  } catch {
    return [];
  }
}

export async function fetchHackerNewsTop(): Promise<HNItem[]> {
  try {
    const topRes = await fetch('https://hacker-news.firebaseio.com/v0/topstories.json');
    if (!topRes.ok) return [];
    const ids: number[] = await topRes.json();
    const top10 = ids.slice(0, 10);

    const items = await Promise.all(
      top10.map(async (id) => {
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${id}.json`);
          if (!itemRes.ok) return null;
          return await itemRes.json();
        } catch { return null; }
      })
    );

    return items.filter(Boolean).map((item: Record<string, unknown>) => ({
      title: String(item.title || ''),
      url: String(item.url || `https://news.ycombinator.com/item?id=${item.id}`),
      points: Number(item.score || 0),
      comments: Number(item.descendants || 0),
    }));
  } catch {
    return [];
  }
}

export async function searchGitHubRepos(query: string): Promise<TrendingRepo[]> {
  try {
    const res = await fetch(`https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=5`, {
      headers: { 'Accept': 'application/vnd.github.v3+json' }
    });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((item: Record<string, unknown>) => ({
      name: String(item.name || ''),
      fullName: String(item.full_name || ''),
      description: String(item.description || ''),
      stars: Number(item.stargazers_count || 0),
      language: String(item.language || ''),
      url: String(item.html_url || ''),
    }));
  } catch {
    return [];
  }
}
