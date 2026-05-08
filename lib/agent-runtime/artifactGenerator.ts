export interface ArchitectureNode {
  id: string;
  label: string;
  icon: string;
  description: string;
  type: 'client' | 'gateway' | 'service' | 'database' | 'external';
}

export interface ArchitectureEdge {
  from: string;
  to: string;
  label?: string;
}

export interface DataModelField {
  name: string;
  type: string;
  constraint: string;
  description: string;
}

export interface DataModelTable {
  name: string;
  description: string;
  fields: DataModelField[];
}

export interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  path: string;
  description: string;
  requestBody?: string;
  responseBody?: string;
}

export interface FileTreeNode {
  name: string;
  type: 'file' | 'directory';
  description: string;
  children?: FileTreeNode[];
}

export interface DeployChecklistItem {
  label: string;
  checked: boolean;
  detail: string;
}

export interface EngineeringArtifacts {
  architecture: { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] };
  dataModels: DataModelTable[];
  apiEndpoints: ApiEndpoint[];
  fileTree: FileTreeNode[];
  deployChecklist: DeployChecklistItem[];
}

const ARCHITECTURE_TEMPLATES: Record<string, { nodes: ArchitectureNode[]; edges: ArchitectureEdge[] }> = {
  '打卡': {
    nodes: [
      { id: 'client', label: '客户端', icon: '📱', description: 'Web/移动端用户界面', type: 'client' },
      { id: 'gateway', label: 'API 网关', icon: '🌐', description: '请求路由与认证', type: 'gateway' },
      { id: 'auth', label: '认证服务', icon: '🔐', description: '用户登录与 JWT 管理', type: 'service' },
      { id: 'task', label: '打卡服务', icon: '✅', description: '打卡记录与连续统计', type: 'service' },
      { id: 'notify', label: '提醒服务', icon: '🔔', description: '定时提醒与推送', type: 'service' },
      { id: 'db', label: 'PostgreSQL', icon: '🗄', description: '数据持久化存储', type: 'database' },
    ],
    edges: [
      { from: 'client', to: 'gateway', label: 'HTTPS' },
      { from: 'gateway', to: 'auth', label: 'JWT 验证' },
      { from: 'gateway', to: 'task', label: '业务请求' },
      { from: 'task', to: 'db', label: 'CRUD' },
      { from: 'notify', to: 'task', label: '查询任务' },
    ],
  },
  '博客': {
    nodes: [
      { id: 'client', label: '前端应用', icon: '🖥', description: 'SSR + CSR 混合渲染', type: 'client' },
      { id: 'gateway', label: 'API 路由', icon: '🌐', description: 'Next.js API Routes', type: 'gateway' },
      { id: 'cms', label: 'CMS 服务', icon: '📝', description: '文章管理与发布', type: 'service' },
      { id: 'seo', label: 'SEO 引擎', icon: '🔍', description: 'Meta/Sitemap 生成', type: 'service' },
      { id: 'comment', label: '评论服务', icon: '💬', description: '嵌套评论与审核', type: 'service' },
      { id: 'db', label: 'PostgreSQL', icon: '🗄', description: '数据持久化', type: 'database' },
    ],
    edges: [
      { from: 'client', to: 'gateway' },
      { from: 'gateway', to: 'cms' },
      { from: 'gateway', to: 'seo' },
      { from: 'gateway', to: 'comment' },
      { from: 'cms', to: 'db' },
      { from: 'comment', to: 'db' },
    ],
  },
  '电商': {
    nodes: [
      { id: 'client', label: '商城前端', icon: '🛍', description: '商品浏览与下单', type: 'client' },
      { id: 'gateway', label: 'API 网关', icon: '🌐', description: '请求路由与限流', type: 'gateway' },
      { id: 'product', label: '商品服务', icon: '📦', description: 'SPU/SKU 管理', type: 'service' },
      { id: 'order', label: '订单服务', icon: '📋', description: '订单状态机', type: 'service' },
      { id: 'payment', label: '支付服务', icon: '💳', description: '支付渠道对接', type: 'service' },
      { id: 'db', label: 'PostgreSQL', icon: '🗄', description: '数据持久化', type: 'database' },
    ],
    edges: [
      { from: 'client', to: 'gateway' },
      { from: 'gateway', to: 'product' },
      { from: 'gateway', to: 'order' },
      { from: 'order', to: 'payment' },
      { from: 'product', to: 'db' },
      { from: 'order', to: 'db' },
    ],
  },
};

const DEFAULT_ARCHITECTURE = {
  nodes: [
    { id: 'client', label: '客户端', icon: '🖥', description: '用户交互界面', type: 'client' as const },
    { id: 'gateway', label: 'API 层', icon: '🌐', description: '接口路由与中间件', type: 'gateway' as const },
    { id: 'service', label: '业务服务', icon: '⚙️', description: '核心业务逻辑', type: 'service' as const },
    { id: 'db', label: '数据库', icon: '🗄', description: '数据持久化', type: 'database' as const },
  ],
  edges: [
    { from: 'client', to: 'gateway' },
    { from: 'gateway', to: 'service' },
    { from: 'service', to: 'db' },
  ],
};

const DATA_MODEL_TEMPLATES: Record<string, DataModelTable[]> = {
  '打卡': [
    {
      name: 'users',
      description: '用户表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '用户唯一标识' },
        { name: 'username', type: 'VARCHAR(50)', constraint: 'UNIQUE NOT NULL', description: '用户名' },
        { name: 'avatar_url', type: 'VARCHAR(500)', constraint: 'NULLABLE', description: '头像地址' },
        { name: 'created_at', type: 'TIMESTAMPTZ', constraint: 'DEFAULT NOW()', description: '注册时间' },
      ],
    },
    {
      name: 'tasks',
      description: '打卡任务表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '任务唯一标识' },
        { name: 'user_id', type: 'UUID', constraint: 'FK → users.id', description: '所属用户' },
        { name: 'title', type: 'VARCHAR(200)', constraint: 'NOT NULL', description: '任务标题' },
        { name: 'frequency', type: 'VARCHAR(20)', constraint: 'DEFAULT daily', description: '频率(daily/weekly)' },
        { name: 'is_active', type: 'BOOLEAN', constraint: 'DEFAULT true', description: '是否启用' },
      ],
    },
    {
      name: 'checkins',
      description: '打卡记录表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '记录唯一标识' },
        { name: 'task_id', type: 'UUID', constraint: 'FK → tasks.id', description: '关联任务' },
        { name: 'checkin_date', type: 'DATE', constraint: 'NOT NULL', description: '打卡日期' },
        { name: 'streak_count', type: 'INTEGER', constraint: 'DEFAULT 0', description: '连续天数' },
        { name: 'is_makeup', type: 'BOOLEAN', constraint: 'DEFAULT false', description: '是否补签' },
      ],
    },
    {
      name: 'statistics',
      description: '统计表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '统计唯一标识' },
        { name: 'user_id', type: 'UUID', constraint: 'FK → users.id', description: '所属用户' },
        { name: 'total_checkins', type: 'INTEGER', constraint: 'DEFAULT 0', description: '总打卡数' },
        { name: 'max_streak', type: 'INTEGER', constraint: 'DEFAULT 0', description: '最长连续' },
        { name: 'completion_rate', type: 'DECIMAL(5,2)', constraint: 'DEFAULT 0', description: '完成率' },
      ],
    },
  ],
  '博客': [
    {
      name: 'posts',
      description: '文章表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '文章唯一标识' },
        { name: 'title', type: 'VARCHAR(200)', constraint: 'NOT NULL', description: '文章标题' },
        { name: 'slug', type: 'VARCHAR(200)', constraint: 'UNIQUE', description: 'URL 语义化标识' },
        { name: 'content', type: 'TEXT', constraint: 'NOT NULL', description: '正文内容(Markdown)' },
        { name: 'status', type: 'VARCHAR(20)', constraint: 'DEFAULT draft', description: '草稿/已发布' },
        { name: 'author_id', type: 'UUID', constraint: 'FK → users.id', description: '作者' },
        { name: 'view_count', type: 'INTEGER', constraint: 'DEFAULT 0', description: '浏览数' },
      ],
    },
    {
      name: 'tags',
      description: '标签表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '标签唯一标识' },
        { name: 'name', type: 'VARCHAR(50)', constraint: 'UNIQUE', description: '标签名' },
        { name: 'post_count', type: 'INTEGER', constraint: 'DEFAULT 0', description: '关联文章数' },
      ],
    },
    {
      name: 'comments',
      description: '评论表',
      fields: [
        { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '评论唯一标识' },
        { name: 'post_id', type: 'UUID', constraint: 'FK → posts.id', description: '所属文章' },
        { name: 'parent_id', type: 'UUID', constraint: 'FK → comments.id', description: '父评论(嵌套)' },
        { name: 'content', type: 'TEXT', constraint: 'NOT NULL', description: '评论内容' },
        { name: 'status', type: 'VARCHAR(20)', constraint: 'DEFAULT pending', description: '审核状态' },
      ],
    },
  ],
};

const DEFAULT_DATA_MODELS: DataModelTable[] = [
  {
    name: 'users',
    description: '用户表',
    fields: [
      { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '用户唯一标识' },
      { name: 'email', type: 'VARCHAR(255)', constraint: 'UNIQUE NOT NULL', description: '邮箱' },
      { name: 'name', type: 'VARCHAR(100)', constraint: 'NOT NULL', description: '用户名' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraint: 'DEFAULT NOW()', description: '创建时间' },
    ],
  },
  {
    name: 'core_data',
    description: '核心业务表',
    fields: [
      { name: 'id', type: 'UUID', constraint: 'PRIMARY KEY', description: '记录唯一标识' },
      { name: 'user_id', type: 'UUID', constraint: 'FK → users.id', description: '所属用户' },
      { name: 'content', type: 'JSONB', constraint: 'NOT NULL', description: '业务数据' },
      { name: 'status', type: 'VARCHAR(20)', constraint: 'DEFAULT active', description: '状态' },
      { name: 'created_at', type: 'TIMESTAMPTZ', constraint: 'DEFAULT NOW()', description: '创建时间' },
    ],
  },
];

const API_TEMPLATES: Record<string, ApiEndpoint[]> = {
  '打卡': [
    { method: 'POST', path: '/api/tasks', description: '创建打卡任务', requestBody: '{ title, frequency }', responseBody: '{ id, title, frequency }' },
    { method: 'GET', path: '/api/tasks', description: '获取用户所有任务', responseBody: 'Task[]' },
    { method: 'POST', path: '/api/checkin', description: '执行打卡', requestBody: '{ task_id }', responseBody: '{ streak_count, checkin_date }' },
    { method: 'GET', path: '/api/stats', description: '获取打卡统计', responseBody: '{ total_checkins, max_streak, completion_rate }' },
    { method: 'POST', path: '/api/checkin/makeup', description: '补签打卡', requestBody: '{ task_id, date }', responseBody: '{ success }' },
  ],
  '博客': [
    { method: 'GET', path: '/api/posts', description: '获取文章列表', responseBody: 'Post[]' },
    { method: 'POST', path: '/api/posts', description: '创建文章', requestBody: '{ title, content, tags }', responseBody: '{ id, slug }' },
    { method: 'GET', path: '/api/posts/:slug', description: '获取文章详情', responseBody: 'Post' },
    { method: 'POST', path: '/api/comments', description: '提交评论', requestBody: '{ post_id, content }', responseBody: 'Comment' },
    { method: 'GET', path: '/api/tags', description: '获取标签列表', responseBody: 'Tag[]' },
  ],
};

const DEFAULT_API: ApiEndpoint[] = [
  { method: 'GET', path: '/api/resources', description: '获取资源列表', responseBody: 'Resource[]' },
  { method: 'POST', path: '/api/resources', description: '创建资源', requestBody: '{ ...fields }', responseBody: 'Resource' },
  { method: 'GET', path: '/api/resources/:id', description: '获取资源详情', responseBody: 'Resource' },
  { method: 'PUT', path: '/api/resources/:id', description: '更新资源', requestBody: '{ ...fields }', responseBody: 'Resource' },
  { method: 'DELETE', path: '/api/resources/:id', description: '删除资源', responseBody: '{ success: true }' },
];

const DEFAULT_FILE_TREE: FileTreeNode[] = [
  {
    name: 'app/', type: 'directory', description: 'Next.js App Router 页面', children: [
      { name: 'api/', type: 'directory', description: 'API 路由', children: [
        { name: 'auth/', type: 'directory', description: '认证接口' },
        { name: 'tasks/', type: 'directory', description: '业务接口' },
      ]},
      { name: 'page.tsx', type: 'file', description: '首页' },
      { name: 'layout.tsx', type: 'file', description: '全局布局' },
    ],
  },
  {
    name: 'components/', type: 'directory', description: 'UI 组件', children: [
      { name: 'ui/', type: 'directory', description: '基础组件' },
      { name: 'features/', type: 'directory', description: '业务组件' },
    ],
  },
  {
    name: 'lib/', type: 'directory', description: '核心库', children: [
      { name: 'db.ts', type: 'file', description: '数据库连接' },
      { name: 'auth.ts', type: 'file', description: '认证工具' },
      { name: 'utils.ts', type: 'file', description: '工具函数' },
    ],
  },
  { name: 'prisma/', type: 'directory', description: 'ORM Schema' },
  { name: 'package.json', type: 'file', description: '依赖配置' },
  { name: '.env.example', type: 'file', description: '环境变量模板' },
];

const DEPLOY_CHECKLIST: DeployChecklistItem[] = [
  { label: '环境变量配置', checked: true, detail: 'DATABASE_URL, NEXTAUTH_SECRET, API_KEY 等' },
  { label: '数据库迁移', checked: true, detail: '运行 prisma migrate deploy' },
  { label: '构建验证', checked: true, detail: 'npm run build 无错误' },
  { label: 'API 测试', checked: false, detail: '关键接口冒烟测试' },
  { label: '性能基线', checked: false, detail: '首屏加载 < 2s, API P99 < 500ms' },
  { label: '监控告警', checked: false, detail: '配置 Sentry / 告警规则' },
  { label: '回滚方案', checked: false, detail: 'Vercel 一键回滚 / Git revert' },
  { label: 'CDN 配置', checked: false, detail: '静态资源 CDN 加速' },
];

function matchDomain(prompt: string): string {
  const lower = prompt.toLowerCase();
  if (['打卡', '签到', '习惯'].some(k => lower.includes(k))) return '打卡';
  if (['博客', 'blog', '文章', 'cms'].some(k => lower.includes(k))) return '博客';
  if (['电商', '商城', '购物', '订单'].some(k => lower.includes(k))) return '电商';
  return 'default';
}

export function generateArtifacts(prompt: string, outputs: string[]): EngineeringArtifacts {
  const domain = matchDomain(prompt);

  const architecture = ARCHITECTURE_TEMPLATES[domain] || DEFAULT_ARCHITECTURE;
  const dataModels = DATA_MODEL_TEMPLATES[domain] || DEFAULT_DATA_MODELS;
  const apiEndpoints = API_TEMPLATES[domain] || DEFAULT_API;

  const fileTree = [...DEFAULT_FILE_TREE];
  const deployChecklist = [...DEPLOY_CHECKLIST];

  const combinedOutput = outputs.join('\n');
  if (combinedOutput.includes('Redis')) {
    architecture.nodes.push({ id: 'cache', label: 'Redis', icon: '⚡', description: '缓存层', type: 'external' });
    architecture.edges.push({ from: 'service', to: 'cache', label: '缓存查询' });
  }

  if (combinedOutput.includes('S3') || combinedOutput.includes('OSS')) {
    architecture.nodes.push({ id: 'storage', label: '对象存储', icon: '☁️', description: '文件/图片存储', type: 'external' });
    architecture.edges.push({ from: 'gateway', to: 'storage' });
  }

  return { architecture, dataModels, apiEndpoints, fileTree, deployChecklist };
}

export function artifactsToMarkdown(artifacts: EngineeringArtifacts, prompt: string): string {
  let md = `# 工程产物报告\n\n`;
  md += `> 需求：${prompt}\n\n`;

  md += `## 一、系统架构\n\n`;
  md += `### 架构节点\n\n`;
  for (const node of artifacts.architecture.nodes) {
    md += `- **${node.label}** (${node.type}): ${node.description}\n`;
  }
  md += `\n### 调用关系\n\n`;
  for (const edge of artifacts.architecture.edges) {
    const from = artifacts.architecture.nodes.find(n => n.id === edge.from)?.label || edge.from;
    const to = artifacts.architecture.nodes.find(n => n.id === edge.to)?.label || edge.to;
    md += `- ${from} → ${to}${edge.label ? ` (${edge.label})` : ''}\n`;
  }

  md += `\n## 二、数据模型\n\n`;
  for (const table of artifacts.dataModels) {
    md += `### ${table.name} — ${table.description}\n\n`;
    md += `| 字段 | 类型 | 约束 | 说明 |\n|------|------|------|------|\n`;
    for (const f of table.fields) {
      md += `| ${f.name} | ${f.type} | ${f.constraint} | ${f.description} |\n`;
    }
    md += `\n`;
  }

  md += `## 三、API 接口\n\n`;
  md += `| 方法 | 路径 | 说明 |\n|------|------|------|\n`;
  for (const ep of artifacts.apiEndpoints) {
    md += `| ${ep.method} | ${ep.path} | ${ep.description} |\n`;
  }

  md += `\n## 四、文件结构\n\n\`\`\`\n`;
  function renderTree(nodes: FileTreeNode[], indent = ''): void {
    for (const node of nodes) {
      md += `${indent}${node.name}  # ${node.description}\n`;
      if (node.children) renderTree(node.children, indent + '  ');
    }
  }
  renderTree(artifacts.fileTree);
  md += `\`\`\`\n`;

  md += `\n## 五、部署 Checklist\n\n`;
  for (const item of artifacts.deployChecklist) {
    md += `- [${item.checked ? 'x' : ' '}] **${item.label}** — ${item.detail}\n`;
  }

  return md;
}

export function artifactsToScaffold(artifacts: EngineeringArtifacts, prompt: string): string {
  let scaffold = `# AgentForge 工程骨架\n# 自动生成于: ${new Date().toISOString()}\n# 需求: ${prompt}\n\n`;

  scaffold += `# === 数据库 Schema (Prisma) ===\n\n`;
  for (const table of artifacts.dataModels) {
    scaffold += `model ${table.name.replace(/s$/, '')} {\n`;
    for (const f of table.fields) {
      const prismaType = f.type.includes('UUID') ? 'String  @id @default(uuid())'
        : f.type.includes('VARCHAR') ? 'String'
        : f.type.includes('TEXT') ? 'String'
        : f.type.includes('INTEGER') ? 'Int     @default(0)'
        : f.type.includes('BOOLEAN') ? 'Boolean @default(false)'
        : f.type.includes('TIMESTAMPTZ') ? 'DateTime @default(now())'
        : f.type.includes('DECIMAL') ? 'Float'
        : 'String';
      scaffold += `  ${f.name} ${prismaType}\n`;
    }
    scaffold += `}\n\n`;
  }

  scaffold += `# === API Routes ===\n\n`;
  for (const ep of artifacts.apiEndpoints) {
    scaffold += `# ${ep.method} ${ep.path}\n`;
    scaffold += `# ${ep.description}\n`;
    if (ep.requestBody) scaffold += `# Request: ${ep.requestBody}\n`;
    if (ep.responseBody) scaffold += `# Response: ${ep.responseBody}\n`;
    scaffold += `\n`;
  }

  scaffold += `# === 目录结构 ===\n\n`;
  function renderScaffoldTree(nodes: FileTreeNode[], indent = ''): void {
    for (const node of nodes) {
      scaffold += `${indent}${node.name}\n`;
      if (node.children) renderScaffoldTree(node.children, indent + '  ');
    }
  }
  renderScaffoldTree(artifacts.fileTree);

  return scaffold;
}

export function artifactsToApiSpec(artifacts: EngineeringArtifacts): string {
  let spec = `openapi: "3.0.0"\ninfo:\n  title: AgentForge Generated API\n  version: "1.0.0"\npaths:\n`;
  for (const ep of artifacts.apiEndpoints) {
    const pathKey = ep.path.replace(/:(\w+)/g, '{$1}');
    spec += `  ${pathKey}:\n`;
    spec += `    ${ep.method.toLowerCase()}:\n`;
    spec += `      summary: "${ep.description}"\n`;
    if (ep.responseBody) {
      spec += `      responses:\n        200:\n          description: 成功\n`;
    }
  }
  return spec;
}
