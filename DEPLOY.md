# 部署指南

## 部署到 Vercel

### 1. 准备仓库

确保仓库已经推送到 GitHub。

### 2. 导入到 Vercel

1. 访问 https://vercel.com/new
2. 导入你的 AgentForge 仓库
3. 配置项目设置

### 3. 配置环境变量

在 Vercel Dashboard → Project → Settings → Environment Variables 中添加：

```env
# DeepSeek（当前默认）
OPENAI_API_KEY=你的_DeepSeek_API_Key
OPENAI_BASE_URL=https://api.deepseek.com/v1
OPENAI_MODEL=deepseek-chat

# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key

# MaxKB 内置向量（推荐，可选）
# 先在 MaxKB 中启用本地 embedding 模型，填入模型 UUID
MAXKB_MODEL_ID=
MAXKB_EMBEDDING_URL=http://127.0.0.1:11636/admin/api

# 其他可选
# GITHUB_TOKEN=
# EMBEDDING_MODEL=   # OpenAI 兼容 embedding 模型名
```

> MaxKB 本地向量服务启动：在 MaxKB 目录运行 `python main.py dev local_model`。默认模型为 `shibing624/text2vec-base-chinese`，通常输出 768 维，适配 AgentForge 的 `vector(768)` schema。AgentForge 调用 `/admin/api/model/{MAXKB_MODEL_ID}/embed_query` 与批量 `embed_documents`。Vercel 不能访问你电脑的 `127.0.0.1`；线上部署必须把 `MAXKB_EMBEDDING_URL` 配成 Vercel 可访问的 HTTPS MaxKB 服务地址，否则留空 `MAXKB_MODEL_ID` 使用其他 embedding / 哈希回退。
>
> 若改用智谱：`OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`，`OPENAI_MODEL=glm-4-flash`，可选 `EMBEDDING_MODEL=embedding-2`。DeepSeek 对话 API 没有稳定 embedding 端点，未配置 MaxKB 时会使用本地哈希回退。

### 4. 部署

点击 Deploy 按钮即可。部署后如 Demo 仍走旧环境变量，在 Vercel 里改完需 **Redeploy**。

---

## 本地部署验证

```bash
npm install
cp .env.example .env.local
# 填入 DeepSeek Key 与 Supabase
npm run build
npm run dev
```

确保 `npm run build` 成功后再推送到仓库。
