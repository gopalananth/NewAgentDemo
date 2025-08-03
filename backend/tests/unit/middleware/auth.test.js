const { ensureAuthenticated, ensureAdmin, ensureDemoUser, auditLog } = require('../../../middleware/auth');
const { User, AuditLog } = require('../../../models');

describe('Authentication Middleware', () => {
  describe('ensureAuthenticated', () => {
    it('should call next() when user is authenticated', () => {
      const req = testHelpers.createMockRequest(global.testData.adminUser);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureAuthenticated(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not authenticated', () => {
      const req = testHelpers.createMockRequest(null);
      req.isAuthenticated = jest.fn(() => false);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required. Please log in.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 401 when isAuthenticated method is not available', () => {
      const req = testHelpers.createMockRequest(null);
      delete req.isAuthenticated;
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureAuthenticated(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ensureAdmin', () => {
    it('should call next() when user is Administrator', () => {
      const req = testHelpers.createMockRequest(global.testData.adminUser);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureAdmin(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not present', () => {
      const req = testHelpers.createMockRequest(null);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.'
      });
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when user is not Administrator', () => {
      const req = testHelpers.createMockRequest(global.testData.demoUser);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureAdmin(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Administrator access required.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('ensureDemoUser', () => {
    it('should call next() when user is Demo User', () => {
      const req = testHelpers.createMockRequest(global.testData.demoUser);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureDemoUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should call next() when user is Administrator (has Demo User access)', () => {
      const req = testHelpers.createMockRequest(global.testData.adminUser);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureDemoUser(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 401 when user is not present', () => {
      const req = testHelpers.createMockRequest(null);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      ensureDemoUser(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: 'Authentication required.'
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('auditLog', () => {
    beforeEach(async () => {
      // Clear existing audit logs
      await AuditLog.destroy({ where: {} });
    });

    it('should create audit log entry and call next()', async () => {
      const req = testHelpers.createMockRequest(
        global.testData.adminUser,
        { name: 'New Domain' },
        { id: 'test-id' }
      );
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      const auditMiddleware = auditLog('CREATE', 'Domain');
      await auditMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();

      // Verify audit log was created
      const logs = await AuditLog.findAll();
      expect(logs).toHaveLength(1);
      expect(logs[0].action).toBe('CREATE');
      expect(logs[0].entity_type).toBe('Domain');
      expect(logs[0].user_id).toBe(global.testData.adminUser.id);
      expect(logs[0].ip_address).toBe('127.0.0.1');
      expect(logs[0].user_agent).toBe('test-user-agent');
    });

    it('should handle audit log creation errors gracefully', async () => {
      // Mock AuditLog.create to throw an error
      const originalCreate = AuditLog.create;
      AuditLog.create = jest.fn().mockRejectedValue(new Error('Database error'));

      const req = testHelpers.createMockRequest(global.testData.adminUser);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      const auditMiddleware = auditLog('CREATE', 'Domain');
      await auditMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(AuditLog.create).toHaveBeenCalled();

      // Restore original method
      AuditLog.create = originalCreate;
    });

    it('should skip audit log when user is not present', async () => {
      const req = testHelpers.createMockRequest(null);
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      const auditMiddleware = auditLog('CREATE', 'Domain');
      await auditMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();

      // Verify no audit log was created
      const logs = await AuditLog.findAll();
      expect(logs).toHaveLength(0);
    });

    it('should include entity_id when provided in params', async () => {
      const entityId = 'test-entity-id';
      const req = testHelpers.createMockRequest(
        global.testData.adminUser,
        {},
        { id: entityId }
      );
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      const auditMiddleware = auditLog('UPDATE', 'Domain');
      await auditMiddleware(req, res, next);

      const logs = await AuditLog.findAll();
      expect(logs[0].entity_id).toBe(entityId);
    });

    it('should capture old values for UPDATE and DELETE actions', async () => {
      const req = testHelpers.createMockRequest(
        global.testData.adminUser,
        { name: 'Updated Domain' },
        { id: global.testData.domain.id }
      );
      const res = testHelpers.createMockResponse();
      const next = testHelpers.createMockNext();

      const auditMiddleware = auditLog('UPDATE', 'Domain');
      await auditMiddleware(req, res, next);

      const logs = await AuditLog.findAll();
      expect(logs[0].old_values).toBeDefined();
      expect(logs[0].new_values).toEqual(req.body);
    });
  });
});