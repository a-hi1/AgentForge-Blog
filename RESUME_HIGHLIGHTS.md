# AgentForge · 简历亮点与面试话术（对齐真实代码）

> 项目仓库：https://github.com/a-hi1/AgentForge-Blog  
> 在线演示：https://agent-forge-blog-mocha.vercel.app  
> 作者：匡宸伟 · 面向 AI Agent / RAG / 全栈实习

本文档只写**代码里能指着讲的能力**，避免虚高指标。面试时优先用「路径 + 取舍 + 边界」。

---

## 一句话介绍（30 秒）

> AgentForge 是我独立完成的 **记忆增强多智能体工程工作台**。用户输入工程需求后，系统会做领域识别与任务规划，按 Architect → Coding → Debug/Deploy 角色流水线执行，过程中用 **Supabase + pgvector** 做经验记忆召回，并用规则化质量门禁决定是否重试；前端用 Next.js 14 SSE 流式展示步骤，已部署到 Vercel。

---

## STAR 项目描述（简历可直接改写）

### 版本 A · AI Agent 实习

**S/T**  
通用 LLM 对话缺工程结构：无角色分工、无历史经验复用、输出质量不稳、过程不可观测。  
目标：做出可演示、可深挖的 Multi-Agent Runtime。

**A**
1. 设计 **契约化 Agent Runtime**（`lib/agent-runtime/`）：Planner 规划 → 多角色顺序执行 → `outputValidator` 质量校验 → 不达标重试。
2. 实现 **记忆增强检索**：执行完成后抽取 lessons，写入 `agent_memory`；新任务用 embedding + `match_memories` RPC 语义召回，失败时回退关键词/标签匹配（`memoryManager.ts` + `embeddings.ts` + `004_vector_search.sql`）。
3. 用 **SSE 流式 API**（`/api/agent`）推送 step_start / chunk / quality_score / memory_influence 事件；接入 IP 级限流。
4. 补齐工程化：密钥不落库、CI（typecheck/test/eval/build）、离线质量评测集。

**R（诚实口径）**
- 形成「规划 → 执行 → 校验 → 记忆」闭环，可在 Vercel 公开展示。
- 质量门禁与评测脚本可复现（`npm run eval`），避免拍脑袋指标。
- 单人 1 周完成核心闭环，后续迭代补齐向量检索与工程卫生。

> ⚠️ 不要再写「记忆命中 87% / 质量 92.4 / 1200+ 次」这类无法从代码审计的数字。  
> 可写：「离线评测集 N 条 fixture 全通过」「支持向量检索 + 关键词双通路回退」。

### 版本 B · RAG / 记忆检索实习

**S/T**  
Agent 每次从零推理，历史成功/失败经验无法复用。

**A**
- Schema：`agent_memory.embedding vector(768)` + IVFFlat + `match_memories` 余弦检索。
- 写入路径：prompt → embedding → insert；读取路径：query embedding → RPC → topK。
- 降级策略：embedding API 失败 → 本地确定性哈希向量；RPC 失败 → 客户端余弦 / 关键词。

**R**
- 检索链路具备 **主路径 + 多级 fallback**，本地无 Supabase 也能演示规划执行；有 Supabase 时可讲清向量召回。

### 版本 C · 全栈实习

**S/T**  
要把 Agent 能力做成产品而不是脚本。

**A**  
Next.js App Router 全栈；Tailwind 深色玻璃态 UI；多个业务页（playground / lab / projects / prompt discovery）；API Routes + SSE；Supabase 持久化；Vercel 部署。

**R**  
独立完成方案→开发→验证→部署闭环，仓库具备 README / 架构说明 / CI。

---

## 面试高频深挖 · 标准答法

### 1. 你的 Multi-Agent 是真多代理还是 prompt 角色扮演？
**答**：当前是 **单模型 + 多角色 system prompt 的顺序流水线**，不是多进程多模型并行。价值在「任务分解、上下文隔离、分阶段产物」，而不是分布式 agent 集群。若继续做，会加 tool-calling 与并行分支（研究/编码分离）。

### 2. 记忆检索怎么做的？和 Naive RAG 区别？
**答**：存的是 **执行经验（lessons/tags/summary）** 而不是切块文档。写入时抽成功/失败/优化点；召回后注入 planner/executor 上下文。有向量主路径，也有关键词回退——这是工程上的可靠性设计。

### 3. 质量分怎么算？会不会太主观？
**答**：`outputValidator` 是 **可解释规则分**：中文占比、代码围栏完整性、标题/列表结构、import-only 残缺检测等。不是 LLM-as-judge。好处是稳定、零成本、可单测；坏处是语义贴合度有限。所以另有 `npm run eval` 固定 fixture 做回归。

### 4. 流式怎么实现的？
**答**：Route Handler 返回 `text/event-stream`，`executeAgentStreaming` 边读模型 delta 边 `controller.enqueue`。前端按 event type 更新步骤 UI。

### 5. 限流为什么是内存版？
**答**：演示/单实例足够；多实例应换 Redis/Upstash。我能说清 trade-off：实现成本 vs 全局一致性。

### 6. 安全上做过什么？
**答**：移除硬编码 API Key；密钥仅 env；GitHub proxy 支持 `GITHUB_TOKEN`；API 限流；RLS 迁移（仍可继续收紧 anon 策略）。

---

## 简历技能关键词（可勾选）

`Multi-Agent 编排` · `Prompt / 结构化输出` · `RAG / pgvector` · `SSE 流式` · `Next.js 14` · `TypeScript` · `Supabase` · `质量门禁` · `限流` · `CI` · `Vercel`

---

## 演示路径（面试投屏 3 分钟）

1. 打开 Demo → Playground / 智能执行  
2. 输入：「设计一个带签到统计的任务打卡系统」  
3. 指给面试官看：领域识别 → 记忆召回提示 → 分步流式输出 → 质量分  
4. 打开 GitHub：`lib/agent-runtime/`、`lib/embeddings.ts`、`supabase/migrations/004_vector_search.sql`、`.github/workflows/ci.yml`  
5. 本地补一句：`npm test && npm run eval`

---

## 投递时建议替换的旧表述

| 旧（风险） | 新（可辩护） |
|---|---|
| 记忆命中约 87% | 向量召回 + 关键词双通路；可演示记忆注入上下文 |
| 质量均值 92.4/100 | 五维/规则化质量门禁 + 不达标重试；离线评测可复现 |
| 支撑 1200+ 次任务 | 独立完成可部署闭环；执行记录可落库回放 |
| 生产级 OS | 面向工程场景的 Agent Runtime 原型 / 作品级平台 |

---

## 本地命令速查

```bash
npm install
cp .env.example .env.local   # 填入 OPENAI_API_KEY 等
npm run dev
npm test
npm run eval
npm run typecheck
npm run build
```

Supabase：在 SQL Editor 执行 `supabase/migrations/` 下 001→004。
