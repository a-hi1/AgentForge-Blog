# AgentForge · 记忆增强多智能体工程工作台

[![CI](https://github.com/a-hi1/AgentForge-Blog/actions/workflows/ci.yml/badge.svg)](https://github.com/a-hi1/AgentForge-Blog/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Demo](https://img.shields.io/badge/Demo-Vercel-black)](https://agent-forge-blog-mocha.vercel.app)

> **一句话**：把工程需求变成「可规划、可执行、可校验、可记忆、可回放」的 Multi-Agent 流水线。  
> 适合作为 **AI Agent / RAG / 全栈实习** 作品集核心项目。

**Demo**：https://agent-forge-blog-mocha.vercel.app  
**简历话术**：见 [`RESUME_HIGHLIGHTS.md`](./RESUME_HIGHLIGHTS.md)

---

## 解决什么问题

| 痛点 | AgentForge 做法 |
|------|----------------|
| 一次对话从头编，无工程结构 | Planner + 多角色流水线（Architect / Coding / Debug / Deploy） |
| 历史经验无法复用 | Supabase `agent_memory` + **pgvector 语义召回** + 关键词回退 |
| 模型输出质量不稳 | 规则化质量门禁 + 不达标自动重试 |
| 过程是黑盒 | SSE 流式步骤、执行记录、回放与对比面板 |
| 密钥与滥用风险 | 环境变量注入、API 限流、无硬编码密钥 |

---

## 架构（与代码目录对齐）

```text
User Prompt
   │
   ▼
Domain Analyzer ──► Planner（可注入记忆）
   │
   ▼
Memory Retrieve（pgvector match_memories → keyword fallback）
   │
   ▼
Agent Pipeline（SSE 流式输出每步 delta）
   │
   ▼
Quality Gate（outputValidator）── fail ──► Retry with fix instruction
   │
   ▼
Persist Execution + Extract Lessons + Store Embedding
```

| 模块 | 路径 | 职责 |
|------|------|------|
| Agent Runtime | `lib/agent-runtime/` | 规划、执行、校验、记忆、产物 |
| Embeddings / RAG | `lib/embeddings.ts` + `supabase/migrations/004_vector_search.sql` | 向量生成与检索 RPC |
| Prompt 编排 | `lib/prompt-orchestrator/` | 意图拆解、方案导出 |
| Idea Discovery | `lib/idea-discovery/` | 方向探索状态机 |
| Observability | `lib/observability/` | 进程内日志 / 指标 / 追踪 |
| API | `app/api/*` | agent SSE、prompt 生成、GitHub 代理等 |

---

## 技术栈

- **前端 / 全栈**：Next.js 14 App Router · React 18 · TypeScript · Tailwind
- **AI**：OpenAI 兼容 API（默认 DeepSeek，可换智谱等）· SSE Streaming
- **数据**：Supabase PostgreSQL · **pgvector**
- **工程化**：ESLint-free 精简配置 · `tsc` · Node test runner · GitHub Actions CI · Vercel

---

## 快速开始

```bash
git clone https://github.com/a-hi1/AgentForge-Blog.git
cd AgentForge-Blog
npm install
cp .env.example .env.local
```

编辑 `.env.local`：

```env
# DeepSeek（推荐默认）
OPENAI_API_KEY=你的_DeepSeek_Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# 也可换成智谱等 OpenAI 兼容接口：
# OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
# OPENAI_MODEL=glm-4-flash
# EMBEDDING_MODEL=embedding-2

NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
# 可选：提高 GitHub API 限额
GITHUB_TOKEN=
```

在 Supabase SQL Editor **按序执行** `supabase/migrations/001_*.sql` → `004_vector_search.sql`。

```bash
npm run dev          # http://localhost:3000
npm test             # 单元测试（embeddings / 质量门禁 / 限流）
npm run eval         # 离线质量评测，输出 eval-results/latest.json
npm run typecheck
npm run build
```

---

## 仓库规模（可核实，非运营注水指标）

| 项 | 说明 |
|----|------|
| 语言 | TypeScript 为主 |
| 核心运行时 | `lib/agent-runtime/*` |
| API | `/api/agent`（SSE）、`/api/prompt-generate`、`/api/idea-discovery`、`/api/github-proxy`、`/api/executions` |
| 数据迁移 | 4 个 SQL（含 pgvector） |
| 质量 | 规则门禁 + `npm run eval` fixture |
| CI | `.github/workflows/ci.yml` |

> 运营类数字（总执行次数、命中率百分比等）以你自己的 Supabase 统计为准，README 不再写不可审计的展示值。

---

## 安全说明

- **禁止**把 API Key 写进源码；缺失密钥时接口应失败而不是静默用默认 key。
- `.env` / `.env.local` 已在 `.gitignore`。
- 若历史 commit 曾误提交密钥，请在对应云平台 **立即轮换**。

---

## 路线图（诚实版）

- [x] Multi-Agent 顺序流水线 + SSE
- [x] 质量门禁与重试
- [x] 记忆存储 + pgvector schema / RPC
- [x] GitHub 仓库导入与分析
- [x] CI + 单测 + 离线评测
- [ ] Tool-calling / 并行 agent 分支
- [ ] 分布式限流（Redis）与多租户鉴权
- [ ] LLM-as-judge 与规则分融合

---

## 作品集使用

- 简历 STAR 与面试问答：[`RESUME_HIGHLIGHTS.md`](./RESUME_HIGHLIGHTS.md)
- 架构摘要：[`ARCHITECTURE.md`](./ARCHITECTURE.md)
- 部署：[`DEPLOY.md`](./DEPLOY.md)

---

## License

MIT © 2026 匡宸伟
