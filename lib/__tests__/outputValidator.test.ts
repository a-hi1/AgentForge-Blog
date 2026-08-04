import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validateOutput, buildRetryInstruction } from '../agent-runtime/outputValidator';

describe('validateOutput', () => {
  it('scores structured Chinese engineering output highly', () => {
    const output = `# 系统设计

## 架构
- 前端 Next.js
- 后端 API Routes

## 数据模型
\`\`\`ts
export interface User { id: string; name: string }
export function createUser() { return { id: '1', name: 'a' } }
\`\`\`

## 部署
- Vercel 一键部署
`;
    const r = validateOutput(output);
    assert.ok(r.score >= 60, `score=${r.score}`);
    assert.ok(r.chineseRatio > 0.2);
  });

  it('flags mostly-English low structure output', () => {
    const r = validateOutput('hello world this is only english without structure');
    assert.ok(r.chineseRatio < 0.5);
    assert.ok(r.issues.length > 0);
  });

  it('detects unclosed code fence', () => {
    const r = validateOutput('说明如下\n```ts\nconst a = 1\n');
    assert.ok(r.issues.some((i) => i.includes('围栏') || i.includes('代码')));
  });
});

describe('buildRetryInstruction', () => {
  it('includes issues list', () => {
    const text = buildRetryInstruction(['中文占比过低', '代码块括号不匹配']);
    assert.match(text, /中文占比过低/);
    assert.match(text, /代码块括号不匹配/);
  });
});
