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

const selectClass =
  'px-3 py-2 bg-[rgba(255,255,255,0.03)] border border-[var(--border-light)] rounded-xl text-sm text-[var(--text)] focus:outline-none focus:border-[rgba(139,92,246,0.5)] focus:shadow-[0_0_0_3px_rgba(139,92,246,0.12)] transition-all appearance-none cursor-pointer';

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
        aria-label="按状态筛选"
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
        aria-label="按代理筛选"
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
        aria-label="按时间筛选"
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
