# 系统架构

## 概览

AgentForge 是一个**记忆增强的多智能体工程工作台**（作品集级可部署原型）。  
核心闭环：规划 → 多角色执行 → 质量门禁 → 经验记忆 → 回放。

> 说明：当前 Multi-Agent 是「单模型 + 多角色 system prompt 的顺序流水线」，不是多进程分布式 agent 集群。

## 核心模块

### 1. Agent Runtime (`lib/agent-runtime/`)

- **Executor** (`executor.ts`) - 单角色执行 / SSE 流式
- **Planner** (`planner.ts`) - 任务规划与自适应
- **Memory Manager** (`memoryManager.ts`) - 记忆写入 / 向量召回 / 关键词回退
- **Output Validator** (`outputValidator.ts`) - 规则化质量门禁
- **Storage** (`storage.ts`) - 执行记录存储
- **Reliability** (`reliability.ts`) - 重试、熔断、超时

### 2. RAG / Embeddings (`lib/embeddings.ts` + SQL)

- 远程 embedding（OpenAI 兼容 / 智谱）
- 失败时确定性哈希向量回退
- Supabase `agent_memory.embedding vector(768)` + `match_memories` RPC

### 3. Observability (`lib/observability/`)

- **Tracer** - 执行追踪（进程内）
- **Logger** - 结构化日志
- **Metrics** - 指标收集（重启清空；演示级）

### 4. Frontend (App Router)

- Playground / Lab / Projects / Prompt Discovery 等页面
- SSE 消费 agent 步骤事件

## 数据库

| 表 | 用途 |
|----|------|
| `executions` | 执行主记录 |
| `execution_steps` | 步骤明细 |
| `agent_memory` | 经验记忆 + embedding |
| `memory_relations` | 记忆关联 |

迁移：`supabase/migrations/001_*` → `004_vector_search.sql`

## 数据流

```
User Prompt
    ↓
Domain Analyze + Memory Retrieve (vector → keyword fallback)
    ↓
Planner
    ↓
Agent Pipeline (SSE chunks)
    ↓
Quality Gate (retry if needed)
    ↓
Persist + Lesson Extract + Embedding Store
```

## 安全设计

- 密钥仅环境变量，无源码 fallback key
- API IP 限流（`lib/rate-limiter.ts`）
- Supabase RLS 策略（可继续按用户模型收紧）
- GitHub Proxy 支持 `GITHUB_TOKEN`
