require('dotenv').config();
const express = require('express');
const axios = require('axios');
const mysql = require('mysql2');
const url = require('url');

const env = process.env.ENVIRONMENT || "dev";

// DATABASE CODE ---------------------------------------------------------

let pool = undefined;
if (env === "prod") {
    const dbUrl = url.parse(process.env.DATABASE_URL);

    pool = mysql.createPool({
        host: dbUrl.hostname,
        user: dbUrl.auth.split(':')[0],
        password: dbUrl.auth.split(':')[1],
        database: dbUrl.pathname.substring(1)
    });
} else if (env !== "test") {
    pool = mysql.createPool({
        host: 'localhost',
        user: 'root',
        password: `${process.env.DB_PASSWORD}`,
        database: 'project_database'
    });
}


// Promisify for Node.js async/await.
let promisePool = undefined;
if (env !== "test") {
    promisePool = pool.promise();
}


async function initializeDatabase() {
    const createJobOneTableSql = `
        CREATE TABLE IF NOT EXISTS job_listings (
            id INT PRIMARY KEY NOT NULL,
            url VARCHAR(255) NOT NULL,
            jobSlug VARCHAR(255) NOT NULL,
            jobTitle VARCHAR(255) NOT NULL,
            companyName VARCHAR(255) NOT NULL,
            companyLogo VARCHAR(255) NOT NULL,
            jobIndustry TEXT NOT NULL,
            jobType TEXT NOT NULL,
            jobGeo VARCHAR(100) NOT NULL,
            jobLevel VARCHAR(100) NOT NULL,
            jobExcerpt TEXT NOT NULL,
            jobDescription TEXT NOT NULL,
            pubDate DATETIME NOT NULL,
            is_processed TINYINT(1) NOT NULL DEFAULT 0
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;

    const createJobTwoTableSql = `
        CREATE TABLE IF NOT EXISTS job_listings_two (
            id VARCHAR(255) PRIMARY KEY NOT NULL,
            title VARCHAR(255) NOT NULL,
            description TEXT,
            company_name VARCHAR(255),
            category_label VARCHAR(255),
            category_tag VARCHAR(255),
            location_display_name VARCHAR(255),
            location_area TEXT,
            redirect_url TEXT,
            salary_min DECIMAL(10, 2),
            salary_max DECIMAL(10, 2),
            salary_is_predicted TINYINT(1),
            latitude DECIMAL(10, 8),
            longitude DECIMAL(11, 8),
            created DATETIME,
            adref TEXT,
            is_processed TINYINT(1) NOT NULL DEFAULT 0
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
`;

    const createProcessedTableSql = `
        CREATE TABLE IF NOT EXISTS processed_jobs (
            id VARCHAR(255) PRIMARY KEY NOT NULL,
            jobTitle VARCHAR(255),
            companyName VARCHAR(255),
            location VARCHAR(100),
            description TEXT,
            url VARCHAR(255) NOT NULL,
            date DATETIME
        ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
    `;

    try {
        await promisePool.execute(createJobOneTableSql);
        console.log('The job_listings table was created or already exists.');

        await promisePool.execute(createJobTwoTableSql);
        console.log('The job_listings_two table was created or already exists.');

        await promisePool.execute(createProcessedTableSql);
        console.log('The processed_jobs table was created or already exists.');
    } catch (error) {
        console.error('Failed to initialize the database:', error);
        throw error;
    }
}

// ENDPOINT ONE ---------------------------------------------------------

// fetches 50 most recent remote job postings
const JOB_ENDPOINT_ONE = "https://jobicy.com/api/v2/remote-jobs?count=50";

async function insertJobDataOne(jobData) {
    const sql = `
        INSERT INTO job_listings (id, url, jobSlug, jobTitle, companyName, companyLogo, jobIndustry, jobType, jobGeo, jobLevel, jobExcerpt, jobDescription, pubDate) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        url = VALUES(url),
        jobSlug = VALUES(jobSlug),
        jobTitle = VALUES(jobTitle),
        companyName = VALUES(companyName),
        companyLogo = VALUES(companyLogo),
        jobIndustry = VALUES(jobIndustry),
        jobType = VALUES(jobType),
        jobGeo = VALUES(jobGeo),
        jobLevel = VALUES(jobLevel),
        jobExcerpt = VALUES(jobExcerpt),
        jobDescription = VALUES(jobDescription),
        pubDate = VALUES(pubDate);
    `;

    const values = [
        jobData.id,
        jobData.url,
        jobData.jobSlug,
        jobData.jobTitle,
        jobData.companyName,
        jobData.companyLogo,
        JSON.stringify(jobData.jobIndustry), // assuming this is an array
        JSON.stringify(jobData.jobType), // assuming this is an array
        jobData.jobGeo,
        jobData.jobLevel,
        jobData.jobExcerpt,
        jobData.jobDescription,
        jobData.pubDate
    ];

    await promisePool.execute(sql, values);
}

const processEndpointOne = async () => {
    const { data } = await axios.get(JOB_ENDPOINT_ONE);
    if (data && data.jobs) {
        for (const job of data.jobs) {
            await insertJobDataOne(job);
        }
    }
}

// ENDPOINT TWO ---------------------------------------------------------

const APP_ID = process.env.APP_ID;
const APP_KEY = process.env.APP_KEY;

const JOB_ENDPOINT_TWO = `https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${APP_ID}&app_key=${APP_KEY}&results_per_page=50&what=remote&sort_by=date`;

function convertDateString(inputDateStr) {
    // Create a new Date object using the input string
    const date = new Date(inputDateStr);

    // Format the date as "YYYY-MM-DD HH:MM:SS"
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); // Months are zero-indexed, add 1 to get the correct month
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');

    // Concatenate the formatted components into the final string
    const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

    return formattedDate;
}

async function insertJobDataTwo(job) {
    const sql = `
        INSERT INTO job_listings_two (id, title, description, company_name, category_label, category_tag, location_display_name, location_area, redirect_url, salary_min, salary_max, salary_is_predicted, latitude, longitude, created, adref)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
        title = VALUES(title),
        description = VALUES(description),
        company_name = VALUES(company_name),
        category_label = VALUES(category_label),
        category_tag = VALUES(category_tag),
        location_display_name = VALUES(location_display_name),
        location_area = VALUES(location_area),
        redirect_url = VALUES(redirect_url),
        salary_min = VALUES(salary_min),
        salary_max = VALUES(salary_max),
        salary_is_predicted = VALUES(salary_is_predicted),
        latitude = VALUES(latitude),
        longitude = VALUES(longitude),
        created = VALUES(created),
        adref = VALUES(adref);
    `;
    const values = [
        job.id,
        job.title,
        job.description,
        job.company.display_name,
        job.category.label,
        job.category.tag,
        job.location.display_name,
        JSON.stringify(job.location.area),
        job.redirect_url,
        job.salary_min,
        job.salary_max,
        job.salary_is_predicted,
        job.latitude,
        job.longitude,
        convertDateString(job.created),
        job.adref
    ].map(v => v === undefined ? null : v);
    await promisePool.execute(sql, values);
}

// fetch the most recent 10 pages sorted by posting date
const processEndpointTwo = async () => {
    for (let page = 1; page <= 10; page++) {
        const url = `https://api.adzuna.com/v1/api/jobs/us/search/${page}?app_id=${process.env.APP_ID}&app_key=${process.env.APP_KEY}&results_per_page=50&what=remote&sort_by=date`;
        const response = await axios.get(url);
            const jobs = response.data.results;
            if (jobs && jobs.length > 0) {
                for (const job of jobs) {
                    await insertJobDataTwo(job);
                }
            } else {
                break;
            }
    }
}

// SERVER CODE ---------------------------------------------------------

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware to parse JSON bodies
app.use(express.json());

// Route to collect data
app.get('/collect-data', async (req, res) => {
    try {
        await processEndpointOne();
        await processEndpointTwo();

        res.status(200).json({ message: 'Data collected and saved successfully' });
    } catch (error) {
        console.error('Error collecting data:', error);
        res.status(500).json({ message: 'Failed to collect data', error: error.message });
    }
});

app.get('/health-check', (req, res) => {
    res.status(200).json({ status: 'OK' });
});

if (env !== "test") {
    initializeDatabase().then(() => {
        app.listen(PORT, () => {
            console.log(`Data-Collector-Server running on http://localhost:${PORT}`);
        });
    }).catch(error => {
        console.error('Server startup failed:', error);
    });
}

module.exports = {
    app,
};