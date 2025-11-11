const { initClient, DB_MODE } = require("./dbConnection");

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
        INSERT INTO temp_question (xue_question, xue_desc_response, xop_id, xyp_id, xue_image)
        VALUES ($1, $2, $3, $4, $5)
      `;
      values.unshift(this.id);
      res = await db.query(query, values);
      this.id = res.rows[0].xue_id;
    } else if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `
        INSERT INTO temp_question (xue_question, xue_desc_response, xop_id, xyp_id, xue_image)
        VALUES (?, ?, ?, ?, ?)
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
          INSERT INTO temp_question_option (xue_id, xpt_label, xpt_iscorrect)
          VALUES ($1, $2, $3)
        `;
      } else if (DB_MODE.toUpperCase() === "MYSQL") {
        optionQuery = `
          INSERT INTO temp_question_option (xue_id, xpt_label, xpt_iscorrect)
          VALUES (?, ?, ?)
        `;
      }
      //console.log("Insertion de l'option :", optionQuery, "Valeurs :", [this.id, option, isCorrect]);
      await db.query(optionQuery, [this.id, option, isCorrect]);
    } 
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
      optionQuery = `DELETE FROM temp_question_option WHERE xue_id = $1`;
      await db.query(optionQuery, [this.id]);
      query = `DELETE FROM temp_question WHERE xue_id = $1`;
      await db.query(query, [this.id]);
    } else if (DB_MODE.toUpperCase() === "MYSQL") {
      optionQuery = `DELETE FROM temp_question_option WHERE xue_id = ?`;
      await db.query(optionQuery, [this.id]);
      query = `DELETE FROM temp_question WHERE xue_id = ?`;
      await db.query(query, [this.id]);
    }
  }

  async validate() {
    const db = await initClient();
    let query;
    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `INSERT INTO question (que_question, que_desc_response, top_id, typ_id, que_image)
               SELECT xue_question, xue_desc_response, xop_id, xyp_id, xue_image
               FROM temp_question
               WHERE xue_id = $1
               RETURNING que_id`;
      const res = await db.query(query, [this.id]);
      const newQuestionId = res.rows[0].que_id;
      const optionQuery = `
        INSERT INTO question_option (que_id, opt_label, opt_iscorrect)
        SELECT $1, xpt_label, xpt_iscorrect
        FROM temp_question_option
        WHERE xue_id = $2`;
      await db.query(optionQuery, [newQuestionId, [this.id]]);
      const updateQuery = `UPDATE question_option SET que_id = $1 WHERE que_id = $2`;
      await db.query(updateQuery, [newQuestionId, this.id]);
      const deleteOptionQuery = `
        DELETE FROM temp_question_option WHERE xue_id = $1`;
      await db.query(deleteOptionQuery, [this.id]);
      const deleteQuery = `DELETE FROM temp_question WHERE xue_id = $1`;
      await db.query(deleteQuery, [this.id]);
    } else if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `INSERT INTO question (que_question, que_desc_response, top_id, typ_id, que_image)
               SELECT xue_question, xue_desc_response, xop_id, xyp_id, xue_image
               FROM temp_question
               WHERE xue_id = ?`;
      const [res] = await db.query(query, [this.id]);
      const newQuestionId = res.insertId;
      const optionQuery = `
        INSERT INTO question_option (que_id, opt_label, opt_iscorrect)
        SELECT ?, xpt_label, xpt_iscorrect
        FROM temp_question_option
        WHERE xue_id = ?`;
      await db.query(optionQuery, [newQuestionId, this.id]);
      const updateQuery = `UPDATE question_option SET que_id = ? WHERE que_id = ?`;
      await db.query(updateQuery, [newQuestionId, this.id]);
      const deleteOptionQuery = `
        DELETE FROM temp_question_option WHERE xue_id = ?`;
      await db.query(deleteOptionQuery, [this.id]);
      const deleteQuery = `DELETE FROM temp_question WHERE xue_id = ?`;
      await db.query(deleteQuery, [this.id]);
    }
  }

  static async getAllTempQuestions() {
    const db = await initClient();
    let query;

    if (DB_MODE.toUpperCase() === "POSTGRES") {
      query = `
        SELECT *
        FROM temp_question t
        JOIN temp_question_option o ON t.xue_id = o.xue_id
        JOIN temp_question_type ty ON t.xyp_id = ty.xyp_id
        JOIN temp_question_topic top ON t.xop_id = top.xop_id;
      `;
      const res = await db.query(query);
      return Question.groupTempRows(res.rows);
    }

    if (DB_MODE.toUpperCase() === "MYSQL") {
      query = `
        SELECT *
        FROM temp_question t
        JOIN temp_question_option o ON t.xue_id = o.xue_id
        JOIN temp_question_type ty ON t.xyp_id = ty.xyp_id
        JOIN temp_question_topic top ON t.xop_id = top.xop_id;
      `;
      const [rows] = await db.query(query);
      return Question.groupTempRows(rows);
    }
  }

  static groupTempRows(rows) {
  const grouped = {};
  for (const r of rows) {
    if (!grouped[r.xue_id]) {
      grouped[r.xue_id] = {
        id: r.xue_id,
        question: r.xue_question,
        desc: r.xue_desc_response,
        image_link: r.xue_image,
        topic: { id: r.xop_id, label: r.xop_label },
        type: { id: r.xyp_id, label: r.xyp_label },
        options: [],
        response: ""
      };
    }
    grouped[r.xue_id].options.push(r.xpt_label);
    if (r.xpt_iscorrect === 1) {
      grouped[r.xue_id].response = r.xpt_label;
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
    )
  );
}


}

module.exports = Question;
