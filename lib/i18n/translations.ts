/**
 * AgentForge 智能工程系统 - 统一术语翻译映射
 * Chinese-first AI Engineering Platform Terminology
 */

export interface Translation {
  // System Names
  "AgentForge OS": string;
  "AgentForge": string;

  // Core Concepts
  Agent: string;
  Execution: string;
  Memory: string;
  Lab: string;
  Showcase: string;
  Playground: string;
  Planner: string;
  Runtime: string;
  Observability: string;

  // Navigation
  Home: string;
  Projects: string;
  Articles: string;
  About: string;

  // Hero Section
  "I build production-ready software with AI agents.": string;
  "Explore Projects": string;
  "View Experiments": string;
  "Try Agent Demo": string;

  // Scenario Library
  "Optimize Performance": string;
  "Debug System": string;
  "Build SaaS App": string;
  "Refactor Code": string;
  "Architecture Design": string;

  // Statuses
  Running: string;
  Completed: string;
  Failed: string;
  Planning: string;

  // Lab Panel Titles
  "Execution List": string;
  "Memory Panel": string;
  Analytics: string;
  Replay: string;

  // Metrics
  "Success Rate": string;
  "Avg Duration": string;
  "Memory Influence": string;
  "Total Executions": string;
  "Failure Rate": string;
  "Avg Latency": string;
  "Memory Usage": string;

  // Placeholders & Inputs
  "Enter your prompt": string;
  "Build a SaaS blog system": string;
  "Please enter your requirements": string;

  // Error Messages
  "Error ID": string;
  "Error Message": string;
  "Context": string;
  "Time": string;

  // Demo Runner
  "Launch Demo": string;
  "Live System Demo": string;
  "Why This Happened": string;
  "System Architecture": string;
  "Click nodes to explore details": string;

  // Cards & Buttons
  "View Details": string;
  "Start Execution": string;
  "Export Report": string;
  "Export Execution Report": string;
}

export const cn: Translation = {
  // System Names
  "AgentForge OS": "AgentForge 智能工程系统",
  "AgentForge": "AgentForge",

  // Core Concepts
  Agent: "智能代理",
  Execution: "执行记录",
  Memory: "记忆系统",
  Lab: "实验室",
  Showcase: "能力展示中心",
  Playground: "交互式实验区",
  Planner: "任务规划器",
  Runtime: "执行引擎",
  Observability: "可观测系统",

  // Navigation
  Home: "首页",
  Projects: "项目中心",
  Articles: "技术文章",
  About: "关于系统",

  // Hero Section
  "I build production-ready software with AI agents.": "我使用 AI 智能代理构建生产级工程系统",
  "Explore Projects": "查看项目",
  "View Experiments": "查看实验",
  "Try Agent Demo": "体验智能代理",

  // Scenario Library
  "Optimize Performance": "性能优化",
  "Debug System": "系统调试",
  "Build SaaS App": "构建 SaaS 应用",
  "Refactor Code": "代码重构",
  "Architecture Design": "架构设计",

  // Statuses
  Running: "执行中",
  Completed: "已完成",
  Failed: "执行失败",
  Planning: "正在规划",

  // Lab Panel Titles
  "Execution List": "执行记录列表",
  "Memory Panel": "记忆分析面板",
  Analytics: "数据分析",
  Replay: "执行回放",

  // Metrics
  "Success Rate": "成功率",
  "Avg Duration": "平均耗时",
  "Memory Influence": "记忆影响率",
  "Total Executions": "总执行次数",
  "Failure Rate": "失败率",
  "Avg Latency": "平均延迟",
  "Memory Usage": "记忆使用率",

  // Placeholders & Inputs
  "Enter your prompt": "请输入你的需求描述",
  "Build a SaaS blog system": "构建一个 SaaS 博客系统",
  "Please enter your requirements": "请输入你的需求描述",

  // Error Messages
  "Error ID": "错误ID",
  "Error Message": "错误信息",
  "Context": "上下文",
  "Time": "时间",

  // Demo Runner
  "Launch Demo": "启动演示",
  "Live System Demo": "系统实时演示",
  "Why This Happened": "为什么这样执行",
  "System Architecture": "系统架构",
  "Click nodes to explore details": "点击节点探索详情",

  // Cards & Buttons
  "View Details": "查看详情",
  "Start Execution": "开始执行",
  "Export Report": "导出报告",
  "Export Execution Report": "导出执行报告",
};

export function t(key: keyof Translation): string {
  return cn[key] || key;
}
