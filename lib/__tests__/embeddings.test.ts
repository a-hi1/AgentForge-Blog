/**
 * Pure unit tests for embedding utilities (no network).
 * Run: npm test
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  cosineSimilarity,
  fallbackEmbedding,
  normalizeDimensions,
  DEFAULT_EMBEDDING_DIM,
} from '../embeddings';

describe('fallbackEmbedding', () => {
  it('returns fixed dimension and unit-ish vector', () => {
    const v = fallbackEmbedding('设计一个博客系统 with auth', 32);
    assert.equal(v.length, 32);
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    assert.ok(Math.abs(norm - 1) < 1e-6 || norm === 0);
  });

  it('is deterministic', () => {
    const a = fallbackEmbedding('multi agent memory rag');
    const b = fallbackEmbedding('multi agent memory rag');
    assert.deepEqual(a, b);
  });

  it('gives higher similarity for related texts than unrelated', () => {
    const q = fallbackEmbedding('博客系统 用户登录 评论功能');
    const related = fallbackEmbedding('实现博客平台的登录与评论');
    const unrelated = fallbackEmbedding('股票量化交易策略回测');
    const simRel = cosineSimilarity(q, related);
    const simUnrel = cosineSimilarity(q, unrelated);
    assert.ok(simRel > simUnrel, `expected ${simRel} > ${simUnrel}`);
  });
});

describe('normalizeDimensions', () => {
  it('pads shorter vectors', () => {
    const v = normalizeDimensions([1, 0, 0], 5);
    assert.equal(v.length, 5);
  });

  it('reduces longer vectors', () => {
    const v = normalizeDimensions(new Array(16).fill(1), 4);
    assert.equal(v.length, 4);
  });
});

describe('cosineSimilarity', () => {
  it('returns 1 for identical unit vectors', () => {
    const a = [1, 0, 0];
    assert.equal(cosineSimilarity(a, a), 1);
  });

  it('returns 0 for orthogonal vectors', () => {
    assert.ok(Math.abs(cosineSimilarity([1, 0], [0, 1])) < 1e-9);
  });

  it('handles length mismatch', () => {
    assert.equal(cosineSimilarity([1], [1, 0]), 0);
  });
});

describe('DEFAULT_EMBEDDING_DIM', () => {
  it('is 768 for pgvector schema alignment', () => {
    assert.equal(DEFAULT_EMBEDDING_DIM, 768);
  });
});
