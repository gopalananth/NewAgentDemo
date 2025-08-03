const { sequelize } = require('../config/database');
const os = require('os');
const { promisify } = require('util');

/**
 * Health Check Service
 * 
 * Provides comprehensive health monitoring for the application including:
 * - Database connectivity
 * - System metrics
 * - External service health
 * - Application-specific health checks
 */

class HealthService {
  constructor() {
    this.startTime = Date.now();
    this.healthChecks = new Map();
    this.initializeHealthChecks();
  }

  /**
   * Initialize all health check functions
   */
  initializeHealthChecks() {
    this.healthChecks.set('database', this.checkDatabase.bind(this));
    this.healthChecks.set('memory', this.checkMemory.bind(this));
    this.healthChecks.set('disk', this.checkDisk.bind(this));
    this.healthChecks.set('uptime', this.checkUptime.bind(this));
    // Add more health checks as needed
    // this.healthChecks.set('redis', this.checkRedis.bind(this));
    // this.healthChecks.set('external-api', this.checkExternalAPI.bind(this));
  }

  /**
   * Perform a quick health check (basic liveness probe)
   */
  async quickHealthCheck() {
    try {
      // Basic database ping
      await sequelize.authenticate();
      
      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        service: 'New Agent Demo Platform API',
        version: '1.0.0',
        uptime: this.getUptime()
      };
    } catch (error) {
      console.error('Quick health check failed:', error);
      return {
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        service: 'New Agent Demo Platform API',
        version: '1.0.0',
        error: error.message
      };
    }
  }

  /**
   * Perform comprehensive health check (detailed readiness probe)
   */
  async comprehensiveHealthCheck() {
    const results = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'New Agent Demo Platform API',
      version: '1.0.0',
      uptime: this.getUptime(),
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };

    // Run all health checks
    for (const [checkName, checkFunction] of this.healthChecks) {
      try {
        results.checks[checkName] = await checkFunction();
        results.summary.total++;

        if (results.checks[checkName].status === 'healthy') {
          results.summary.passed++;
        } else if (results.checks[checkName].status === 'warning') {
          results.summary.warnings++;
        } else {
          results.summary.failed++;
          results.status = 'unhealthy';
        }
      } catch (error) {
        results.checks[checkName] = {
          status: 'unhealthy',
          message: 'Health check failed',
          error: error.message,
          duration: 0
        };
        results.summary.total++;
        results.summary.failed++;
        results.status = 'unhealthy';
      }
    }

    return results;
  }

  /**
   * Check database connectivity and performance
   */
  async checkDatabase() {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await sequelize.authenticate();
      
      // Test query performance
      const queryStart = Date.now();
      await sequelize.query('SELECT 1 as test');
      const queryTime = Date.now() - queryStart;
      
      // Check connection pool
      const pool = sequelize.connectionManager.pool;
      const poolInfo = {
        size: pool.size,
        available: pool.available,
        using: pool.using,
        waiting: pool.waiting
      };

      const duration = Date.now() - startTime;
      const status = queryTime > 1000 ? 'warning' : 'healthy';
      
      return {
        status,
        message: 'Database connection is working',
        duration,
        details: {
          queryTime: `${queryTime}ms`,
          pool: poolInfo,
          dialect: sequelize.getDialect(),
          database: sequelize.getDatabaseName()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check memory usage
   */
  async checkMemory() {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      };

      // Convert bytes to MB
      const processMemoryMB = {
        rss: Math.round(memoryUsage.rss / 1024 / 1024),
        heapTotal: Math.round(memoryUsage.heapTotal / 1024 / 1024),
        heapUsed: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        external: Math.round(memoryUsage.external / 1024 / 1024)
      };

      const systemMemoryMB = {
        total: Math.round(systemMemory.total / 1024 / 1024),
        free: Math.round(systemMemory.free / 1024 / 1024),
        used: Math.round(systemMemory.used / 1024 / 1024)
      };

      // Determine status based on memory usage
      const heapUsagePercent = (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100;
      const systemUsagePercent = (systemMemory.used / systemMemory.total) * 100;
      
      let status = 'healthy';
      if (heapUsagePercent > 90 || systemUsagePercent > 90) {
        status = 'unhealthy';
      } else if (heapUsagePercent > 75 || systemUsagePercent > 75) {
        status = 'warning';
      }

      return {
        status,
        message: 'Memory usage within acceptable limits',
        duration: Date.now() - startTime,
        details: {
          process: processMemoryMB,
          system: systemMemoryMB,
          heapUsagePercent: `${heapUsagePercent.toFixed(2)}%`,
          systemUsagePercent: `${systemUsagePercent.toFixed(2)}%`
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Memory check failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check disk space (basic check)
   */
  async checkDisk() {
    const startTime = Date.now();
    
    try {
      // This is a basic implementation
      // In production, you might want to use a more robust disk space check
      const stats = await promisify(require('fs').stat)('./');
      
      return {
        status: 'healthy',
        message: 'Disk space check completed',
        duration: Date.now() - startTime,
        details: {
          accessible: true,
          // Add more detailed disk space information if needed
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Disk check failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Check application uptime
   */
  async checkUptime() {
    const startTime = Date.now();
    
    try {
      const uptime = this.getUptime();
      const systemUptime = os.uptime();
      
      return {
        status: 'healthy',
        message: 'Uptime information',
        duration: Date.now() - startTime,
        details: {
          application: uptime,
          system: `${Math.floor(systemUptime / 3600)}h ${Math.floor((systemUptime % 3600) / 60)}m`,
          startTime: new Date(this.startTime).toISOString(),
          loadAverage: os.loadavg()
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Uptime check failed',
        error: error.message,
        duration: Date.now() - startTime
      };
    }
  }

  /**
   * Get formatted uptime
   */
  getUptime() {
    const uptimeMs = Date.now() - this.startTime;
    const uptimeSeconds = Math.floor(uptimeMs / 1000);
    const hours = Math.floor(uptimeSeconds / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    
    return `${hours}h ${minutes}m ${seconds}s`;
  }

  /**
   * Add a custom health check
   */
  addHealthCheck(name, checkFunction) {
    this.healthChecks.set(name, checkFunction);
  }

  /**
   * Remove a health check
   */
  removeHealthCheck(name) {
    this.healthChecks.delete(name);
  }
}

// Export singleton instance
module.exports = new HealthService();