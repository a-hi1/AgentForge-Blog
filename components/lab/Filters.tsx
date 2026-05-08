'use client';

interface FiltersProps {
  statusFilter: string;
  agentFilter: string;
  dateFilter: string;
  onStatusFilterChange: (status: string) => void;
  onAgentFilterChange: (agent: string) => void;
  onDateFilterChange: (date: string) => void;
}

const AGENT_OPTIONS = [
  { value: 'all', label: '全部代理' },
  { value: 'Architect Agent', label: '架构代理' },
  { value: 'Coding Agent', label: '编码代理' },
  { value: 'Debug Agent', label: '调试代理' },
  { value: 'Deploy Agent', label: '部署代理' },
];

const STATUS_OPTIONS = [
  { value: 'all', label: '全部状态' },
  { value: 'pending', label: '等待中' },
  { value: 'running', label: '运行中' },
  { value: 'completed', label: '已完成' },
  { value: 'failed', label: '失败' },
];

const DATE_OPTIONS = [
  { value: 'all', label: '全部时间' },
  { value: 'today', label: '今天' },
  { value: '7d', label: '近 7 天' },
  { value: '30d', label: '近 30 天' },
];

const selectClass = "px-3 py-2 bg-[#0f172a] border border-[rgba(255,255,255,0.08)] rounded-lg text-sm text-[#f8fafc] focus:outline-none focus:border-[#6366f1] transition-all appearance-none cursor-pointer";

export default function Filters({
  statusFilter, agentFilter, dateFilter,
  onStatusFilterChange, onAgentFilterChange, onDateFilterChange,
}: FiltersProps) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      <select
        value={statusFilter}
        onChange={(e) => onStatusFilterChange(e.target.value)}
        className={selectClass}
      >
        {STATUS_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={agentFilter}
        onChange={(e) => onAgentFilterChange(e.target.value)}
        className={selectClass}
      >
        {AGENT_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>

      <select
        value={dateFilter}
        onChange={(e) => onDateFilterChange(e.target.value)}
        className={selectClass}
      >
        {DATE_OPTIONS.map(option => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
