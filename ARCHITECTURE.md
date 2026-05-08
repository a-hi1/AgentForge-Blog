# 系统架构

## 概览

AgentForge 是一个生产级的智能工程平台，由以下核心组件组成：

## 核心模块

### 1. Agent Runtime (`lib/agent-runtime/`)

- **Executor** (`executor.ts`) - 单个 Agent 执行
- **Planner** (`planner.ts`) - 任务规划与自适应
- **Memory Manager** (`memoryManager.ts`) - 记忆管理
- **Storage** (`storage.ts`) - 执行记录存储
- **Reliability** (`reliability.ts`) - 重试、熔断、超时

### 2. Observability (`lib/observability/`)

- **Tracer** - 执行追踪
- **Logger** - 结构化日志
- **Metrics** - 系统指标收集

### 3. Frontend

- **Showcase** - 演示页面
- **Lab** - 执行记录查看
- **Playground** - 实时交互
- **Interview** - 引导式介绍

## 数据库架构

### Supabase 表结构

- `executions` - 执行记录
- `execution_steps` - 执行步骤
- `agent_memory` - 记忆存储
- `memory_relations` - 记忆关系

## 数据流

```
User Prompt
    ↓
Memory Retrieval
    ↓
Adaptive Planning
    ↓
Agent Pipeline Execution
    ↓
Step-by-Step Output
    ↓
Memory Storage
```

## 安全设计

- RLS (Row Level Security) 策略
- Service Role 与 Anon Role 分离
- Rate Limiting
