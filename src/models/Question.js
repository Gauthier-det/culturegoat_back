const { initClient, DB_MODE } = require("../db/dbConnection");

class Question {
  constructor(id, question, options, response, desc, topic, type, image_link, credit) {
    this.id = id;
    this.question = question;
    this.options = options;
    this.response = response;
    this.desc = desc;
    this.image_link = image_link;
    this.topic = topic;
    this.type = type
    this.credit = credit;
  }

  async save(topic_id, type_id) {
    const db = await initClient();
    let query;

    const values = [
      this.question,
      this.desc,
      topic_id,
      type_id,
      this.image_link
    ];

    let res;

    if (DB_MODE.toUpperCase() === "POSTGRES") { 
      query = `
        INSERT INTO question (que_question, que_desc_response, top_id, typ_id, que_image, que_status)
        VALUES ($1, $2, $3, $4, $5, 'ENC')
      `;
      values.unshift(this.id);
      res = await db.query(query, values);
      this.id = res.rows[0].que_id;
    } else if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `
        INSERT INTO question (que_question, que_desc_response, top_id, typ_id, que_image, que_status)
        VALUES (?, ?, ?, ?, ?, 'ENC')
      `;
      res = await db.query(query, values);
      this.id = res[0].insertId;
    }

    let isCorrect = 0;

    for (let option of this.options) {
      if (this.type === "qcm") {
        isCorrect = option === this.response ? 1 : 0;
      } else {
        isCorrect = 1;
      }
      let optionQuery;
      if (DB_MODE.toUpperCase() === "POSTGRES") {
        optionQuery = `
          INSERT INTO question_option (que_id, opt_label, opt_iscorrect)
          VALUES ($1, $2, $3)
        `;
      } else if (DB_MODE.toUpperCase() === "MYSQL") {
        optionQuery = `
          INSERT INTO question_option (que_id, opt_label, opt_iscorrect)
          VALUES (?, ?, ?)
        `;
      }
      //console.log("Insertion de l'option :", optionQuery, "Valeurs :", [this.id, option, isCorrect]);
      await db.query(optionQuery, [this.id, option, isCorrect]);
    } 
  }

  static async getRandomQuestion(topicIds = null) {
    const db = await initClient();

    let query;
    if (DB_MODE.toUpperCase() === "POSTGRES") {
      if (topicIds && topicIds.length > 0) {
        const placeholders = topicIds.map((_, i) => `$${i + 1}`).join(',');
        query = `
          SELECT * 
          FROM question que
          JOIN question_option opt ON que.que_id = opt.que_id
          JOIN question_type typ ON typ.typ_id = que.typ_id
          JOIN question_topic top ON top.top_id = que.top_id
          JOIN (
            SELECT que_id AS random_id 
            FROM question 
            WHERE que_status = 'VAL' 
            AND top_id IN (${placeholders})
            ORDER BY random() 
            LIMIT 1
          ) AS rand ON que.que_id = rand.random_id;
        `;
        const res = await db.query(query, topicIds);
        return Question.parseRows(res.rows);
      } else {
        query = `
          SELECT * 
          FROM question que
          JOIN question_option opt ON que.que_id = opt.que_id
          JOIN question_type typ ON typ.typ_id = que.typ_id
          JOIN question_topic top ON top.top_id = que.top_id
          JOIN (
            SELECT que_id AS random_id FROM question Where que_status = 'VAL' ORDER BY random() LIMIT 1
          ) AS rand ON que.que_id = rand.random_id;
        `;
        const res = await db.query(query);
        return Question.parseRows(res.rows);
      }
    }

    if (DB_MODE.toUpperCase() === "MYSQL") {
      if (topicIds && topicIds.length > 0) {
        const placeholders = topicIds.map(() => '?').join(',');
        query = `
          SELECT * 
          FROM question que
          JOIN question_option opt ON que.que_id = opt.que_id
          JOIN question_type typ ON typ.typ_id = que.typ_id
          JOIN question_topic top ON top.top_id = que.top_id
          JOIN (
            SELECT que_id AS random_id 
            FROM question 
            WHERE que_status = 'VAL' 
            AND top_id IN (${placeholders})
            ORDER BY RAND() 
            LIMIT 1
          ) AS rand ON que.que_id = rand.random_id;
        `;
        const [rows] = await db.query(query, topicIds);
        return Question.parseRows(rows);
      } else {
        query = `
          SELECT * 
          FROM question que
          JOIN question_option opt ON que.que_id = opt.que_id
          JOIN question_type typ ON typ.typ_id = que.typ_id
          JOIN question_topic top ON top.top_id = que.top_id
          JOIN (
            SELECT que_id AS random_id FROM question Where que_status = 'VAL' ORDER BY RAND() LIMIT 1
          ) AS rand ON que.que_id = rand.random_id;
        `;
        const [rows] = await db.query(query);
        return Question.parseRows(rows);
      }
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
      q.que_desc_response,
      q.top_label,
      q.typ_label,
      q.que_image,
      q.que_credit
    );
  }

  static async getAllTopics() {
    const db = await initClient();
    let query;

    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `SELECT * FROM question_topic t;`;
      const res = await db.query(query);
      // On renvoie id + label
      return res.rows.map(r => ({ id: r.top_id, label: r.top_label }));
    }

    if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `SELECT * FROM question_topic t;`;
      const [rows] = await db.query(query);
      return rows.map(r => ({ id: r.top_id, label: r.top_label }));
    }

    throw new Error("❌ Mode de base de données inconnu");
  }

  static async getAllTypes() {
    const db = await initClient();
    let query;

    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `SELECT * FROM question_type t;`;
      const res = await db.query(query);
      return res.rows.map(r => ({ id: r.typ_id, label: r.typ_label }));
    }

    if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `SELECT * FROM question_type t;`;
      const [rows] = await db.query(query);
      return rows.map(r => ({ id: r.typ_id, label: r.typ_label }));
    }

    throw new Error("❌ Mode de base de données inconnu");
  }

  async delete() {
    const db = await initClient();
    let query;
    let optionQuery;
    if (DB_MODE.toUpperCase() === "POSTGRES") {
      optionQuery = `DELETE FROM question_option WHERE que_id = $1`;
      await db.query(optionQuery, [this.id]);
      query = `DELETE FROM question WHERE que_id = $1`;
      await db.query(query, [this.id]);
    } else if (DB_MODE.toUpperCase() === "MYSQL") {
      optionQuery = `DELETE FROM question_option WHERE que_id = ?`;
      await db.query(optionQuery, [this.id]);
      query = `DELETE FROM question WHERE que_id = ?`;
      await db.query(query, [this.id]);
    }
  }

  async validate() {
    const db = await initClient();
    let query;
    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `UPDATE question SET que_status = 'VAL' WHERE que_id = $1`;
      await db.query(query, [this.id]);
    } else if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `UPDATE question SET que_status = 'VAL' WHERE que_id = ?`;
      await db.query(query, [this.id]);
    }
  }

  static async getAllTempQuestions() {
    const db = await initClient();
    let query;

    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `
        SELECT *
        FROM question t
        JOIN question_option o ON t.que_id = o.que_id
        JOIN question_type ty ON t.typ_id = ty.typ_id
        JOIN question_topic top ON t.top_id = top.top_id
        WHERE t.que_status = 'ENC';
      `;
      const res = await db.query(query);
      return Question.groupTempRows(res.rows);
    }

    if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `
        SELECT *
        FROM question t
        JOIN question_option o ON t.que_id = o.que_id
        JOIN question_type ty ON t.typ_id = ty.typ_id
        JOIN question_topic top ON t.top_id = top.top_id
        WHERE t.que_status = 'ENC';
      `;
      const [rows] = await db.query(query);
      return Question.groupTempRows(rows);
    }
  }

  static groupTempRows(rows) {
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.que_id]) {
      grouped[r.que_id] = {
        id: r.que_id,
        question: r.que_question,
        desc: r.que_desc_response,
        image_link: r.que_image,
        topic: { id: r.top_id, label: r.top_label },
        type: { id: r.typ_id, label: r.typ_label },
        options: [],
        response: ""
      };
    }
    grouped[r.que_id].options.push(r.opt_label);
    if (r.opt_iscorrect === 1) {
      grouped[r.que_id].response = r.opt_label;
    }
  }
  return Object.values(grouped).map(q =>
    new Question(
      q.id,
      q.question,
      q.options,
      q.response,
      q.desc,
      q.topic,
      q.type,
      q.image_link
    ));
  }

  static async getNbQuestion(topicIds = null){
    const db = await initClient();
    let query;
    if (DB_MODE.toUpperCase() === "POSTGRES") {
      if (topicIds && topicIds.length > 0) {
        const placeholders = topicIds.map((_, i) => `$${i + 1}`).join(',');
        query = `SELECT COUNT(*) AS count FROM question WHERE que_status = 'VAL' AND top_id IN (${placeholders})`;
        const res = await db.query(query, topicIds);
        return parseInt(res.rows[0].count, 10);
      } else {
        query = `SELECT COUNT(*) AS count FROM question WHERE que_status = 'VAL'`;
        const res = await db.query(query);
        return parseInt(res.rows[0].count, 10);
      }
    }
    if (DB_MODE.toUpperCase() === "MYSQL") {
      if (topicIds && topicIds.length > 0) {
        const placeholders = topicIds.map(() => '?').join(',');
        query = `SELECT COUNT(*) AS count FROM question WHERE que_status = 'VAL' AND top_id IN (${placeholders})`;
        const [rows] = await db.query(query, topicIds);
        return parseInt(rows[0].count, 10);
      } else {
        query = `SELECT COUNT(*) AS count FROM question WHERE que_status = 'VAL'`;
        const [rows] = await db.query(query);
        return parseInt(rows[0].count, 10);
      }
    }
  }


}

module.exports = Question;
