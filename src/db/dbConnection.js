require("dotenv").config();
const { Client: PGClient } = require("pg");
const mysql = require("mysql2/promise");
const fs = require('fs');

const DB_MODE = process.env.DB_MODE || "POSTGRES";
const DB_HOST_PG = process.env.DB_HOST_PG;
const DB_HOST_MYSQL = process.env.DB_HOST;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASS;
const DB_NAME = process.env.DB_NAME;

let client;

/**
 * Initialise un client selon le mode de base de données
 */
async function initClient() {
  if (client) return client;

  if (DB_MODE.toUpperCase() === "POSTGRES") {
    client = new PGClient({
      connectionString: DB_HOST_PG,
      ssl: { 
        rejectUnauthorized: false,
        ca: `-----BEGIN CERTIFICATE-----
MIIEUDCCArigAwIBAgIUcb/Z+lwbFI8WsDSNBG7DMo/H2xEwDQYJKoZIhvcNAQEM
BQAwQDE+MDwGA1UEAww1YzM5ZmUzMTctODY2Yi00MDhiLWJiZDYtNDdiZmYwNTFm
NGJlIEdFTiAxIFByb2plY3QgQ0EwHhcNMjUxMTEwMTc1OTUyWhcNMzUxMTA4MTc1
OTUyWjBAMT4wPAYDVQQDDDVjMzlmZTMxNy04NjZiLTQwOGItYmJkNi00N2JmZjA1
MWY0YmUgR0VOIDEgUHJvamVjdCBDQTCCAaIwDQYJKoZIhvcNAQEBBQADggGPADCC
AYoCggGBALpeWO5tt12rqVGvzLSSrMNgwy7Z6NFxRbPZEXa6CCtAQ7yZlX4XRzc4
L+8gNEEu0cxPePbhx9LqPIaqX1Xf7USy5vhWISmOXBbenXg2l7UqFY3tj2b/JABp
riAhRQxvuXfPfwoY5pBGDj1BTkorIwyl9Km9pSJ/bTgh8IpYwoQFfO0XpoRuq0CQ
0gPdQBDio/ULhMGn0W+QbBAZ++xuPLLnRUyJTGe/gVucKiOVcl662+/+ut6lbHEd
hokucHbHCrl3JEMk1+9k3A8UugB+BloRQyi7zlssfgaPLbzZo/m52/cV8oXGoBhH
ArbjnIwmSgISbTjLr1EetKmLK8ha7rk6ALmklSaKrSXQ6YuUZi1R9JUjYnncuCAz
6EmfTZnz0QHxawuWDpAzQATxPTFh6T7OG9QdKiS6Wge+VtRTI+fbCvu3vdGA+/1R
L9SvBLrY2Y7zOVYYE2RAcwJjdccGtMFtkKQ+mmWbGiq1Pds75oNaTyyQcNlELcYd
o23Tc138QwIDAQABo0IwQDAdBgNVHQ4EFgQUHy2RhcGjakHIy/zHQICp5gV9Pgcw
EgYDVR0TAQH/BAgwBgEB/wIBADALBgNVHQ8EBAMCAQYwDQYJKoZIhvcNAQEMBQAD
ggGBACqnPX98Cu8qD0meER4pdQyuWKTUxP39V9XkCY8a10eVl5s982E02hN3wDNK
e9hJMq/L43qB0YrqGZo5WFF8pV3MgXKZTXGIuQwX5EU5sOLSMLB/mfymYyTlRg7v
oHv0HbOToS1hFjxrJfM06pUtnjBcBPhAH6rciuiQxcBISD5EwbcwK+t6ikkb6jLr
yoG93QlwzgbJDI+hsntII2SzQI7vC/BP8cTFTB7p2VjfgfSvFCvoHgzw9KwOll/V
CzcVymFvt6nZjFfYf6HQrva+ZsvKYeyzjl0pjR7R2mS8OaDinIzkJj9Z/HWlVX/T
gmIaTVYKJS7AEfEWK0AKdDcMMmKnpJI9kDQL1l+6LKkwzQuxl5+Yl+NrVX6MzxjI
zfwCdo1jKNXZhA33vtIkUHG76Bv7uL6PJx9WEUyLs8PUgfpy3uU/je6RZi6WI2DJ
S9Zqt2bRMAiIPzpotGY2x/Tbd53jmdwfZLBvEFVFdpir3b+M2jC2tbxm4y7GBLAY
MLY8Sg==
-----END CERTIFICATE-----`
       },
    });
    await client.connect();
    console.log("✅ PostgreSQL connected");
  } else if (DB_MODE.toUpperCase() === "MYSQL") {
    client = await mysql.createConnection({
      host: DB_HOST_MYSQL,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: false,
    });
    console.log("✅ MySQL connected");
  } else {
    throw new Error(`❌ DB_MODE invalide : ${DB_MODE}`);
  }

  return client;
}

async function washBDD() {
  const db = await initClient();
  let query;
  if (DB_MODE.toUpperCase() === "POSTGRES") {
    query = `DELETE FROM question_option where opt_label = ''; `;
    await db.query(query);
    query = `DELETE FROM question where que_question = ''; `;
    await db.query(query);
  }
  else if (DB_MODE.toUpperCase() === "MYSQL") {
    query = `DELETE FROM question_option where opt_label = '';`;
    await db.query(query);
    query = `DELETE FROM question where que_question = '';`;
    await db.query(query);
  }
}

module.exports = { initClient, DB_MODE, washBDD };
