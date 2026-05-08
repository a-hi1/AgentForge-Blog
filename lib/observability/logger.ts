/**
 * Unified Error Logger
 * Standardized error structure and logging
 */

type ErrorSeverity = 'debug' | 'info' | 'warning' | 'error' | 'critical';

export interface ErrorLog {
  errorId: string;
  message: string;
  stack?: string;
  context: Record<string, any>;
  timestamp: number;
  severity: ErrorSeverity;
  executionId?: string;
}

class ErrorLogger {
  private logs: Map<string, ErrorLog> = new Map();
  private readonly MAX_LOGS = 5000;

  private generateId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  public log(
    message: string,
    severity: ErrorSeverity = 'error',
    context: Record<string, any> = {},
    executionId?: string
  ): ErrorLog {
    const errorId = this.generateId();
    const now = Date.now();

    const errorLog: ErrorLog = {
      errorId,
      message,
      stack: new Error().stack,
      context: { ...context, timestamp: now },
      timestamp: now,
      severity,
      executionId
    };

    this.logs.set(errorId, errorLog);
    this.cleanupOldLogs();

    // Console output for debugging
    if (severity === 'error' || severity === 'critical') {
      console.error(`[${severity.toUpperCase()}]`, errorLog);
    } else if (severity === 'warning') {
      console.warn(`[${severity.toUpperCase()}]`, errorLog);
    } else {
      console.log(`[${severity.toUpperCase()}]`, errorLog);
    }

    return errorLog;
  }

  public debug(message: string, context?: Record<string, any>, executionId?: string): ErrorLog {
    return this.log(message, 'debug', context, executionId);
  }

  public info(message: string, context?: Record<string, any>, executionId?: string): ErrorLog {
    return this.log(message, 'info', context, executionId);
  }

  public warning(message: string, context?: Record<string, any>, executionId?: string): ErrorLog {
    return this.log(message, 'warning', context, executionId);
  }

  public error(message: string, context?: Record<string, any>, executionId?: string): ErrorLog {
    return this.log(message, 'error', context, executionId);
  }

  public critical(message: string, context?: Record<string, any>, executionId?: string): ErrorLog {
    return this.log(message, 'critical', context, executionId);
  }

  public getLogs(severity?: ErrorSeverity): ErrorLog[] {
    let logs = Array.from(this.logs.values()).sort((a, b) => b.timestamp - a.timestamp);
    
    if (severity) {
      logs = logs.filter(log => log.severity === severity);
    }
    
    return logs;
  }

  public getLogById(errorId: string): ErrorLog | undefined {
    return this.logs.get(errorId);
  }

  public getLogsByExecution(executionId: string): ErrorLog[] {
    return Array.from(this.logs.values())
      .filter(log => log.executionId === executionId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  public clearLogs(): void {
    this.logs.clear();
  }

  private cleanupOldLogs(): void {
    if (this.logs.size > this.MAX_LOGS) {
      const sortedLogs = Array.from(this.logs.entries())
        .sort(([, a], [, b]) => a.timestamp - b.timestamp);
      
      const toDelete = sortedLogs.slice(0, this.logs.size - this.MAX_LOGS);
      toDelete.forEach(([id]) => this.logs.delete(id));
    }
  }

  public getStats(): {
    total: number;
    bySeverity: Record<ErrorSeverity, number>;
    recent: number;
  } {
    const logs = Array.from(this.logs.values());
    const oneHourAgo = Date.now() - 3600000;
    
    const stats = {
      total: logs.length,
      bySeverity: {
        debug: 0,
        info: 0,
        warning: 0,
        error: 0,
        critical: 0
      },
      recent: logs.filter(log => log.timestamp > oneHourAgo).length
    };

    logs.forEach(log => {
      stats.bySeverity[log.severity]++;
    });

    return stats;
  }
}

export const errorLogger = new ErrorLogger();
