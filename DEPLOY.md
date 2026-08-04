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

# 可选
# GITHUB_TOKEN=
# EMBEDDING_MODEL=   # DeepSeek 无 embedding 时可不填，将使用本地回退向量
```

> 若改用智谱：`OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`，`OPENAI_MODEL=glm-4-flash`，可选 `EMBEDDING_MODEL=embedding-2`。

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
