In the project directory run the following commands:

`npm install` to install all dependencies


`npm start` to start up the server. The server will be started on port 3001 by default.


Then make a GET request to the `/collect-data` endpoint with the following:


`curl http://localhost:3001/collect-data `


This will fetch data from an external endpoint and write it into a job-listings table in the database.


Note: This assumes you have a MySQL database instance set up at the regular port. You may adjust the credentials set up in `index.js` to match your own:


```
const pool = mysql.createPool({
    host: 'localhost',  // or the IP of your Docker host if running remotely
    user: 'root',
    password: 'my-secret-pw', // local db password
    database: 'project_database'
});
```

To run prometheus: `cd` into the `/prometheus` folder and run `prometheus --config.file=prometheus.yml` command

There are 2 suites of tests:
`npm run test-local` to run integration tests that will create a real test database instance and test against that
`npm test` to run tests that are run by Github Actions since Github Actions has no access to a db instance.