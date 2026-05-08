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
OPENAI_API_KEY=your_key
OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4
OPENAI_MODEL=glm-4-flash
NEXT_PUBLIC_SUPABASE_URL=your_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_key
SUPABASE_SERVICE_ROLE_KEY=your_key
```

### 4. 部署

点击 Deploy 按钮即可。

---

## 本地部署验证

```bash
# 清理
rm -rf .next node_modules

# 重新安装
npm install

# 构建测试
npm run build
```

确保 `npm run build` 成功后再推送到仓库。
