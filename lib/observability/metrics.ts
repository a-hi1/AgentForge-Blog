/**
 * Metrics Collector
 * Real-time system metrics and analytics
 */

import { ExecutionTrace } from './tracer';

export interface SystemMetrics {
  totalExecutions: number;
  successRate: number;
  failureRate: number;
  avgLatency: number;
  memoryUsageFrequency: number;
  totalTokens: number;
  avgSteps: number;
  memoryInfluencedRate: number;
}

class MetricsCollector {
  private executions: number = 0;
  private successful: number = 0;
  private failed: number = 0;
  private latencies: number[] = [];
  private totalTokens: number = 0;
  private memoryInfluencedCount: number = 0;
  private totalSteps: number = 0;

  private readonly MAX_LATENCY_SAMPLES = 100;

  public recordExecution(trace: ExecutionTrace): void {
    this.executions++;
    if (trace.status === 'completed') {
      this.successful++;
    } else if (trace.status === 'failed') {
      this.failed++;
    }

    if (trace.duration > 0) {
      this.latencies.push(trace.duration);
      if (this.latencies.length > this.MAX_LATENCY_SAMPLES) {
        this.latencies.shift();
      }
    }

    this.totalTokens += trace.tokenUsage;
    this.totalSteps += trace.steps.length;

    if (trace.memoryInfluenced) {
      this.memoryInfluencedCount++;
    }
  }

  public getMetrics(): SystemMetrics {
    const total = this.executions || 1; // Prevent division by zero
    
    const successRate = this.executions > 0
      ? (this.successful / total) * 100
      : 100;

    const failureRate = this.executions > 0
      ? (this.failed / total) * 100
      : 0;

    const avgLatency = this.latencies.length > 0
      ? this.latencies.reduce((sum, lat) => sum + lat, 0) / this.latencies.length
      : 0;

    const memoryUsageFrequency = this.executions > 0
      ? (this.memoryInfluencedCount / total) * 100
      : 0;

    const avgSteps = this.executions > 0
      ? this.totalSteps / total
      : 0;

    return {
      totalExecutions: this.executions,
      successRate,
      failureRate,
      avgLatency,
      memoryUsageFrequency,
      totalTokens: this.totalTokens,
      avgSteps,
      memoryInfluencedRate: memoryUsageFrequency
    };
  }

  public reset(): void {
    this.executions = 0;
    this.successful = 0;
    this.failed = 0;
    this.latencies = [];
    this.totalTokens = 0;
    this.memoryInfluencedCount = 0;
    this.totalSteps = 0;
  }
}

export const metricsCollector = new MetricsCollector();
