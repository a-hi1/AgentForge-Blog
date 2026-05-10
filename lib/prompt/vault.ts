export interface VaultItem {
  id: string;
  title: string;
  category: string;
  projectId?: string;
  content: string;
  tags: string[];
  successRate: number;
  useCount: number;
  createdAt: string;
  lastUsedAt: string;
  starred: boolean;
  executionResults: string[];
}

const VAULT_KEY = 'agentforge_vault';

export function getVault(): VaultItem[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(VAULT_KEY);
  if (!data) {
    // 默认数据
    const defaultVault: VaultItem[] = [
      {
        id: '1',
        title: 'Next.js 项目架构规划',
        category: '项目启动',
        content: '请帮我规划一个完整的 Next.js 项目架构...',
        tags: ['Next.js', '架构'],
        successRate: 95,
        useCount: 12,
        createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
        lastUsedAt: new Date(Date.now() - 86400000).toISOString(),
        starred: true,
        executionResults: []
      },
      {
        id: '2',
        title: 'React 组件优化',
        category: 'UI优化',
        content: '请帮我优化以下 React 组件...',
        tags: ['React', '性能'],
        successRate: 88,
        useCount: 8,
        createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
        lastUsedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
        starred: false,
        executionResults: []
      },
      {
        id: '3',
        title: 'API 接口设计',
        category: '架构设计',
        content: '请帮我设计一套完整的 RESTful API 接口...',
        tags: ['API', 'REST'],
        successRate: 90,
        useCount: 6,
        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        lastUsedAt: new Date(Date.now() - 86400000 * 3).toISOString(),
        starred: true,
        executionResults: []
      },
      {
        id: '4',
        title: 'Bug 诊断与修复',
        category: 'Bug修复',
        content: '请帮我诊断以下问题并修复...',
        tags: ['Debug', '修复'],
        successRate: 85,
        useCount: 15,
        createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
        lastUsedAt: new Date().toISOString(),
        starred: false,
        executionResults: []
      }
    ];
    localStorage.setItem(VAULT_KEY, JSON.stringify(defaultVault));
    return defaultVault;
  }
  return JSON.parse(data);
}

export function saveVault(vault: VaultItem[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VAULT_KEY, JSON.stringify(vault));
}

export function addToVault(item: Omit<VaultItem, 'id' | 'createdAt' | 'lastUsedAt' | 'useCount' | 'successRate'>) {
  const vault = getVault();
  const newItem: VaultItem = {
    ...item,
    id: Date.now().toString(),
    createdAt: new Date().toISOString(),
    lastUsedAt: new Date().toISOString(),
    useCount: 0,
    successRate: 80
  };
  vault.unshift(newItem);
  saveVault(vault);
  return newItem;
}

export function updateVaultItem(id: string, updates: Partial<VaultItem>) {
  const vault = getVault();
  const index = vault.findIndex(item => item.id === id);
  if (index !== -1) {
    vault[index] = { ...vault[index], ...updates };
    saveVault(vault);
  }
}

export function deleteFromVault(id: string) {
  const vault = getVault().filter(item => item.id !== id);
  saveVault(vault);
}

export const categories = [
  '项目启动',
  '架构设计',
  '功能开发',
  'UI优化',
  '性能优化',
  'Bug修复',
  '重构',
  '部署',
  '复盘'
];
