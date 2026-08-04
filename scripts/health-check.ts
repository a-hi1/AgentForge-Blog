#!/usr/bin/env node
/**
 * System Health Check Script
 * Validates all critical components of AgentForge OS
 */

type HealthStatus = 'healthy' | 'degraded' | 'down';

interface HealthCheckResult {
  status: HealthStatus;
  metrics: {
    [key: string]: number | string;
  };
  issues: string[];
}

const healthCheck = async (): Promise<HealthCheckResult> => {
  const result: HealthCheckResult = {
    status: 'healthy',
    metrics: {},
    issues: [],
  };

  console.log('🔍 Starting AgentForge OS Health Check...\n');

  // ==============================
  // 1. Runtime Health
  // ==============================
  console.log('📦 Checking Runtime Health...');
  
  try {
    const nodeVersion = process.version;
    result.metrics.nodeVersion = nodeVersion;
    console.log(`✓ Node.js: ${nodeVersion}`);
  } catch (e) {
    result.issues.push('Node.js runtime check failed');
    result.status = 'degraded';
  }

  // ==============================
  // 2. Environment Configuration
  // ==============================
  console.log('⚙️ Checking Environment Configuration...');
  
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'OPENAI_API_KEY',
  ];

  const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingEnvVars.length > 0) {
    result.issues.push(`Missing env vars: ${missingEnvVars.join(', ')}`);
    result.status = 'degraded';
    console.log(`✗ Missing: ${missingEnvVars.join(', ')}`);
  } else {
    console.log('✓ All required env vars present');
  }

  // ==============================
  // 3. Local module smoke checks
  // ==============================
  console.log('🧩 Checking local modules...');

  try {
    const { validateOutput } = await import('../lib/agent-runtime/outputValidator');
    const sample = validateOutput('# 标题\n\n- 列表\n\n```ts\nexport const ok = 1\n```\n中文说明');
    result.metrics.sampleQualityScore = sample.score;
    console.log(`✓ outputValidator sample score: ${sample.score}`);
  } catch (e) {
    result.issues.push(`outputValidator import/run failed: ${String(e)}`);
    result.status = 'degraded';
    console.log('✗ outputValidator check failed');
  }

  try {
    const { fallbackEmbedding, cosineSimilarity } = await import('../lib/embeddings');
    const a = fallbackEmbedding('博客系统登录');
    const b = fallbackEmbedding('用户认证与博客');
    const sim = cosineSimilarity(a, b);
    result.metrics.fallbackEmbeddingDim = a.length;
    result.metrics.sampleCosine = Number(sim.toFixed(4));
    console.log(`✓ embeddings fallback dim=${a.length} cosine=${sim.toFixed(4)}`);
  } catch (e) {
    result.issues.push(`embeddings check failed: ${String(e)}`);
    result.status = 'degraded';
    console.log('✗ embeddings check failed');
  }

  result.metrics.note = 'No synthetic latency numbers; run real Lighthouse / API probes in staging if needed.';

  // ==============================
  // 4. Summary
  // ==============================
  console.log('\n' + '='.repeat(50));
  console.log(`📊 System Status: ${result.status.toUpperCase()}`);
  
  if (result.issues.length > 0) {
    console.log('\n⚠️ Issues found:');
    result.issues.forEach(issue => console.log(`- ${issue}`));
  } else {
    console.log('\n✅ All checks passed!');
  }

  console.log('\n📈 Metrics:');
  Object.entries(result.metrics).forEach(([key, value]) => {
    console.log(`- ${key}: ${value}`);
  });

  console.log('\n');
  return result;
};

// Run health check
healthCheck().catch(console.error);
