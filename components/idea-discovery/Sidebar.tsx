'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';
import {
  DiscoveryRecord,
  getDiscoveryHistory,
  toggleDiscoveryFavorite,
  deleteDiscoveryRecord,
  clearAllDiscoveryHistory
} from '@/lib/idea-discovery/storage';
import { formatDistanceToNow } from 'date-fns';
import { zhCN } from 'date-fns/locale';

interface SidebarProps {
  currentSessionId?: string;
  onSelectRecord?: (record: DiscoveryRecord) => void;
  onNewDiscovery?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Sidebar({
  currentSessionId,
  onSelectRecord,
  onNewDiscovery,
  collapsed = false,
  onToggleCollapse
}: SidebarProps) {
  const [records, setRecords] = useState<DiscoveryRecord[]>([]);
  const [filter, setFilter] = useState<'all' | 'favorites'>('all');
  const [search, setSearch] = useState('');

  const loadRecords = useCallback(() => {
    const allRecords = getDiscoveryHistory();
    let filtered = allRecords;

    if (filter === 'favorites') {
      filtered = filtered.filter(r => r.favorite);
    }

    if (search.trim()) {
      const searchLower = search.toLowerCase();
      filtered = filtered.filter(r =>
        r.originalIdea.toLowerCase().includes(searchLower)
      );
    }

    setRecords(filtered);
  }, [filter, search]);

  useEffect(() => {
    loadRecords();
    const interval = setInterval(loadRecords, 2000);
    return () => clearInterval(interval);
  }, [loadRecords]);

  const handleToggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    toggleDiscoveryFavorite(id);
    loadRecords();
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (confirm('确定要删除这条记录吗？')) {
      deleteDiscoveryRecord(id);
      loadRecords();
    }
  };

  const handleClearAll = () => {
    if (confirm('确定要清除所有历史记录吗？')) {
      clearAllDiscoveryHistory();
      loadRecords();
    }
  };

  if (collapsed) {
    return (
      <div className="w-16 bg-[rgba(12,12,16,0.65)] border-r border-[var(--border)] flex flex-col items-center py-4">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label="展开侧栏"
          className="p-2 text-[var(--text-tertiary)] hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m0 0l3-3m-3 3l3 3" />
          </svg>
        </button>
        <div className="flex-1" />
        <button
          type="button"
          onClick={onNewDiscovery}
          aria-label="新建探索"
          className="p-2 text-violet-300 hover:text-white hover:bg-violet-500/15 rounded-lg transition-colors cursor-pointer"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[rgba(12,12,16,0.65)] border-r border-[var(--border)] flex flex-col h-full">
      <div className="p-4 border-b border-[var(--border)]">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">探索记录</h2>
          <button
            type="button"
            onClick={onToggleCollapse}
            aria-label="收起侧栏"
            className="p-1.5 text-[var(--text-tertiary)] hover:text-white rounded-lg hover:bg-white/[0.04] cursor-pointer"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          onClick={onNewDiscovery}
          className="btn-primary w-full"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建探索
        </button>
        {records.length > 0 && (
          <button
            type="button"
            onClick={handleClearAll}
            className="w-full mt-2 py-1.5 px-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-xs hover:bg-red-500/15 transition-all flex items-center justify-center gap-1 cursor-pointer"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            清除所有记录
          </button>
        )}
      </div>

      <div className="p-3 border-b border-[var(--border)]">
        <label htmlFor="discovery-search" className="sr-only">搜索探索记录</label>
        <input
          id="discovery-search"
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索记录..."
          className="input-field py-2"
        />

        <div className="flex gap-1 mt-2">
          <button
            type="button"
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              filter === 'all'
                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            全部
          </button>
          <button
            type="button"
            onClick={() => setFilter('favorites')}
            className={`px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
              filter === 'favorites'
                ? 'bg-violet-500/15 text-violet-300 border border-violet-500/25'
                : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)] border border-transparent'
            }`}
          >
            收藏
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {records.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-[var(--text-muted)] text-sm">
              {search ? '没有找到相关记录' : '还没有探索记录'}
            </div>
            {!search && (
              <div className="text-[var(--text-muted)] text-xs mt-2">
                开始一次新的产品方向探索吧
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-1">
            {records.map((record) => (
              <div
                key={record.id}
                onClick={() => onSelectRecord?.(record)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onSelectRecord?.(record);
                  }
                }}
                role="button"
                tabIndex={0}
                className={`group p-3 border-b border-[var(--border)] hover:bg-white/[0.03] cursor-pointer transition-all ${
                  currentSessionId === record.id
                    ? 'bg-violet-500/10 border-l-2 border-l-violet-400'
                    : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-[var(--text-secondary)] truncate flex-1">
                        {record.originalIdea}
                      </h3>
                      <button
                        type="button"
                        onClick={(e) => handleToggleFavorite(e, record.id)}
                        aria-label={record.favorite ? '取消收藏' : '收藏'}
                        className={`shrink-0 p-1 rounded cursor-pointer ${
                          record.favorite
                            ? 'text-amber-300'
                            : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
                        }`}
                      >
                        <svg
                          className="w-4 h-4"
                          fill={record.favorite ? 'currentColor' : 'none'}
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

                    <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
                      <span>
                        {formatDistanceToNow(new Date(record.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                      {record.session.currentPhase && (
                        <>
                          <span aria-hidden="true">·</span>
                          <span>
                            {record.session.currentPhase === 'complete'
                              ? '已完成'
                              : getPhaseName(record.session.currentPhase)}
                          </span>
                        </>
                      )}
                    </div>
                    {record.report && (
                      <div className="mt-1">
                        <span
                          className={`text-xs px-2 py-0.5 rounded-md ${
                            record.report.worthDoing.includes('值得')
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : record.report.worthDoing.includes('验证')
                                ? 'bg-amber-500/15 text-amber-300'
                                : 'bg-red-500/15 text-red-300'
                          }`}
                        >
                          {record.report.worthDoing}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => handleDelete(e, record.id)}
                    aria-label="删除记录"
                    className="opacity-100 md:opacity-0 md:group-hover:opacity-100 text-[var(--text-muted)] hover:text-red-300 hover:bg-red-500/10 rounded-lg p-1.5 transition-all cursor-pointer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
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
