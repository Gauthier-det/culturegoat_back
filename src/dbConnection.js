require("dotenv").config();
const { Client: PGClient } = require("pg");
const mysql = require("mysql2/promise");

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
      ssl: { rejectUnauthorized: false },
    });
    await client.connect();
    console.log("✅ PostgreSQL connected");
  } else if (DB_MODE.toUpperCase() === "MYSQL") {
    client = await mysql.createConnection({
      host: DB_HOST_MYSQL,
      user: DB_USER,
      password: DB_PASSWORD,
      database: DB_NAME,
      ssl: { rejectUnauthorized: false },
    });
    console.log("✅ MySQL connected");
  } else {
    throw new Error(`❌ DB_MODE invalide : ${DB_MODE}`);
  }

  return client;
}

module.exports = { initClient, DB_MODE };
