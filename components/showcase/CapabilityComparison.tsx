'use client';

import { useState, memo } from 'react';

const OLD_OUTPUT = `# Architecture Design

## Overview
I recommend using a microservice architecture with high availability and scalability.

## Key Components
- User Service: Handle user authentication and authorization
- Blog Service: Manage blog posts and content
- API Gateway: Route requests to appropriate services
- Database: Use PostgreSQL for persistent storage

## Recommendations
- Consider using Redis for caching to improve performance
- Implement proper error handling
- Add logging and monitoring
- Follow best practices for security

## Conclusion
This architecture is scalable, maintainable, and follows industry standards.`;

const NEW_OUTPUT = `# 一、业务目标分析

基于用户需求「开发博客平台」，核心目标是构建一个面向内容创作者的博客发布系统。关键用户角色包括：
- **作者**：撰写、编辑、发布文章，管理个人专栏
- **读者**：浏览、搜索、收藏、评论文章
- **管理员**：内容审核、用户管理、数据统计

# 二、核心功能拆解

## 2.1 文章管理模块
- 富文本编辑器（支持 Markdown）
- 文章草稿自动保存（每 30 秒触发一次）
- 版本历史记录（保留最近 20 个版本）
- 定时发布功能

## 2.2 标签与分类系统
- 标签 CRUD，支持标签云统计
- 多级分类树（最多 3 层）
- 标签关联推荐

## 2.3 SEO 优化模块
- 自动生成 meta description（截取正文前 160 字符）
- URL 语义化（/posts/{slug} 格式）
- sitemap.xml 自动生成
- Open Graph 标签注入

## 2.4 评论系统
- 嵌套评论（最多 3 层）
- 评论审核队列
- 敏感词过滤（基于词库匹配）

# 三、数据模型设计

\`\`\`sql
-- 文章主表
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt VARCHAR(500),
  cover_image VARCHAR(500),
  status VARCHAR(20) DEFAULT 'draft',
  author_id UUID REFERENCES users(id),
  category_id UUID REFERENCES categories(id),
  view_count INTEGER DEFAULT 0,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 标签表
CREATE TABLE tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(50) UNIQUE NOT NULL,
  slug VARCHAR(50) UNIQUE NOT NULL,
  post_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 文章-标签关联表
CREATE TABLE post_tags (
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, tag_id)
);
\`\`\`

索引策略：
- \`posts.slug\` 唯一索引（URL 查询）
- \`posts.author_id + status\` 复合索引（作者文章列表）
- \`posts.published_at\` 降序索引（首页时间线）

# 四、关键实现难点

1. **草稿冲突处理**：多端同时编辑时，采用最后写入胜出策略，配合版本号乐观锁
2. **SEO 预渲染**：服务端渲染首屏内容，客户端接管交互
3. **评论防刷**：同一用户 10 秒内仅可提交 1 条评论
4. **图片上传**：接入 OSS 存储，生成 CDN 链接，限制单文件 5MB`;

interface CapabilityComparisonProps {
  className?: string;
}

function CapabilityComparison({ className }: CapabilityComparisonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <section className={`mb-12 ${className || ''}`}>
      <div className="text-center mb-6">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-[rgba(16,185,129,0.08)] border border-[rgba(16,185,129,0.25)] text-[#10B981] text-sm font-medium hover:bg-[rgba(16,185,129,0.12)] transition-all"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
          {isOpen ? '收起对比' : '对比旧版输出 — 验证升级效果'}
          <svg className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>

      {isOpen && (
        <div className="grid md:grid-cols-2 gap-4">
          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-[rgba(239,68,68,0.08)] border-b border-[rgba(239,68,68,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
                  <span className="text-[#EF4444] text-xs font-semibold tracking-wider">旧版输出</span>
                </div>
                <span className="text-[#71717A] text-[10px]">模板化 · 英文 · 空洞建议</span>
              </div>
            </div>
            <div className="p-5">
              <pre className="text-[#A1A1AA] text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {OLD_OUTPUT}
              </pre>
              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#EF4444] text-[10px]">中文率</span>
                    <span className="text-[#EF4444] text-xs font-bold">12%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#F59E0B] text-[10px]">结构分</span>
                    <span className="text-[#F59E0B] text-xs font-bold">35/100</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#EF4444] text-[10px]">场景贴合</span>
                    <span className="text-[#EF4444] text-xs font-bold">20/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card rounded-xl overflow-hidden">
            <div className="px-5 py-3 bg-[rgba(16,185,129,0.08)] border-b border-[rgba(16,185,129,0.15)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]" />
                  <span className="text-[#10B981] text-xs font-semibold tracking-wider">新版输出</span>
                </div>
                <span className="text-[#71717A] text-[10px]">工程化 · 中文 · 具体方案</span>
              </div>
            </div>
            <div className="p-5 max-h-[600px] overflow-y-auto">
              <pre className="text-[#E4E4E7] text-xs font-mono whitespace-pre-wrap leading-relaxed">
                {NEW_OUTPUT}
              </pre>
              <div className="mt-4 pt-3 border-t border-[rgba(255,255,255,0.05)]">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#10B981] text-[10px]">中文率</span>
                    <span className="text-[#10B981] text-xs font-bold">92%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#3B82F6] text-[10px]">结构分</span>
                    <span className="text-[#3B82F6] text-xs font-bold">95/100</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#10B981] text-[10px]">场景贴合</span>
                    <span className="text-[#10B981] text-xs font-bold">88/100</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

export default memo(CapabilityComparison);
