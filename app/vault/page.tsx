'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { getVault, VaultItem, categories, updateVaultItem, deleteFromVault } from '@/lib/prompt/vault';

export default function VaultPage() {
  const [vault, setVault] = useState<VaultItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('全部');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'success' | 'usage'>('recent');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    setVault(getVault());
  }, []);

  const filteredVault = vault
    .filter((item) => {
      const matchesCategory =
        selectedCategory === '全部' || item.category === selectedCategory;
      const matchesSearch =
        search === '' ||
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.tags.some((tag) => tag.toLowerCase().includes(search.toLowerCase()));
      return matchesCategory && matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
      }
      if (sortBy === 'success') {
        return b.successRate - a.successRate;
      }
      return b.useCount - a.useCount;
    });

  const handleStar = (id: string) => {
    const item = vault.find((v) => v.id === id);
    if (item) {
      updateVaultItem(id, { starred: !item.starred });
      setVault(getVault());
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('确定要删除这个 Prompt 吗？')) {
      deleteFromVault(id);
      setVault(getVault());
    }
  };

  const handleSendToStudio = (item: VaultItem) => {
    window.location.href = `/prompt?content=${encodeURIComponent(item.content)}`;
  };

  return (
    <div className="page-shell py-12 sm:py-16">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10 animate-fade-up">
        <div>
          <span className="badge badge-violet mb-4">Prompt Vault</span>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white">
            Prompt 资产库
          </h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            管理、分类和复用你的优质 Prompt
          </p>
        </div>
        <Link href="/prompt" className="btn-primary">
          创建新 Prompt
        </Link>
      </div>

      <div className="glass-card p-5 sm:p-6 mb-6 animate-fade-up animate-delay-1">
        <div className="flex flex-col xl:flex-row gap-4">
          <div className="flex-1">
            <label htmlFor="vault-search" className="sr-only">
              搜索 Prompt
            </label>
            <input
              id="vault-search"
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索 Prompt 标题或标签…"
              className="input-field"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory('全部')}
              className={`px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                selectedCategory === '全部'
                  ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                  : 'bg-white/[0.03] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
              }`}
            >
              全部
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-2 rounded-lg text-xs transition-colors cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                    : 'bg-white/[0.03] text-[var(--text-muted)] border border-[var(--border)] hover:text-[var(--text-secondary)]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'recent' | 'success' | 'usage')}
              className="input-field py-2"
              aria-label="排序方式"
            >
              <option value="recent">最近使用</option>
              <option value="success">成功率</option>
              <option value="usage">使用次数</option>
            </select>

            <div className="flex items-center gap-1 bg-white/[0.03] border border-[var(--border)] rounded-lg p-1">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                aria-label="网格视图"
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                aria-label="列表视图"
                className={`p-2 rounded-md transition-colors cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-violet-500/20 text-violet-300'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {filteredVault.length === 0 ? (
        <div className="glass-card text-center py-16 px-6">
          <div className="w-12 h-12 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 text-violet-300">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">暂无 Prompt 资产</h3>
          <p className="text-sm text-[var(--text-muted)] mb-6">
            在 Context Compiler 中生成并沉淀你的第一个 Prompt
          </p>
          <Link href="/prompt" className="btn-primary">
            去创建
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-fade-up animate-delay-2">
          {filteredVault.map((item) => (
            <article key={item.id} className="glass-card-interactive p-5 flex flex-col">
              <div className="flex items-start justify-between mb-3">
                <span className="badge badge-blue">{item.category}</span>
                <button
                  type="button"
                  onClick={() => handleStar(item.id)}
                  aria-label={item.starred ? '取消星标' : '加星标'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    item.starred
                      ? 'text-amber-300'
                      : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill={item.starred ? 'currentColor' : 'none'}
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                    />
                  </svg>
                </button>
              </div>

              <h3 className="font-semibold text-white mb-2 line-clamp-2">{item.title}</h3>
              <p className="text-sm text-[var(--text-tertiary)] line-clamp-3 mb-4 flex-1">
                {item.content}
              </p>

              <div className="flex flex-wrap gap-1.5 mb-4">
                {item.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-[var(--text-muted)] border border-[var(--border)]"
                  >
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex items-center justify-between text-xs text-[var(--text-muted)] mb-4">
                <div className="flex items-center gap-3">
                  <span>{item.useCount} 次</span>
                  <span>{item.successRate}%</span>
                </div>
                <div>{new Date(item.lastUsedAt).toLocaleDateString()}</div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => handleSendToStudio(item)}
                  className="btn-primary flex-1"
                >
                  使用
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  aria-label={`删除 ${item.title}`}
                  className="btn-ghost text-red-300 hover:bg-red-500/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="space-y-3 animate-fade-up animate-delay-2">
          {filteredVault.map((item) => (
            <div
              key={item.id}
              className="glass-card p-5 flex flex-col lg:flex-row lg:items-center gap-4"
            >
              <button
                type="button"
                onClick={() => handleStar(item.id)}
                aria-label={item.starred ? '取消星标' : '加星标'}
                className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                  item.starred
                    ? 'text-amber-300'
                    : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill={item.starred ? 'currentColor' : 'none'}
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                  />
                </svg>
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="badge badge-blue">{item.category}</span>
                  {item.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-white/[0.04] text-[var(--text-muted)] border border-[var(--border)]"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <h3 className="font-semibold text-white truncate">{item.title}</h3>
                <p className="text-sm text-[var(--text-tertiary)] truncate mt-1">
                  {item.content}
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs text-[var(--text-muted)] shrink-0">
                <span>{item.useCount} 次</span>
                <span>{item.successRate}%</span>
                <span>{new Date(item.lastUsedAt).toLocaleDateString()}</span>
              </div>

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleSendToStudio(item)}
                  className="btn-primary"
                >
                  使用
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(item.id)}
                  className="btn-ghost text-red-300 hover:bg-red-500/10"
                >
                  删除
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
