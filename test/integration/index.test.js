const request = require('supertest');
const { app }  = require('../../src/index');

describe('Server Integration Test', () => {
  let server;

  beforeAll(() => {
    server = app.listen(3004); // Start the server on a different port for testing
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve)); // Close the server
  });

  it('responds with 200 status', async () => {
    const response = await request(server).get('/health-check');
    expect(response.status).toBe(200);
  });
});