import { getSupabaseServer, getSupabaseBrowser, isSupabaseConfigured } from '../supabase/client';
import { calculatePromptScore, PromptScore } from './scorer';

export type PromptPhase =
  | 'idea'
  | 'architecture'
  | 'implementation'
  | 'optimization'
  | 'debug'
  | 'deployment';

export type ExecutionMode = 'simulated' | 'real-api' | 'manual' | 'mock';

export interface ExecutionProvenance {
  executionMode: ExecutionMode;
  externalAgent?: string;
  realExecution: boolean;
  executionSource?: string;
  executionDuration?: number;
  userRating?: number;
  failureReason?: string;
  modificationCount?: number;
}

export interface PromptAsset {
  id: string;
  title: string;
  projectId?: string;
  category: string;
  source: 'user-generated' | 'system-template';
  phase: PromptPhase;
  input: string;
  clarifications: string[];
  fullPrompt: string;
  executionUsed: boolean;
  executionSuccess?: boolean;
  rating?: number;
  tags: string[];
  favorite: boolean;
  archived?: boolean;
  createdAt: string;
  version?: number;
  parentId?: string;
  mutationReason?: string;
  diffSummary?: string;
  score?: number;
  scoreDetails?: PromptScore;
  feedback?: 'excellent' | 'average' | 'failed';
  provenance?: ExecutionProvenance;
}

export type PromptHistoryRecord = PromptAsset;

export function generatePromptId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `prompt-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

const STORAGE_KEY = 'agentforge_prompt_history';

function migrateRecord(raw: any): PromptAsset {
  if (raw.fullPrompt !== undefined && raw.createdAt !== undefined && raw.source !== undefined) {
    return {
      id: raw.id,
      title: raw.title || '',
      projectId: raw.projectId,
      category: raw.category || '',
      source: raw.source || 'user-generated',
      phase: raw.phase || 'idea',
      input: raw.input || '',
      clarifications: raw.clarifications || [],
      fullPrompt: raw.fullPrompt || '',
      executionUsed: raw.executionUsed ?? false,
      executionSuccess: raw.executionSuccess,
      rating: raw.rating,
      tags: raw.tags || [],
      favorite: raw.favorite || false,
      archived: raw.archived || false,
      createdAt: raw.createdAt || new Date().toISOString(),
      version: raw.version,
      parentId: raw.parentId,
      mutationReason: raw.mutationReason,
      diffSummary: raw.diffSummary,
      score: raw.score,
      scoreDetails: raw.scoreDetails,
      feedback: raw.feedback,
      provenance: raw.provenance,
    };
  }
  return {
    id: raw.id,
    title: raw.title || '',
    projectId: raw.project_id || raw.projectId,
    category: raw.project_type || raw.category || '',
    source: raw.source || 'user-generated',
    phase: raw.phase || 'idea',
    input: raw.input || '',
    clarifications: raw.clarifications || [],
    fullPrompt: raw.output || raw.fullPrompt || '',
    executionUsed: raw.executionUsed ?? (raw.execution_success !== undefined && raw.execution_success !== null),
    executionSuccess: raw.execution_success ?? raw.executionSuccess,
    rating: raw.rating,
    tags: raw.tags || [],
    favorite: raw.favorite || false,
    archived: raw.archived || false,
    createdAt: raw.created_at || raw.createdAt || new Date().toISOString(),
    version: raw.version,
    parentId: raw.parent_id || raw.parentId,
    mutationReason: raw.mutation_reason || raw.mutationReason,
    diffSummary: raw.diff_summary || raw.diffSummary,
    score: raw.score,
    scoreDetails: raw.score_details || raw.scoreDetails,
    feedback: raw.feedback,
    provenance: raw.provenance,
  };
}

function getLocalStorageFallback(): PromptAsset[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      const migrated = parsed.map((r: any) => migrateRecord(r));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }
  } catch (e) {
    console.warn('[PromptHistory] localStorage read failed');
  }
  return [];
}

function saveToLocalStorage(assets: PromptAsset[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  } catch (e) {
    console.warn('[PromptHistory] localStorage write failed');
  }
}

function toSupabaseRow(asset: PromptAsset) {
  return {
    id: asset.id,
    title: asset.title,
    project_id: asset.projectId,
    project_type: asset.category,
    phase: asset.phase,
    input: asset.input,
    output: asset.fullPrompt,
    created_at: asset.createdAt,
    favorite: asset.favorite,
    archived: asset.archived || false,
    tags: asset.tags,
    version: asset.version,
    parent_id: asset.parentId,
    mutation_reason: asset.mutationReason,
    diff_summary: asset.diffSummary,
    score: asset.score,
    score_details: asset.scoreDetails,
    execution_success: asset.executionSuccess,
    feedback: asset.feedback,
    provenance: asset.provenance,
  };
}

function fromSupabaseRow(row: any): PromptAsset {
  return migrateRecord(row);
}

const SYSTEM_TEMPLATES: PromptAsset[] = [
  {
    id: 'sys-nextjs-fullstack',
    title: 'Next.js 全栈项目启动',
    category: '架构设计',
    source: 'system-template',
    phase: 'architecture',
    input: '启动一个 Next.js 全栈项目，包含认证、数据库、API 和前端页面',
    clarifications: ['需要哪些核心功能模块？', '数据库选择 PostgreSQL 还是 MongoDB？'],
    fullPrompt: `# Next.js 全栈项目架构规划

## 项目概述
基于 Next.js 14 App Router 构建生产级全栈 Web 应用。

## 技术栈
- 框架: Next.js 14 + TypeScript
- 样式: Tailwind CSS
- 数据库: PostgreSQL + Prisma ORM
- 认证: NextAuth.js v5
- 部署: Vercel
- 测试: Jest + Playwright

## 目录结构
app/
  (auth)/login/page.tsx
  (auth)/register/page.tsx
  (dashboard)/layout.tsx
  (dashboard)/page.tsx
  (dashboard)/settings/page.tsx
  api/auth/[...nextauth]/route.ts
  api/projects/route.ts
  api/projects/[id]/route.ts
components/
  ui/ (Button, Input, Modal, etc.)
  layout/ (Header, Sidebar, Footer)
  features/ (ProjectCard, TaskList, etc.)
lib/
  db.ts (Prisma client)
  auth.ts (NextAuth config)
  utils.ts (shared utilities)
prisma/
  schema.prisma

## 核心模块
1. 认证系统 - OAuth (GitHub/Google) + 邮箱密码
2. 数据管理 - CRUD + 分页 + 搜索 + 筛选
3. 文件上传 - S3 + 预签名 URL
4. 实时通知 - Server-Sent Events
5. 权限控制 - RBAC (Admin/Member/Viewer)

## 数据模型
- User: id, name, email, avatar, role
- Project: id, name, description, ownerId, status
- Task: id, title, status, priority, projectId, assigneeId

## 开发阶段
Phase 1: 项目初始化 + 认证系统
Phase 2: 核心 CRUD + 数据模型
Phase 3: 高级功能 (文件、通知、权限)
Phase 4: 测试 + 优化 + 部署`,
    executionUsed: false,
    tags: ['Next.js', '全栈', 'TypeScript', '架构'],
    favorite: false,
    createdAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'sys-react-optimization',
    title: 'React 组件性能优化',
    category: '性能优化',
    source: 'system-template',
    phase: 'optimization',
    input: '优化 React 应用的渲染性能，解决大列表卡顿和不必要的重渲染',
    clarifications: ['目前使用什么状态管理方案？', '列表数据量大约多少条？'],
    fullPrompt: `# React 性能优化方案

## 问题诊断
1. 使用 React DevTools Profiler 定位不必要的重渲染
2. 检查 React.memo、useMemo、useCallback 的使用情况
3. 分析 bundle size，找出体积过大的依赖

## 优化策略

### 1. 组件级优化
- 对纯展示组件使用 React.memo
- 使用 useMemo 缓存计算密集型操作
- 使用 useCallback 稳定事件处理函数引用
- 拆分大组件为更小的独立组件

### 2. 列表虚拟化
\`\`\`tsx
import { useVirtualizer } from '@tanstack/react-virtual';

function VirtualList({ items }: { items: Item[] }) {
  const parentRef = useRef<HTMLDivElement>(null);
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });
  // ... render virtual items
}
\`\`\`

### 3. 状态管理优化
- 将全局状态拆分为细粒度的 store
- 使用 Zustand 的 shallow comparison
- 避免在 render 中创建新对象

### 4. 代码分割
\`\`\`tsx
const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <Skeleton />,
  ssr: false,
});
\`\`\`

### 5. 图片优化
- 使用 next/image 自动优化
- 实现懒加载 (Intersection Observer)
- 提供 WebP/AVIF 格式

## 验收指标
- LCP < 2.5s
- FID < 100ms
- CLS < 0.1
- 大列表 (>1000 items) 滚动 FPS > 55`,
    executionUsed: false,
    tags: ['React', '性能优化', '虚拟列表'],
    favorite: false,
    createdAt: '2024-01-02T00:00:00.000Z',
  },
  {
    id: 'sys-api-design',
    title: 'RESTful API 设计规范',
    category: '接口设计',
    source: 'system-template',
    phase: 'implementation',
    input: '设计一套完整的 RESTful API，包含认证、CRUD、分页和错误处理',
    clarifications: ['需要支持哪些资源类型？', '是否需要版本控制？'],
    fullPrompt: `# RESTful API 设计规范

## 基础规范
- Base URL: /api/v1
- 认证: Bearer Token (JWT)
- 响应格式: JSON
- 时间格式: ISO 8601

## 响应结构
\`\`\`json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 150
  }
}
\`\`\`

## 错误处理
\`\`\`json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "邮箱格式不正确",
    "details": [{ "field": "email", "message": "Invalid format" }]
  }
}
\`\`\`

## 核心端点
| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /auth/register | 注册 |
| POST | /auth/login | 登录 |
| GET | /users/me | 当前用户 |
| GET | /projects | 项目列表 |
| POST | /projects | 创建项目 |
| GET | /projects/:id | 项目详情 |
| PATCH | /projects/:id | 更新项目 |
| DELETE | /projects/:id | 删除项目 |
| GET | /projects/:id/tasks | 任务列表 |
| POST | /projects/:id/tasks | 创建任务 |

## 中间件链
认证 → 速率限制 → 参数校验 → 业务逻辑 → 错误处理

## 分页参数
?page=1&pageSize=20&sort=createdAt:desc&search=keyword`,
    executionUsed: false,
    tags: ['API', 'REST', '接口设计'],
    favorite: false,
    createdAt: '2024-01-03T00:00:00.000Z',
  },
  {
    id: 'sys-debug-diagnosis',
    title: '生产问题诊断模板',
    category: '问题修复',
    source: 'system-template',
    phase: 'debug',
    input: '系统出现性能问题或错误，需要系统性诊断和修复',
    clarifications: ['错误信息是什么？', '是最近才出现还是一直存在？'],
    fullPrompt: `# 生产问题诊断与修复

## 信息收集
1. 错误日志 (stack trace, error message)
2. 复现步骤 (frequency, conditions)
3. 影响范围 (all users / specific segment)
4. 时间线 (when started, any deployments around that time)

## 诊断流程

### Step 1: 环境检查
- Node.js 版本
- 依赖版本 (package-lock.json diff)
- 环境变量配置
- 数据库连接状态

### Step 2: 日志分析
\`\`\`bash
# 查看最近错误日志
tail -n 100 /var/log/app/error.log | grep ERROR

# 检查内存使用
node --inspect --expose-gc app.js

# 分析请求延迟
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:3000/api/endpoint
\`\`\`

### Step 3: 代码审查
- 检查最近的 git commits
- 审查相关 API 端点
- 检查数据库查询性能
- 验证中间件链

### Step 4: 性能分析
\`\`\`bash
# CPU profiling
node --prof app.js
node --prof-process isolate-*.log

# 内存分析
node --heapprod app.js
\`\`\`

## 修复方案模板
1. 根本原因: [描述]
2. 影响范围: [描述]
3. 修复方案: [代码变更]
4. 测试验证: [测试用例]
5. 预防措施: [长期改进]`,
    executionUsed: false,
    tags: ['Debug', '诊断', '修复'],
    favorite: false,
    createdAt: '2024-01-04T00:00:00.000Z',
  },
  {
    id: 'sys-deployment',
    title: '生产环境部署方案',
    category: '部署运维',
    source: 'system-template',
    phase: 'deployment',
    input: '将应用部署到生产环境，包含 CI/CD、监控和回滚机制',
    clarifications: ['目标部署平台是什么？', '是否需要容器化？'],
    fullPrompt: `# 生产环境部署方案

## CI/CD 流水线

### GitHub Actions 配置
\`\`\`yaml
name: Deploy
on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck
      - run: npm test

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm run build
      - uses: amondnet/vercel-action@v25

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to production
        run: vercel --prod --token \${{ secrets.VERCEL_TOKEN }}
\`\`\`

## 部署检查清单
- [ ] 环境变量已配置
- [ ] 数据库迁移已执行
- [ ] SSL 证书有效
- [ ] CDN 缓存已清除
- [ ] 健康检查端点正常
- [ ] 回滚方案已准备

## 监控配置
- 错误追踪: Sentry
- 性能监控: Vercel Analytics
- 日志管理: Axiom / Datadog
- 告警: PagerDuty / Slack webhook

## 回滚策略
1. 保留最近 3 个版本的部署快照
2. 发现问题后 5 分钟内回滚
3. 回滚后通知相关人员
4. 记录回滚原因和改进措施`,
    executionUsed: false,
    tags: ['部署', 'CI/CD', 'DevOps'],
    favorite: false,
    createdAt: '2024-01-05T00:00:00.000Z',
  },
];

export function getSystemTemplates(): PromptAsset[] {
  return SYSTEM_TEMPLATES;
}

export async function savePrompt(params: {
  title: string;
  category: string;
  phase?: PromptPhase;
  projectId?: string;
  input: string;
  fullPrompt: string;
  tags?: string[];
  version?: number;
  parentId?: string;
  mutationReason?: string;
  diffSummary?: string;
  source?: 'user-generated' | 'system-template';
  clarifications?: string[];
  executionSuccess?: boolean;
  feedback?: 'excellent' | 'average' | 'failed';
  qualityScore?: number;
}): Promise<PromptAsset> {
  const scoreDetails = calculatePromptScore({
    prompt: params.fullPrompt,
    projectType: params.category,
    executionSuccess: params.executionSuccess,
    userFeedback: params.feedback,
  });

  const record: PromptAsset = {
    id: generatePromptId(),
    title: params.title,
    category: params.category,
    phase: params.phase || 'idea',
    projectId: params.projectId,
    input: params.input,
    fullPrompt: params.fullPrompt,
    createdAt: new Date().toISOString(),
    favorite: false,
    tags: params.tags || [],
    version: params.version || 1,
    parentId: params.parentId,
    mutationReason: params.mutationReason,
    diffSummary: params.diffSummary,
    score: scoreDetails.overall,
    scoreDetails: scoreDetails,
    executionSuccess: params.executionSuccess,
    executionUsed: params.executionSuccess !== undefined,
    feedback: params.feedback,
    source: params.source || 'user-generated',
    clarifications: params.clarifications || [],
    rating: undefined,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase.from('prompt_history').insert(toSupabaseRow(record));
        if (!error) return record;
        console.warn('[PromptHistory] Supabase save failed, falling back');
      } catch (e) {
        console.warn('[PromptHistory] Supabase save error, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  history.unshift(record);
  saveToLocalStorage(history.slice(0, 200));
  return record;
}

export async function getPromptHistory(options?: {
  projectId?: string;
  limit?: number;
  search?: string;
  onlyFavorites?: boolean;
  source?: 'user-generated' | 'system-template';
  sortBy?: 'smart' | 'score' | 'date' | 'favorite' | 'recent-use';
}): Promise<PromptAsset[]> {
  let records: PromptAsset[] = [];

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        let query = supabase.from('prompt_history').select('*');

        if (options?.projectId) {
          query = query.eq('project_id', options.projectId);
        }
        if (options?.onlyFavorites) {
          query = query.eq('favorite', true);
        }
        if (options?.limit) {
          query = query.limit(options.limit);
        }
        if (options?.search) {
          query = query.or(
            `title.ilike.%${options.search}%,input.ilike.%${options.search}%,output.ilike.%${options.search}%`
          );
        }
        query = query.order('created_at', { ascending: false });

        const { data, error } = await query;
        if (!error && data) {
          records = data.map(fromSupabaseRow);
        }
      } catch (e) {
        console.warn('[PromptHistory] Supabase fetch failed, falling back');
      }
    }
  }

  if (records.length === 0) {
    records = getLocalStorageFallback();
  }

  if (options?.projectId) {
    records = records.filter(r => r.projectId === options.projectId);
  }

  if (options?.source) {
    records = records.filter(r => r.source === options.source);
  }

  if (options?.onlyFavorites) {
    records = records.filter(r => r.favorite);
  }

  if (options?.search) {
    const s = options.search.toLowerCase();
    records = records.filter(
      r =>
        r.title.toLowerCase().includes(s) ||
        r.input.toLowerCase().includes(s) ||
        r.fullPrompt.toLowerCase().includes(s)
    );
  }

  if (options?.sortBy === 'smart' || options?.sortBy === undefined) {
    records = sortBySmart(records);
  } else if (options?.sortBy === 'score') {
    records = [...records].sort((a, b) => (b.score || 0) - (a.score || 0));
  } else if (options?.sortBy === 'favorite') {
    records = [...records].sort((a, b) => (b.favorite ? 1 : 0) - (a.favorite ? 1 : 0));
  } else if (options?.sortBy === 'date') {
    records = [...records].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  if (options?.limit) {
    records = records.slice(0, options.limit);
  }

  return records;
}

function sortBySmart(records: PromptAsset[]): PromptAsset[] {
  return [...records].sort((a, b) => {
    if (a.favorite && !b.favorite) return -1;
    if (!a.favorite && b.favorite) return 1;

    const aScore = a.score || 50;
    const bScore = b.score || 50;
    if (aScore !== bScore) return bScore - aScore;

    const aDate = new Date(a.createdAt).getTime();
    const bDate = new Date(b.createdAt).getTime();
    return bDate - aDate;
  });
}

export async function toggleFavorite(id: string, favorite?: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('prompt_history')
          .select('favorite')
          .eq('id', id)
          .maybeSingle();

        const newFavorite = favorite !== undefined ? favorite : !existing?.favorite;

        const { error } = await supabase
          .from('prompt_history')
          .update({ favorite: newFavorite })
          .eq('id', id);

        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase toggle failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex(r => r.id === id);
  if (idx !== -1) {
    history[idx].favorite = favorite !== undefined ? favorite : !history[idx].favorite;
    saveToLocalStorage(history);
  }
}

export async function toggleArchive(id: string, archived?: boolean): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { data: existing } = await supabase
          .from('prompt_history')
          .select('archived')
          .eq('id', id)
          .maybeSingle();

        const newArchived = archived !== undefined ? archived : !existing?.archived;

        const { error } = await supabase
          .from('prompt_history')
          .update({ archived: newArchived })
          .eq('id', id);

        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase archive toggle failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex(r => r.id === id);
  if (idx !== -1) {
    history[idx].archived = archived !== undefined ? archived : !history[idx].archived;
    saveToLocalStorage(history);
  }
}

export async function deletePrompt(id: string): Promise<void> {
  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase.from('prompt_history').delete().eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase delete failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback().filter(r => r.id !== id);
  saveToLocalStorage(history);
}

export async function searchPrompt(query: string, limit: number = 20): Promise<PromptAsset[]> {
  return getPromptHistory({ search: query, limit });
}

export async function getPromptById(id: string): Promise<PromptAsset | null> {
  const sys = SYSTEM_TEMPLATES.find(t => t.id === id);
  if (sys) return sys;

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('prompt_history')
          .select('*')
          .eq('id', id)
          .maybeSingle();
        if (!error && data) return fromSupabaseRow(data);
      } catch (e) {
        console.warn('[PromptHistory] Supabase fetch failed, falling back');
      }
    }
  }

  const history = getLocalStorageFallback();
  return history.find(r => r.id === id) || null;
}

export async function updatePromptFeedback(
  id: string,
  feedback: 'excellent' | 'average' | 'failed'
): Promise<void> {
  const prompt = await getPromptById(id);
  if (!prompt) return;

  const newScore = calculatePromptScore({
    prompt: prompt.fullPrompt,
    projectType: prompt.category,
    executionSuccess: prompt.executionSuccess,
    userFeedback: feedback,
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('prompt_history')
          .update({ feedback, score: newScore.overall, score_details: newScore })
          .eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase feedback update failed');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex(r => r.id === id);
  if (idx !== -1) {
    history[idx] = { ...history[idx], feedback, score: newScore.overall, scoreDetails: newScore };
    saveToLocalStorage(history);
  }
}

export async function updateExecutionSuccess(id: string, success: boolean): Promise<void> {
  const prompt = await getPromptById(id);
  if (!prompt) return;

  const newScore = calculatePromptScore({
    prompt: prompt.fullPrompt,
    projectType: prompt.category,
    executionSuccess: success,
    userFeedback: prompt.feedback,
  });

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('prompt_history')
          .update({ execution_success: success, score: newScore.overall, score_details: newScore })
          .eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase execution update failed');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex(r => r.id === id);
  if (idx !== -1) {
    history[idx] = {
      ...history[idx],
      executionUsed: true,
      executionSuccess: success,
      score: newScore.overall,
      scoreDetails: newScore,
    };
    saveToLocalStorage(history);
  }
}

export async function updateAssetExecutionResult(
  id: string,
  result: {
    success: 'success' | 'partial' | 'failed';
    rating: number;
    notes?: string;
    provenance?: ExecutionProvenance;
  }
): Promise<void> {
  const prompt = await getPromptById(id);
  if (!prompt) return;

  const executionSuccess = result.success === 'success';
  const feedbackMap: Record<string, 'excellent' | 'average' | 'failed'> = {
    success: 'excellent',
    partial: 'average',
    failed: 'failed',
  };

  const newScore = calculatePromptScore({
    prompt: prompt.fullPrompt,
    projectType: prompt.category,
    executionSuccess,
    userFeedback: feedbackMap[result.success],
  });

  const provenanceData: ExecutionProvenance = result.provenance || {
    executionMode: 'simulated',
    realExecution: false,
  };

  if (isSupabaseConfigured()) {
    const supabase = getSupabaseServer() || getSupabaseBrowser();
    if (supabase) {
      try {
        const { error } = await supabase
          .from('prompt_history')
          .update({
            execution_success: executionSuccess,
            feedback: feedbackMap[result.success],
            rating: result.rating,
            score: newScore.overall,
            score_details: newScore,
            provenance: provenanceData,
          })
          .eq('id', id);
        if (!error) return;
      } catch (e) {
        console.warn('[PromptHistory] Supabase execution result update failed');
      }
    }
  }

  const history = getLocalStorageFallback();
  const idx = history.findIndex(r => r.id === id);
  if (idx !== -1) {
    history[idx] = {
      ...history[idx],
      executionUsed: true,
      executionSuccess,
      rating: result.rating,
      feedback: feedbackMap[result.success],
      score: newScore.overall,
      scoreDetails: newScore,
      provenance: provenanceData,
    };
    saveToLocalStorage(history);
  }
}

export async function savePromptVersion(
  originalId: string,
  improvedPrompt: string,
  mutationReason?: string
): Promise<PromptAsset> {
  const original = await getPromptById(originalId);
  if (!original) {
    throw new Error('Original prompt not found');
  }

  const nextVersion = (original.version || 1) + 1;
  const diffSummary = computeDiffSummary(original.fullPrompt, improvedPrompt);

  return await savePrompt({
    title: original.title,
    category: original.category,
    phase: original.phase,
    projectId: original.projectId,
    input: original.input,
    fullPrompt: improvedPrompt,
    tags: [...original.tags],
    version: nextVersion,
    parentId: originalId,
    mutationReason: mutationReason || 'Prompt 优化迭代',
    diffSummary,
    source: original.source,
    clarifications: [...original.clarifications],
  });
}

function computeDiffSummary(oldPrompt: string, newPrompt: string): string {
  const oldLines = oldPrompt.split('\n').filter(l => l.trim());
  const newLines = newPrompt.split('\n').filter(l => l.trim());
  const added = newLines.filter(l => !oldLines.includes(l)).length;
  const removed = oldLines.filter(l => !newLines.includes(l)).length;
  const oldLen = oldPrompt.length;
  const newLen = newPrompt.length;
  const lenDiff = newLen - oldLen;
  const parts: string[] = [];
  if (lenDiff > 0) parts.push(`内容扩展 +${lenDiff} 字符`);
  else if (lenDiff < 0) parts.push(`内容精简 ${lenDiff} 字符`);
  if (added > 0) parts.push(`新增 ${added} 行`);
  if (removed > 0) parts.push(`移除 ${removed} 行`);
  return parts.join('，') || '格式优化';
}

export async function getVersionChain(id: string): Promise<PromptAsset[]> {
  const chain: PromptAsset[] = [];
  const visited = new Set<string>();

  let current: PromptAsset | null = await getPromptById(id);
  while (current && !visited.has(current.id)) {
    chain.unshift(current);
    visited.add(current.id);
    if (current.parentId) {
      current = await getPromptById(current.parentId);
    } else {
      break;
    }
  }

  if (chain.length > 0) {
    const root = chain[0];
    const children = await getVersionChildren(root.id, visited);
    for (const child of children) {
      if (!chain.find(c => c.id === child.id)) {
        chain.push(child);
      }
    }
  }

  return chain.sort((a, b) => (a.version || 1) - (b.version || 1));
}

async function getVersionChildren(
  parentId: string,
  visited: Set<string>
): Promise<PromptAsset[]> {
  const all = await getPromptHistory({ limit: 500 });
  const children: PromptAsset[] = [];
  for (const asset of all) {
    if (asset.parentId === parentId && !visited.has(asset.id)) {
      visited.add(asset.id);
      children.push(asset);
      const grandChildren = await getVersionChildren(asset.id, visited);
      children.push(...grandChildren);
    }
  }
  return children;
}

export async function rollbackToVersion(targetId: string): Promise<PromptAsset> {
  const target = await getPromptById(targetId);
  if (!target) throw new Error('Target version not found');

  const chain = await getVersionChain(targetId);
  const latestVersion = chain.reduce((max, c) => Math.max(max, c.version || 1), 0);

  return await savePrompt({
    title: target.title,
    category: target.category,
    phase: target.phase,
    projectId: target.projectId,
    input: target.input,
    fullPrompt: target.fullPrompt,
    tags: [...target.tags],
    version: latestVersion + 1,
    parentId: targetId,
    mutationReason: `回滚到 v${target.version}`,
    diffSummary: `基于 v${target.version} 的回滚版本`,
    source: target.source,
    clarifications: [...target.clarifications],
  });
}

export async function suggestVersionUpgrade(id: string): Promise<{
  shouldUpgrade: boolean;
  reason: string;
  suggestions: string[];
}> {
  const prompt = await getPromptById(id);
  if (!prompt) return { shouldUpgrade: false, reason: 'Prompt 不存在', suggestions: [] };

  const suggestions: string[] = [];
  let shouldUpgrade = false;
  let reason = '';

  if (prompt.feedback === 'failed') {
    shouldUpgrade = true;
    reason = '执行失败，建议优化 Prompt 后生成新版本';
    suggestions.push('检查 Prompt 指令是否明确');
    suggestions.push('增加错误处理和边界条件描述');
    suggestions.push('补充具体的输出格式要求');
  } else if (prompt.feedback === 'average') {
    shouldUpgrade = true;
    reason = '执行效果一般，可以尝试优化';
    suggestions.push('增加更详细的上下文信息');
    suggestions.push('优化表述的精确度');
    suggestions.push('添加验收标准');
  } else if (prompt.score && prompt.score < 70) {
    shouldUpgrade = true;
    reason = 'Prompt 评分较低，建议优化';
    suggestions.push('改进 Prompt 结构');
    suggestions.push('增加角色定义');
    suggestions.push('明确输出格式');
  }

  if (prompt.version && prompt.version > 1) {
    const chain = await getVersionChain(id);
    const prevVersion = chain.find(c => c.version === (prompt.version || 1) - 1);
    if (prevVersion && prevVersion.feedback === 'failed' && prompt.feedback === 'failed') {
      reason = '连续两版均失败，建议重新审视需求本身';
      suggestions.push('检查原始需求是否合理');
      suggestions.push('尝试将任务拆分为更小的子任务');
    }
  }

  return { shouldUpgrade, reason, suggestions };
}
