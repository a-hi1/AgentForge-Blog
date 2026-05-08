# AgentForge 智能工程系统



基于 AI Agent Runtime + Memory + Observability 的生产级智能工程平台

## 🎯 产品定位

AgentForge 是一个完整的智能工程系统，它让你能够：

- 🤖 多智能代理协作构建软件
- 🧠 从历史执行中学习优化
- 📊 实时监控系统行为
- 🔄 完整的执行回放功能

## 🚀 核心能力

- **多 Agent 协作** - Architect、Coding、Debug、Deploy 多智能代理流水线
- **自适应规划** - 基于历史经验动态调整执行计划
- **记忆增强** - 上下文相关经验检索，经验复用
- **执行回放** - 完整的步骤级回放和调试
- **可观测性** - 执行追踪、日志系统、指标面板

## 🏗️ 架构

```
┌──────────────────────────────────────────────────────────────────┐
│                        Web Frontend                              │
│  (Home / Showcase / Lab / Playground / Interview)              │
└────────────────────────────────┬─────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Next.js App Router                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
   ┌────▼────┐       ┌─────▼──────┐     ┌────▼─────┐
   │  Agent  │       │   Memory   │     │         │
   │ Runtime  │       │  System    │     │Observ-   │
   └────┬────┘       └─────┬───────┘     │  ability  │
        │                    │               │           │
   ┌────▼────┐       ┌─────▼──────┐     │           │
   │Planner  │       │Relevance  │     │           │
   │         │       │Retrieval │     │           │
   └────┬────┘       └─────┬───────┘     │           │
        │                    │               │           │
        └────────────────────┼────────────────────┘
                             │
                    ┌────────▼────────┐
                    │  Supabase  │
                    │ PostgreSQL  │
                    └────────┬──────┘
                             │
                    ┌────────▼────────┐
                    │  Memory    │
                    │  Relations │
                    └──────────────┘
```

## 🚀 快速开始

### 前置要求

- Node.js 18+
- npm 9+
- Supabase 账户

### 1. 安装

```bash
# Clone 克隆仓库
git clone <repo-url>
cd agentforge

# 安装依赖
npm install
```

### 2. 配置环境变量

```bash
# 复制示例配置
cp .env.local.example .env.local
```

编辑 `.env.local`：

```env
# OpenAI Compatible API (智谱)
OPENAI_API_KEY=your_zhipu_api_key_here
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4-flash

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### 3. 初始化 Supabase

在 Supabase 中运行 `supabase/migrations/` 目录下的 SQL 迁移文件。

### 4. 启动开发服务器

```bash
npm run dev
```

访问 http://localhost:3000 查看系统。

## 📁 主要展示路径

| 路径 | 描述 |
|------|------|
| `/showcase | 能力展示中心 |
| `/interview` | 系统介绍引导 |
| `/lab` | 实验室 (执行记录查看) |
| `/playground` | 智能交互 (实时演示) |
| `/` | 首页 |

## 🚀 部署到 Vercel

详见 DEPLOY.md 文档。

## 📂 项目结构

```
AgentForge/
├── app/              # Next.js App Router 页面
├── components/       # React 组件
├── lib/             # 核心库
│   ├── agent-runtime/ # Agent 运行时
│   ├── observability/ # 可观测性系统
│   ├── demo/        # 展示功能
│   ├── i18n/        # 国际化
│   └── supabase/    # Supabase 客户端
├── supabase/       # 数据库迁移
├── scripts/         # 工具脚本
└── data/            # 数据
```

## 🔧 技术栈

- **框架**: Next.js 14
- **语言**: TypeScript
- **UI**: Tailwind CSS + Glassmorphism
- **数据库**: Supabase PostgreSQL
- **AI**: OpenAI Compatible (Zhipu AI / 智谱)
- **部署**: Vercel

## 📊 健康检查

运行健康检查脚本:

```bash
node scripts/health-check.ts
```

## 📝 License

MIT

---

**Built with 🤖 + 🧠 by AgentForge Team
