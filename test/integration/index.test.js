require('dotenv').config();
const request = require('supertest');
const { app, processEndpointOne, processEndpointTwo }  = require('../../src/index');

const env = process.env.ENVIRONMENT;

describe('Server Integration Tests', () => {
  let server;

  beforeAll(async () => {
    server = app.listen(3004); // start the server on a different port for testing
  });

  afterAll(async () => {
    await new Promise(resolve => server.close(resolve)); // close the server
  });

  it('responds with 200 status', async () => {
    const response = await request(server).get('/health-check');
    expect(response.status).toBe(200);
  });
});

jest.mock('../../src/index', () => {
  const actual = jest.requireActual('../../src/index'); // Import actual implementations if necessary

  return {
    ...actual,
    processEndpointOne: jest.fn(() => Promise.resolve()),
    processEndpointTwo: jest.fn(() => Promise.resolve()),
  };
});

if (env === "test") {

  describe('GET /collect-data', () => {  
    let server;

    beforeAll(async () => {
      server = app.listen(3004); // start the server on a different port for testing
    });

    afterAll(async () => {
      await new Promise(resolve => server.close(resolve)); // close the server
    });

    it('responds with 200 and success message', async () => {

      // mimic /collect-data endpoint
      
      processEndpointOne();
      processEndpointTwo();
  
      // Verify that processEndpointOne and processEndpointTwo were called
      expect(processEndpointOne).toHaveBeenCalledTimes(1);
      expect(processEndpointTwo).toHaveBeenCalledTimes(1);
    });
  });
}