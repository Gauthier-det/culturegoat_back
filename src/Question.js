require("dotenv").config();
const { Client } = require("pg");

const DB_HOST = process.env.DB_HOST_PG;

let client;

async function initClient() {
  if (!client) {
    client = new Client({
      connectionString: DB_HOST,
    });
    await client.connect();
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
    const client = await initClient();

    const query = `
      SELECT * 
      FROM question que
      JOIN question_option opt ON que.que_id = opt.que_id
      JOIN question_type typ ON typ.typ_id = que.typ_id
      JOIN question_topic top ON top.top_id = que.top_id
      JOIN (
        SELECT que_id AS random_id FROM question ORDER BY random() LIMIT 1
      ) AS rand ON que.que_id = rand.random_id;
    `;

    const res = await client.query(query);
    const rows = res.rows;

    if (rows.length === 0) return null;

    const q = rows[0];
    let options = rows.map((row) => row.opt_label);
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
