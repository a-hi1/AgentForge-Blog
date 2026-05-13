'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { DiscoverySession } from '@/lib/idea-discovery';
import { getPhaseName } from '@/lib/idea-discovery/stateMachine';
import {
  DiscoveryRecord,
  getDiscoveryHistory,
  toggleDiscoveryFavorite,
  deleteDiscoveryRecord
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

  if (collapsed) {
    return (
      <div className="w-16 bg-slate-900 border-r border-slate-800 flex flex-col items-center py-4">
        <button
          onClick={onToggleCollapse} className="p-2 text-slate-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12H9m0 0l3-3m-3 3l3 3" />
            </svg>
        </button>
        <div className="flex-1" />
        <button
          onClick={onNewDiscovery} className="p-2 text-purple-400 hover:text-white hover:bg-purple-500/20 rounded-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
        </button>
      </div>
    );
  }

  return (
    <div className="w-80 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
      <div className="p-4 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">探索记录</h2>
          <button
            onClick={onToggleCollapse} className="p-1.5 text-slate-400 hover:text-white">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
          </button>
        </div>
        
        <button
          onClick={onNewDiscovery}
          className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 text-white text-sm font-medium hover:from-purple-500 hover:to-indigo-500 transition-all flex items-center justify-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          新建探索
        </button>
      </div>

      <div className="p-3 border-b border-slate-800">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索记录..."
          className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
        />
        
        <div className="flex gap-1 mt-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded text-xs transition-all ${
              filter === 'all' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            全部
          </button>
          <button
            onClick={() => setFilter('favorites')}
            className={`px-3 py-1 rounded text-xs transition-all ${
              filter === 'favorites' ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30' : 'text-slate-500 hover:text-slate-300'}`}
          >
            收藏
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {records.length === 0 ? (
          <div className="p-8 text-center">
            <div className="text-slate-500 text-sm">
              {search ? '没有找到相关记录' : '还没有探索记录'}
            </div>
            {!search && (
              <div className="text-slate-600 text-xs mt-2">
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
                className={`group p-3 border-b border-slate-800 hover:bg-slate-800/50 cursor-pointer transition-all ${
                  currentSessionId === record.id ? 'bg-purple-500/10 border-l-2 border-l-purple-500' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-sm font-medium text-slate-200 truncate flex-1">
                        {record.originalIdea}
                      </h3>
                      <button
                        onClick={(e) => handleToggleFavorite(e, record.id)}
                        className={`shrink-0 ${record.favorite ? 'text-yellow-400' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        <svg className="w-4 h-4" fill={record.favorite ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.783-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>
                        {formatDistanceToNow(new Date(record.createdAt), {
                          addSuffix: true,
                          locale: zhCN,
                        })}
                      </span>
                      {record.session.currentPhase && (
                        <>
                          <span className="text-slate-600">•</span>
                          <span>
                            {record.session.currentPhase === 'complete' ? '已完成' : getPhaseName(record.session.currentPhase)}
                          </span>
                        </>
                      )}
                    </div>
                    {record.report && (
                      <div className="mt-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          record.report.worthDoing.includes('值得') ? 'bg-green-500/20 text-green-400' :
                          record.report.worthDoing.includes('验证') ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}
                        >
                          {record.report.worthDoing}
                        </span>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={(e) => handleDelete(e, record.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded p-1.5 transition-all"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
