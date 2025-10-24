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

class Question {
  constructor(id, question, options, response, desc, topic, type, image_link) {
    this.id = id;
    this.question = question;
    this.options = options;
    this.response = response;
    this.desc = desc;
    this.image_link = image_link;
    this.topic = topic;
    this.type = type;
  }

  static async getRandomQuestion() {
    const db = await initClient();

    let query;
    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `
        SELECT * 
        FROM question que
        JOIN question_option opt ON que.que_id = opt.que_id
        JOIN question_type typ ON typ.typ_id = que.typ_id
        JOIN question_topic top ON top.top_id = que.top_id
        JOIN (
          SELECT que_id AS random_id FROM question ORDER BY random() LIMIT 1
        ) AS rand ON que.que_id = rand.random_id;
      `;
      const res = await db.query(query);
      return Question.parseRows(res.rows);
    }

    if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `
        SELECT * 
        FROM question que
        JOIN question_option opt ON que.que_id = opt.que_id
        JOIN question_type typ ON typ.typ_id = que.typ_id
        JOIN question_topic top ON top.top_id = que.top_id
        JOIN (
          SELECT que_id AS random_id FROM question ORDER BY RAND() LIMIT 1
        ) AS rand ON que.que_id = rand.random_id;
      `;
      const [rows] = await db.query(query);
      return Question.parseRows(rows);
    }

    throw new Error("❌ Mode de base de données inconnu");
  }

  static parseRows(rows) {
    if (!rows || rows.length === 0) return null;

    const q = rows[0];
    const options = rows.map((r) => r.opt_label);
    let response = "";

    if (q.typ_label === "open") {
      response = "1";
    } else if (q.typ_label === "qcm") {
      const correctOption = rows.find((r) => r.opt_iscorrect === 1);
      if (correctOption) response = correctOption.opt_label;
      if (options.length !== 4) {
        console.error("Erreur : Nombre d'options incorrect pour une question QCM.");
        return null;
      }
    }

    return new Question(
      q.que_id,
      q.que_question,
      options,
      response,
      q.que_desc,
      q.top_label,
      q.typ_label,
      q.que_image
    );
  }
}

module.exports = Question;
