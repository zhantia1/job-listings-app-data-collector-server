require('dotenv').config();
const request = require('supertest');
const { app, promisePool }  = require('../../src/index');
const mysql = require('mysql2/promise');

const env = process.env.ENVIRONMENT;

if (env === "test-local") {
    describe('Database Integration Test', () => {
  
      let testPool;
    
      beforeAll(async () => {
        server = app.listen(3004); // start the server on a different port for testing
    
        testPool = await mysql.createPool({
          host: 'localhost',
          user: 'root',
          password: `${process.env.DB_PASSWORD}`,
          database: 'test_database',
        });  
    
        await testPool.query(`
          CREATE TABLE IF NOT EXISTS processed_jobs (
            id VARCHAR(255) PRIMARY KEY NOT NULL,
            jobTitle VARCHAR(255),
            companyName VARCHAR(255),
            location VARCHAR(255),
            description TEXT,
            url VARCHAR(255) NOT NULL,
            date DATETIME
          ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
        `);
    
        // insert some test data into the mock SQL server
        await testPool.query(`
          INSERT INTO processed_jobs (id, jobTitle, companyName, location, description, url, date)
          VALUES 
              ('1', 'Software Engineer', 'ABC Company', 'New York', 'Description for job 1', 'https://example.com/job1', '2024-04-30 08:00:00'),
              ('2', 'Data Analyst', 'XYZ Inc', 'Los Angeles', 'Description for job 2', 'https://example.com/job2', '2024-04-30 09:00:00'),
              ('3', 'Product Manager', 'Acme Corp', 'San Francisco', 'Description for job 3', 'https://example.com/job3', '2024-04-30 10:00:00');
        `);
      });
    
      afterAll(async () => {
        await new Promise(resolve => server.close(resolve)); // close the server
    
        await testPool.query('TRUNCATE TABLE processed_jobs');
    
        // Close the pool to release all connections
        await testPool.end();
        await promisePool.end()
      });
    
      it("should have the expected results", async () => {
    
        // the expected result for the mocked SQL query
        const expectedResult = [
          {
              id: '1',
              jobTitle: 'Software Engineer',
              companyName: 'ABC Company',
              location: 'New York',
              description: 'Description for job 1',
              url: 'https://example.com/job1',
              date: new Date('2024-04-30T08:00:00')
          },
          {
              id: '2',
              jobTitle: 'Data Analyst',
              companyName: 'XYZ Inc',
              location: 'Los Angeles',
              description: 'Description for job 2',
              url: 'https://example.com/job2',
              date: new Date('2024-04-30T09:00:00'),
          },
          {
              id: '3',
              jobTitle: 'Product Manager',
              companyName: 'Acme Corp',
              location: 'San Francisco',
              description: 'Description for job 3',
              url: 'https://example.com/job3',
              date: new Date('2024-04-30T10:00:00')
          }
        ];
    
        const response = await request(app).get('/api/jobs')
        expect(response.status).toBe(200);
    
        const retrievedJobs = response.body.jobs.map(job => {
          return {
            ...job,
            date: new Date(job.date),
          }
        })
        expect(retrievedJobs).toEqual(expectedResult);
      })
    })
}

describe("test file must contain one test", () => {
    it("should return true", () => {
        expect(true).toEqual(true);
    })
})