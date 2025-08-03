const request = require('supertest');
const app = require('../../server');

describe('Health Check Endpoints', () => {
  describe('GET /health', () => {
    it('should return basic health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/healthy|unhealthy/),
        timestamp: expect.any(String),
        service: 'New Agent Demo Platform API',
        version: '1.0.0',
        uptime: expect.any(String)
      });

      // Verify timestamp is valid ISO string
      expect(() => new Date(response.body.timestamp)).not.toThrow();
    });

    it('should return 503 if database is unhealthy', async () => {
      // Mock database failure by closing the connection temporarily
      const { sequelize } = require('../../config/database');
      await sequelize.close();

      const response = await request(app)
        .get('/health')
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.error).toBeDefined();

      // Reconnect for other tests
      await sequelize.authenticate();
    });
  });

  describe('GET /health/detailed', () => {
    it('should return comprehensive health status', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect('Content-Type', /json/)
        .expect(200);

      expect(response.body).toMatchObject({
        status: expect.stringMatching(/healthy|unhealthy/),
        timestamp: expect.any(String),
        service: 'New Agent Demo Platform API',
        version: '1.0.0',
        uptime: expect.any(String),
        checks: expect.any(Object),
        summary: {
          total: expect.any(Number),
          passed: expect.any(Number),
          failed: expect.any(Number),
          warnings: expect.any(Number)
        }
      });

      // Verify all expected health checks are present
      const expectedChecks = ['database', 'memory', 'disk', 'uptime'];
      expectedChecks.forEach(checkName => {
        expect(response.body.checks[checkName]).toBeDefined();
        expect(response.body.checks[checkName]).toMatchObject({
          status: expect.stringMatching(/healthy|warning|unhealthy/),
          message: expect.any(String),
          duration: expect.any(Number)
        });
      });

      // Verify summary calculations
      const { checks, summary } = response.body;
      const checkResults = Object.values(checks);
      
      expect(summary.total).toBe(checkResults.length);
      expect(summary.passed).toBe(checkResults.filter(c => c.status === 'healthy').length);
      expect(summary.warnings).toBe(checkResults.filter(c => c.status === 'warning').length);
      expect(summary.failed).toBe(checkResults.filter(c => c.status === 'unhealthy').length);
    });

    it('should include database connection details', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const dbCheck = response.body.checks.database;
      expect(dbCheck.details).toMatchObject({
        queryTime: expect.stringMatching(/\d+ms/),
        pool: expect.any(Object),
        dialect: expect.any(String),
        database: expect.any(String)
      });

      expect(dbCheck.details.pool).toMatchObject({
        size: expect.any(Number),
        available: expect.any(Number),
        using: expect.any(Number),
        waiting: expect.any(Number)
      });
    });

    it('should include memory usage details', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const memoryCheck = response.body.checks.memory;
      expect(memoryCheck.details).toMatchObject({
        process: {
          rss: expect.any(Number),
          heapTotal: expect.any(Number),
          heapUsed: expect.any(Number),
          external: expect.any(Number)
        },
        system: {
          total: expect.any(Number),
          free: expect.any(Number),
          used: expect.any(Number)
        },
        heapUsagePercent: expect.stringMatching(/\d+\.\d+%/),
        systemUsagePercent: expect.stringMatching(/\d+\.\d+%/)
      });
    });

    it('should include uptime details', async () => {
      const response = await request(app)
        .get('/health/detailed')
        .expect(200);

      const uptimeCheck = response.body.checks.uptime;
      expect(uptimeCheck.details).toMatchObject({
        application: expect.stringMatching(/\d+h \d+m \d+s/),
        system: expect.stringMatching(/\d+h \d+m/),
        startTime: expect.any(String),
        loadAverage: expect.any(Array)
      });

      // Verify startTime is valid ISO string
      expect(() => new Date(uptimeCheck.details.startTime)).not.toThrow();
      
      // Verify load average has 3 values (1, 5, 15 minute averages)
      expect(uptimeCheck.details.loadAverage).toHaveLength(3);
      uptimeCheck.details.loadAverage.forEach(avg => {
        expect(typeof avg).toBe('number');
      });
    });

    it('should return 503 when any check fails', async () => {
      // Simulate a health check failure by mocking the database connection
      const healthService = require('../../services/healthService');
      const originalCheckDatabase = healthService.checkDatabase;
      
      healthService.checkDatabase = jest.fn().mockResolvedValue({
        status: 'unhealthy',
        message: 'Database connection failed',
        error: 'Connection timeout',
        duration: 5000
      });

      const response = await request(app)
        .get('/health/detailed')
        .expect('Content-Type', /json/)
        .expect(503);

      expect(response.body.status).toBe('unhealthy');
      expect(response.body.summary.failed).toBeGreaterThan(0);

      // Restore original method
      healthService.checkDatabase = originalCheckDatabase;
    });
  });

  describe('GET /metrics', () => {
    it('should return Prometheus-style metrics', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect('Content-Type', /text\/plain/)
        .expect(200);

      const metrics = response.text;

      // Verify basic metric structure
      expect(metrics).toContain('# HELP app_health_status');
      expect(metrics).toContain('# TYPE app_health_status gauge');
      expect(metrics).toContain('app_health_status{service="new-agent-demo"}');

      expect(metrics).toContain('# HELP app_uptime_seconds');
      expect(metrics).toContain('# TYPE app_uptime_seconds counter');
      expect(metrics).toContain('app_uptime_seconds{service="new-agent-demo"}');

      // Verify individual check metrics
      const expectedChecks = ['database', 'memory', 'disk', 'uptime'];
      expectedChecks.forEach(checkName => {
        expect(metrics).toContain(`# HELP app_check_${checkName}_status`);
        expect(metrics).toContain(`# TYPE app_check_${checkName}_status gauge`);
        expect(metrics).toContain(`app_check_${checkName}_status{service="new-agent-demo"}`);
        
        expect(metrics).toContain(`# HELP app_check_${checkName}_duration_ms`);
        expect(metrics).toContain(`# TYPE app_check_${checkName}_duration_ms gauge`);
        expect(metrics).toContain(`app_check_${checkName}_duration_ms{service="new-agent-demo"}`);
      });
    });

    it('should return valid metric values', async () => {
      const response = await request(app)
        .get('/metrics')
        .expect(200);

      const metrics = response.text;
      const lines = metrics.split('\n');
      
      // Extract metric values (lines that don't start with # and aren't empty)
      const metricLines = lines.filter(line => 
        line.trim() && !line.startsWith('#')
      );

      metricLines.forEach(line => {
        // Each metric line should follow format: metric_name{labels} value
        const match = line.match(/^(.+)\{(.+)\}\s+(\d+(?:\.\d+)?)$/);
        expect(match).not.toBeNull();
        
        const [, metricName, labels, value] = match;
        expect(metricName).toBeTruthy();
        expect(labels).toContain('service="new-agent-demo"');
        expect(parseFloat(value)).not.toBeNaN();
      });
    });

    it('should reflect unhealthy status in metrics', async () => {
      // Mock an unhealthy health check
      const healthService = require('../../services/healthService');
      const originalCheckDatabase = healthService.checkDatabase;
      
      healthService.checkDatabase = jest.fn().mockResolvedValue({
        status: 'unhealthy',
        message: 'Database connection failed',
        duration: 1000
      });

      const response = await request(app)
        .get('/metrics')
        .expect(200);

      const metrics = response.text;
      
      // Overall health should be 0 (unhealthy)
      expect(metrics).toContain('app_health_status{service="new-agent-demo"} 0');
      
      // Database check should be 0 (unhealthy)
      expect(metrics).toContain('app_check_database_status{service="new-agent-demo"} 0');
      
      // Database duration should be included
      expect(metrics).toContain('app_check_database_duration_ms{service="new-agent-demo"} 1000');

      // Restore original method
      healthService.checkDatabase = originalCheckDatabase;
    });
  });
});