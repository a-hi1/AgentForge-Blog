/**
 * Offline quality eval harness for AgentForge outputValidator.
 * Uses fixed fixtures — no LLM calls, results are reproducible.
 *
 * Run: npm run eval
 * Output: eval-results/latest.json
 */

import fs from 'node:fs';
import path from 'node:path';
import { validateOutput } from '../lib/agent-runtime/outputValidator';

interface Fixture {
  id: string;
  description: string;
  expectMinScore?: number;
  expectMaxScore?: number;
  expectValid?: boolean;
  output: string;
}

const fixtures: Fixture[] = [
  {
    id: 'good-cn-architecture',
    description: '结构完整的中文架构方案',
    expectMinScore: 70,
    expectValid: true,
    output: `# 任务打卡系统设计

## 总体架构
本方案采用前后端一体的轻量架构，优先保证可演示与可部署。
- 客户端：Next.js 与 React 负责页面与交互
- 服务端：Next.js API Routes 处理业务接口
- 存储：PostgreSQL 保存用户与打卡记录

## 数据模型
核心实体包括用户、任务与打卡流水，字段保持最小可用。
\`\`\`ts
export interface CheckIn {
  id: string;
  userId: string;
  date: string;
  status: 'done' | 'missed';
}
export function createCheckIn(userId: string): CheckIn {
  return {
    id: crypto.randomUUID(),
    userId,
    date: new Date().toISOString(),
    status: 'done',
  };
}
\`\`\`

## API 设计
接口命名清晰，便于前端联调与后续扩展统计能力。
- POST /api/checkin 提交今日打卡
- GET /api/stats 查询连续天数与排行

## 部署清单
上线前按下列步骤检查，避免环境遗漏。
1. 配置数据库与模型相关环境变量
2. 执行数据库迁移脚本
3. 部署到 Vercel 并验证核心接口
`,
  },
  {
    id: 'english-only-thin',
    description: '纯英文且结构稀薄',
    expectMaxScore: 70,
    expectValid: false,
    output: 'just some english text without headings or code blocks about building apps',
  },
  {
    id: 'broken-fence',
    description: '代码围栏未闭合',
    expectValid: false,
    output: `# 说明

下面是代码：
\`\`\`ts
const x = 1
`,
  },
  {
    id: 'import-only-code',
    description: '代码块只有 import',
    expectValid: false,
    expectMaxScore: 90,
    output: `# 模块说明

当前片段缺少实现，不应通过质量门禁。

\`\`\`ts
import React from 'react'
import { useState } from 'react'
\`\`\`
`,
  },
];

function main() {
  const results = fixtures.map((f) => {
    const r = validateOutput(f.output);
    const checks: string[] = [];
    let pass = true;

    if (f.expectMinScore != null && r.score < f.expectMinScore) {
      pass = false;
      checks.push(`score ${r.score} < min ${f.expectMinScore}`);
    }
    if (f.expectMaxScore != null && r.score > f.expectMaxScore) {
      pass = false;
      checks.push(`score ${r.score} > max ${f.expectMaxScore}`);
    }
    if (f.expectValid != null && r.isValid !== f.expectValid) {
      pass = false;
      checks.push(`isValid=${r.isValid} expected ${f.expectValid}`);
    }

    return {
      id: f.id,
      description: f.description,
      pass,
      score: r.score,
      chineseRatio: Number(r.chineseRatio.toFixed(3)),
      issues: r.issues,
      checks,
    };
  });

  const summary = {
    generatedAt: new Date().toISOString(),
    total: results.length,
    passed: results.filter((x) => x.pass).length,
    failed: results.filter((x) => !x.pass).length,
    averageScore: Number(
      (results.reduce((s, x) => s + x.score, 0) / results.length).toFixed(1)
    ),
    results,
  };

  const outDir = path.join(process.cwd(), 'eval-results');
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, 'latest.json');
  fs.writeFileSync(outFile, JSON.stringify(summary, null, 2), 'utf-8');

  console.log('AgentForge Offline Eval');
  console.log('=======================');
  for (const r of results) {
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.id}  score=${r.score}  cn=${r.chineseRatio}`);
    if (!r.pass) console.log('       ', r.checks.join('; '));
  }
  console.log('-----------------------');
  console.log(`passed ${summary.passed}/${summary.total}  avgScore=${summary.averageScore}`);
  console.log(`wrote ${outFile}`);

  if (summary.failed > 0) process.exitCode = 1;
}

main();
