const mysql = require("mysql2/promise");

const pool = mysql.createPool({
    host: "localhost",
    user: "culturegoat",       
    password: "GaLuBaRaGOAT", 
    database: "culturegoat",  
});

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
        const [rows] = await pool.query(
            "SELECT * FROM question que join question_option opt on que.que_id = opt.que_id join question_type typ on typ.typ_id = que.typ_id join question_topic top on top.top_id = que.top_id join ( select que_id as random_id from question que2 order by rand() limit 1 ) as rand on que.que_id = random_id;"
        );

        if (rows.length === 0) return null;
        //console.log("Row from DB:", rows[0]);
        const q = rows[0];
        var options = [];
        var response = "";

        if (q.typ_label === "open") {
            response = "1";
        } else if (q.typ_label === "qcm") {
            for (let i = 0; i < rows.length; i++) {
                console.log("opt_iscorrect : ", rows[i].opt_iscorrect);
                if (rows[i].opt_iscorrect == 1) {
                    response = rows[i].opt_label;
                    break;
                }
            }
        }
        console.log("response : ",response);
        var options = rows.map(row => row.opt_label);

        if (q.que_type === 'qcm' && options.length < 4 || options.length > 4) {
            console.error("Erreur : Nombre d'options incorrect pour une question QCM.");
            return null;
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