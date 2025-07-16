import fastifyPlugin from 'fastify-plugin';
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

// Extend FastifyRequest to include metrics
declare module 'fastify' {
  interface FastifyRequest {
    metrics?: {
      startTime: [number, number];
    };
  }
  
  interface FastifyInstance {
    metrics: {
      incrementTaskCount: () => void;
      incrementSubtaskCount: () => void;
    };
  }
}

interface MetricsData {
  requestCount: number;
  errorCount: number;
  startTime: number;
  taskCount: number;
  subtaskCount: number;
  responseTimes: number[];
  statusCodes: { [key: number]: number };
}

// Simple metrics collection for the application
export const metricsPlugin = fastifyPlugin(async (fastify: FastifyInstance) => {
  // Simple metrics store
  const metrics: MetricsData = {
    requestCount: 0,
    errorCount: 0,
    startTime: Date.now(),
    taskCount: 0,
    subtaskCount: 0,
    responseTimes: [],
    statusCodes: {},
  };

  // Add hooks to collect metrics
  fastify.addHook('onRequest', async (request: FastifyRequest) => {
    metrics.requestCount++;
    // Add startTime to request for later calculation
    request.metrics = { startTime: process.hrtime() };
  });

  fastify.addHook('onResponse', async (request: FastifyRequest, reply: FastifyReply) => {
    // Calculate response time
    if (request.metrics) {
      const hrtime = process.hrtime(request.metrics.startTime);
      const responseTimeMs = hrtime[0] * 1000 + hrtime[1] / 1000000;
      
      metrics.responseTimes.push(responseTimeMs);
      
      // Keep only the last 1000 response times to avoid memory issues
      if (metrics.responseTimes.length > 1000) {
        metrics.responseTimes.shift();
      }
    }

    // Track status codes
    const statusCode = reply.statusCode;
    metrics.statusCodes[statusCode] = (metrics.statusCodes[statusCode] || 0) + 1;
  });

  fastify.addHook('onError', async (_request: FastifyRequest, _reply: FastifyReply, _error: Error) => {
    metrics.errorCount++;
  });

  // Add a route to expose metrics
  fastify.get('/metrics', async () => {
    const totalResponseTimes = metrics.responseTimes.reduce((sum, time) => sum + time, 0);
    const avgResponseTime = metrics.responseTimes.length > 0
      ? totalResponseTimes / metrics.responseTimes.length
      : 0;
    
    // Calculate 95th percentile
    if (metrics.responseTimes.length > 0) {
      const sortedTimes = [...metrics.responseTimes].sort((a, b) => a - b);
      const idx95 = Math.floor(sortedTimes.length * 0.95);
      const percentile95 = sortedTimes[idx95];
      
      return {
        uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
        requestCount: metrics.requestCount,
        errorCount: metrics.errorCount,
        errorRate: metrics.requestCount > 0
          ? (metrics.errorCount / metrics.requestCount) * 100
          : 0,
        avgResponseTime: Math.round(avgResponseTime * 100) / 100,
        p95ResponseTime: Math.round(percentile95 * 100) / 100,
        taskCount: metrics.taskCount,
        subtaskCount: metrics.subtaskCount,
        statusCodes: metrics.statusCodes,
      };
    }
    
    return {
      uptime: Math.floor((Date.now() - metrics.startTime) / 1000),
      requestCount: metrics.requestCount,
      errorCount: metrics.errorCount,
      errorRate: metrics.requestCount > 0
        ? (metrics.errorCount / metrics.requestCount) * 100
        : 0,
      avgResponseTime: Math.round(avgResponseTime * 100) / 100,
      p95ResponseTime: 0,
      taskCount: metrics.taskCount,
      subtaskCount: metrics.subtaskCount,
      statusCodes: metrics.statusCodes,
    };
  });

  // Expose methods to update task and subtask counts
  fastify.decorate('metrics', {
    incrementTaskCount: () => {
      metrics.taskCount++;
    },
    incrementSubtaskCount: () => {
      metrics.subtaskCount++;
    },
  });
});