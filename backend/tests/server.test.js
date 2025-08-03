const request = require('supertest');
const app = require('../server');

describe('Server Tests', () => {
  test('GET /api/health should return 200', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.body).toEqual({ status: 'OK', message: 'Server is running' });
  });

  test('Server should handle 404 for non-existent routes', async () => {
    const response = await request(app)
      .get('/api/non-existent')
      .expect(404);
  });

  test('CORS should be enabled', async () => {
    const response = await request(app)
      .get('/api/health')
      .expect(200);
    
    expect(response.headers).toHaveProperty('access-control-allow-origin');
  });
});

// Clean up after tests
afterAll(() => {
  if (app && app.close) {
    app.close();
  }
});