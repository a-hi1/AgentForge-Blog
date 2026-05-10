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

  const filteredVault = vault.filter(item => {
    const matchesCategory = selectedCategory === '全部' || item.category === selectedCategory;
    const matchesSearch = search === '' || 
      item.title.toLowerCase().includes(search.toLowerCase()) ||
      item.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  }).sort((a, b) => {
    if (sortBy === 'recent') {
      return new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime();
    } else if (sortBy === 'success') {
      return b.successRate - a.successRate;
    } else {
      return b.useCount - a.useCount;
    }
  });

  const handleStar = (id: string) => {
    const item = vault.find(v => v.id === id);
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
    <div className="min-h-[calc(100vh-80px)] py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* 顶部标题与操作 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-bold text-white">Prompt 资产库</h1>
            <p className="text-gray-400 mt-1">管理、分类和复用你的优质 Prompt</p>
          </div>
          <Link
            href="/prompt"
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-medium transition-all"
          >
            创建新 Prompt
          </Link>
        </div>

        {/* 筛选与搜索 */}
        <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-700/50 mb-6">
          <div className="flex flex-col lg:flex-row gap-4">
            {/* 搜索 */}
            <div className="flex-1">
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="搜索 Prompt 标题或标签…"
                className="w-full px-4 py-3 bg-slate-900/60 border border-slate-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
              />
            </div>

            {/* 分类筛选 */}
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory('全部')}
                className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                  selectedCategory === '全部'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-800 text-gray-400 hover:text-white'
                }`}
              >
                全部
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-4 py-2 rounded-lg text-sm transition-colors ${
                    selectedCategory === cat
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-800 text-gray-400 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* 排序与视图 */}
            <div className="flex items-center gap-3">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-gray-300 focus:outline-none"
              >
                <option value="recent">最近使用</option>
                <option value="success">成功率</option>
                <option value="usage">使用次数</option>
              </select>

              <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'grid' ? 'bg-slate-700 text-white' : 'text-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-colors ${
                    viewMode === 'list' ? 'bg-slate-700 text-white' : 'text-gray-400'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        {filteredVault.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">📦</div>
            <h3 className="text-lg font-semibold text-gray-300 mb-2">暂无 Prompt 资产</h3>
            <p className="text-gray-500 mb-6">开始使用 Prompt Studio 创建你的第一个 Prompt</p>
            <Link
              href="/prompt"
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-sm font-medium transition-all"
            >
              去创建
            </Link>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredVault.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-slate-900/40 border border-slate-700/50 hover:border-indigo-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-gray-400">
                      {item.category}
                    </span>
                  </div>
                  <button
                    onClick={() => handleStar(item.id)}
                    className={`p-1.5 rounded-lg transition-colors ${
                      item.starred ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-400'
                    }`}
                  >
                    <svg className="w-4.5 h-4.5" fill={item.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  </button>
                </div>

                <h3 className="font-semibold text-white mb-2 line-clamp-2">{item.title}</h3>

                <p className="text-sm text-gray-400 line-clamp-3 mb-4">{item.content}</p>

                <div className="flex flex-wrap gap-1.5 mb-4">
                  {item.tags.map((tag, i) => (
                    <span
                      key={i}
                      className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-gray-400"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <div className="flex items-center justify-between text-xs text-gray-500 mb-4">
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                      {item.useCount} 次
                    </div>
                    <div className="flex items-center gap-1">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {item.successRate}%
                    </div>
                  </div>
                  <div>{new Date(item.lastUsedAt).toLocaleDateString()}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendToStudio(item)}
                    className="flex-1 px-3 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
                  >
                    使用
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-3 py-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {filteredVault.map((item) => (
              <div
                key={item.id}
                className="p-5 rounded-xl bg-slate-900/40 border border-slate-700/50 hover:border-indigo-500/50 transition-all flex items-center gap-4"
              >
                <button
                  onClick={() => handleStar(item.id)}
                  className={`p-1.5 rounded-lg transition-colors ${
                    item.starred ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-400'
                  }`}
                >
                  <svg className="w-5 h-5" fill={item.starred ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                  </svg>
                </button>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-gray-400">
                      {item.category}
                    </span>
                    {item.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-gray-500"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-white truncate">{item.title}</h3>
                  <p className="text-sm text-gray-400 truncate mt-1">{item.content}</p>
                </div>

                <div className="flex items-center gap-6 text-xs text-gray-500">
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    {item.useCount}
                  </div>
                  <div className="flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {item.successRate}%
                  </div>
                  <div>{new Date(item.lastUsedAt).toLocaleDateString()}</div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleSendToStudio(item)}
                    className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-sm font-medium transition-colors"
                  >
                    使用
                  </button>
                  <button
                    onClick={() => handleDelete(item.id)}
                    className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-red-500/20 text-gray-400 hover:text-red-400 text-sm transition-colors"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
