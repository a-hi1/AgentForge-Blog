'use client';

import { useState, memo } from 'react';
import type {
  EngineeringArtifacts,
  ArchitectureNode,
  ArchitectureEdge,
  DataModelTable,
  ApiEndpoint,
  FileTreeNode,
  DeployChecklistItem,
} from '@/lib/agent-runtime/artifactGenerator';

type TabId = 'architecture' | 'datamodel' | 'api' | 'filetree' | 'deploy';

interface ArtifactsPanelProps {
  artifacts: EngineeringArtifacts | null;
  onExport?: (type: 'techspec' | 'scaffold' | 'apispec' | 'prd') => void;
}

const TABS: { id: TabId; label: string; icon: string }[] = [
  { id: 'architecture', label: '架构', icon: '🏗' },
  { id: 'datamodel', label: '数据模型', icon: '🗄' },
  { id: 'api', label: '接口', icon: '🔌' },
  { id: 'filetree', label: '文件树', icon: '📁' },
  { id: 'deploy', label: '部署', icon: '🚀' },
];

function ArtifactsPanel({ artifacts, onExport }: ArtifactsPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>('architecture');

  if (!artifacts) return null;

  return (
    <div className="glass-card rounded-xl overflow-hidden">
      <div className="px-5 pt-4 pb-3 border-b border-[rgba(255,255,255,0.06)]">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-gradient-to-br from-[#3B82F6]/20 to-[#8B5CF6]/20 flex items-center justify-center text-xs">📦</span>
            <h3 className="text-sm font-semibold text-[#FAFAFA]">工程产物</h3>
          </div>
          {onExport && (
            <div className="flex gap-1.5">
              <button onClick={() => onExport('techspec')} className="px-2.5 py-1 text-[10px] rounded-md bg-[rgba(59,130,246,0.1)] text-[#60A5FA] hover:bg-[rgba(59,130,246,0.2)] transition-colors">
                下载方案
              </button>
              <button onClick={() => onExport('scaffold')} className="px-2.5 py-1 text-[10px] rounded-md bg-[rgba(16,185,129,0.1)] text-[#34D399] hover:bg-[rgba(16,185,129,0.2)] transition-colors">
                工程骨架
              </button>
              <button onClick={() => onExport('apispec')} className="px-2.5 py-1 text-[10px] rounded-md bg-[rgba(139,92,246,0.1)] text-[#A78BFA] hover:bg-[rgba(139,92,246,0.2)] transition-colors">
                API Spec
              </button>
              <button onClick={() => onExport('prd')} className="px-2.5 py-1 text-[10px] rounded-md bg-[rgba(245,158,11,0.1)] text-[#FBBF24] hover:bg-[rgba(245,158,11,0.2)] transition-colors">
                导出 PRD
              </button>
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-[rgba(59,130,246,0.15)] text-[#60A5FA] border border-[rgba(59,130,246,0.3)]'
                  : 'text-[#71717A] hover:text-[#A1A1AA] hover:bg-[rgba(255,255,255,0.03)]'
              }`}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5">
        {activeTab === 'architecture' && <ArchitectureTab nodes={artifacts.architecture.nodes} edges={artifacts.architecture.edges} />}
        {activeTab === 'datamodel' && <DataModelTab tables={artifacts.dataModels} />}
        {activeTab === 'api' && <ApiTab endpoints={artifacts.apiEndpoints} />}
        {activeTab === 'filetree' && <FileTreeTab nodes={artifacts.fileTree} />}
        {activeTab === 'deploy' && <DeployTab items={artifacts.deployChecklist} />}
      </div>
    </div>
  );
}

function ArchitectureTab({ nodes, edges }: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] }) {
  const [selectedNode, setSelectedNode] = useState<ArchitectureNode | null>(null);
  const typeColors: Record<string, string> = {
    client: '#3B82F6',
    gateway: '#8B5CF6',
    service: '#10B981',
    database: '#F59E0B',
    external: '#EC4899',
  };

  const layers = [
    { type: 'client', label: '客户端层' },
    { type: 'gateway', label: '网关层' },
    { type: 'service', label: '服务层' },
    { type: 'database', label: '数据层' },
    { type: 'external', label: '外部依赖' },
  ];

  return (
    <div>
      <div className="space-y-3 mb-4">
        {layers.map(layer => {
          const layerNodes = nodes.filter(n => n.type === layer.type);
          if (layerNodes.length === 0) return null;
          return (
            <div key={layer.type}>
              <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-1.5">{layer.label}</p>
              <div className="flex flex-wrap gap-2">
                {layerNodes.map(node => (
                  <button
                    key={node.id}
                    onClick={() => setSelectedNode(selectedNode?.id === node.id ? null : node)}
                    className={`px-3 py-2 rounded-lg border text-xs transition-all ${
                      selectedNode?.id === node.id
                        ? 'bg-[rgba(59,130,246,0.1)] border-[rgba(59,130,246,0.3)]'
                        : 'bg-[#111113] border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)]'
                    }`}
                    style={{ borderLeftColor: typeColors[node.type], borderLeftWidth: 3 }}
                  >
                    <span className="mr-1.5">{node.icon}</span>
                    <span className="text-[#E4E4E7] font-medium">{node.label}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedNode && (
        <div className="p-3 rounded-lg bg-[#111113] border border-[rgba(59,130,246,0.2)]">
          <div className="flex items-center gap-2 mb-1">
            <span>{selectedNode.icon}</span>
            <span className="text-[#FAFAFA] text-sm font-medium">{selectedNode.label}</span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[rgba(255,255,255,0.05)] text-[#71717A]">{selectedNode.type}</span>
          </div>
          <p className="text-[#A1A1AA] text-xs">{selectedNode.description}</p>
        </div>
      )}

      <div className="mt-3 p-3 rounded-lg bg-[rgba(255,255,255,0.02)]">
        <p className="text-[10px] text-[#52525B] uppercase tracking-wider mb-2">调用链路</p>
        {edges.map((edge, i) => {
          const fromNode = nodes.find(n => n.id === edge.from);
          const toNode = nodes.find(n => n.id === edge.to);
          return (
            <div key={i} className="flex items-center gap-2 mb-1 text-xs">
              <span className="text-[#A1A1AA]">{fromNode?.icon} {fromNode?.label}</span>
              <span className="text-[#52525B]">→</span>
              <span className="text-[#A1A1AA]">{toNode?.icon} {toNode?.label}</span>
              {edge.label && <span className="text-[10px] text-[#71717A]">({edge.label})</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DataModelTab({ tables }: { tables: DataModelTable[] }) {
  const [expandedTable, setExpandedTable] = useState<string | null>(tables[0]?.name || null);

  return (
    <div className="space-y-3">
      {tables.map(table => (
        <div key={table.name} className="rounded-lg border border-[rgba(255,255,255,0.06)] overflow-hidden">
          <button
            onClick={() => setExpandedTable(expandedTable === table.name ? null : table.name)}
            className="w-full flex items-center justify-between px-4 py-2.5 bg-[#111113] hover:bg-[rgba(24,24,27,0.9)] transition-colors"
          >
            <div className="flex items-center gap-2">
              <span className="text-[#F59E0B] text-xs">🗄</span>
              <span className="text-[#FAFAFA] text-sm font-mono font-medium">{table.name}</span>
              <span className="text-[#71717A] text-[10px]">— {table.description}</span>
            </div>
            <span className="text-[#52525B] text-xs">{expandedTable === table.name ? '▼' : '▶'}</span>
          </button>
          {expandedTable === table.name && (
            <div className="p-3">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#71717A] text-left">
                    <th className="pb-2 font-medium">字段</th>
                    <th className="pb-2 font-medium">类型</th>
                    <th className="pb-2 font-medium">约束</th>
                    <th className="pb-2 font-medium">说明</th>
                  </tr>
                </thead>
                <tbody>
                  {table.fields.map(f => (
                    <tr key={f.name} className="border-t border-[rgba(255,255,255,0.03)]">
                      <td className="py-1.5 font-mono text-[#60A5FA]">{f.name}</td>
                      <td className="py-1.5 font-mono text-[#A78BFA] text-[10px]">{f.type}</td>
                      <td className="py-1.5 text-[#F59E0B] text-[10px]">{f.constraint}</td>
                      <td className="py-1.5 text-[#A1A1AA]">{f.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function ApiTab({ endpoints }: { endpoints: ApiEndpoint[] }) {
  const methodColors: Record<string, string> = {
    GET: '#10B981',
    POST: '#3B82F6',
    PUT: '#F59E0B',
    DELETE: '#EF4444',
    PATCH: '#8B5CF6',
  };

  return (
    <div className="space-y-2">
      {endpoints.map((ep, i) => (
        <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-[#111113] border border-[rgba(255,255,255,0.05)] hover:border-[rgba(255,255,255,0.1)] transition-colors">
          <span
            className="shrink-0 px-2 py-0.5 rounded text-[10px] font-bold font-mono"
            style={{ backgroundColor: `${methodColors[ep.method]}20`, color: methodColors[ep.method] }}
          >
            {ep.method}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[#E4E4E7] text-xs font-mono mb-1">{ep.path}</p>
            <p className="text-[#71717A] text-[11px]">{ep.description}</p>
            {ep.requestBody && (
              <p className="text-[10px] text-[#52525B] mt-1 font-mono">Req: {ep.requestBody}</p>
            )}
            {ep.responseBody && (
              <p className="text-[10px] text-[#52525B] font-mono">Res: {ep.responseBody}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function FileTreeTab({ nodes }: { nodes: FileTreeNode[] }) {
  return (
    <div className="font-mono text-xs">
      <FileTreeLevel nodes={nodes} indent={0} />
    </div>
  );
}

function FileTreeLevel({ nodes, indent }: { nodes: FileTreeNode[]; indent: number }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(nodes.filter(n => n.type === 'directory').map(n => n.name)));

  return (
    <div>
      {nodes.map(node => (
        <div key={node.name}>
          <button
            onClick={() => {
              if (node.type === 'directory') {
                const next = new Set(expanded);
                if (next.has(node.name)) next.delete(node.name);
                else next.add(node.name);
                setExpanded(next);
              }
            }}
            className="w-full flex items-center gap-2 py-1 hover:bg-[rgba(255,255,255,0.02)] rounded transition-colors"
            style={{ paddingLeft: `${indent * 16 + 4}px` }}
          >
            {node.type === 'directory' ? (
              <span className="text-[#52525B] text-[10px] w-3">{expanded.has(node.name) ? '▼' : '▶'}</span>
            ) : (
              <span className="w-3" />
            )}
            <span className={node.type === 'directory' ? 'text-[#60A5FA]' : 'text-[#A1A1AA]'}>
              {node.name}
            </span>
            <span className="text-[#52525B] text-[10px] ml-auto mr-4">— {node.description}</span>
          </button>
          {node.type === 'directory' && node.children && expanded.has(node.name) && (
            <FileTreeLevel nodes={node.children} indent={indent + 1} />
          )}
        </div>
      ))}
    </div>
  );
}

function DeployTab({ items }: { items: DeployChecklistItem[] }) {
  const checkedCount = items.filter(i => i.checked).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4 p-3 rounded-lg bg-[#111113]">
        <div className="relative w-10 h-10">
          <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
            <circle cx="18" cy="18" r="16" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="16" fill="none" stroke="#3B82F6" strokeWidth="3"
              strokeDasharray={`${(checkedCount / items.length) * 100} 100`}
              strokeLinecap="round"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[10px] text-[#FAFAFA] font-bold">
            {Math.round((checkedCount / items.length) * 100)}%
          </span>
        </div>
        <div>
          <p className="text-[#FAFAFA] text-sm font-medium">部署就绪度</p>
          <p className="text-[#71717A] text-[11px]">{checkedCount}/{items.length} 项已完成</p>
        </div>
      </div>

      <div className="space-y-2">
        {items.map((item, i) => (
          <div
            key={i}
            className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
              item.checked
                ? 'bg-[rgba(16,185,129,0.03)] border-[rgba(16,185,129,0.15)]'
                : 'bg-[#111113] border-[rgba(255,255,255,0.05)]'
            }`}
          >
            <span className={`text-xs mt-0.5 ${item.checked ? 'text-[#10B981]' : 'text-[#52525B]'}`}>
              {item.checked ? '✓' : '○'}
            </span>
            <div>
              <p className={`text-xs font-medium ${item.checked ? 'text-[#10B981]' : 'text-[#E4E4E7]'}`}>
                {item.label}
              </p>
              <p className="text-[#71717A] text-[10px] mt-0.5">{item.detail}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default memo(ArtifactsPanel);
