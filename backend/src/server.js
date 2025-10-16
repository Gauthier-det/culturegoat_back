const express = require("express");
const http = require("http");
const { type } = require("os");
const { Server } = require("socket.io");
const { default: Question } = require("./Question");
const mysql = require("mysql2/promise");

const pool = mysql.createPool({
  host: "localhost",
  user: "culturegoat",       
  password: "GaLuBaRaGOAT", 
  database: "culturegoat",  
});

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

/*-----------------------------------------------------------------------*/
async function getRandomQuestion() {

  const [rows] = await pool.query(
    "SELECT * FROM question que join question_option opt using (que_id) join (select que_id as random_id from question que2 order by rand() limit 1) as rand on que.que_id = random_id"
  );

  if (rows.length === 0) return null;
  console.log("Row from DB:", rows[0]);
  const q = rows[0];
  var options = [];

  console.log(rows);

  var options = rows.map(row => row.opt_label);

  if (q.que_type === 'qcm' && options.length < 4 || options.length > 4) {
    console.error("Erreur : Nombre d'options incorrect pour une question QCM.");
    return null;
  }
    
  return new Question(
      q.que_id,
      q.que_question,
      options,
      q.que_response,
      q.que_desc,
      q.que_topic,
      q.que_type,
      q.que_image
  );
}


/*-----------------------------------------------------------------------*/

let rooms = {};

io.on("connection", (socket) => {

  //Création ou rejoindre une room
  socket.on("joinRoom", ({ roomId, playerName, isHost }) => {
    if (!rooms[roomId]) {
      console.log("Nouveau joueur :", socket.id, " dans la room :", roomId);
      rooms[roomId] = {
        players: {},
        host: socket.id,
        started: false,
        currentQuestionIndex: 0,
        readyPlayers: {},
        question_now: null,
        nbQuestionsAsked: 0
      };
    }

    rooms[roomId].players[socket.id] = { name: playerName, score: 0 };
    rooms[roomId].readyPlayers[socket.id] = false;
    socket.join(roomId);

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  // Mise en place de la partie
  socket.on("prepareGame", (roomId) => {
    io.to(roomId).emit("gameStarting");
  });

  // Attente des joueurs prêts
  socket.on("ready", (roomId) => {
    let room = rooms[roomId];
    if (!room) return;

    room.readyPlayers[socket.id] = true;
    const allReady = Object.values(room.readyPlayers).every((v) => v);
    if (allReady && !room.started) {
      room.started = true;
      room.currentQuestionIndex = 0;
      sendQuestion(roomId);
    }
  });

  // Traitement des réponses
  socket.on("answer", ({ roomId, answer }) => {
    let room = rooms[roomId];
    if (!room) return;

    let q = rooms[roomId].question_now;
    if (answer === q.response) {
      room.players[socket.id].score += 1;
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      let room = rooms[roomId];
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        io.to(roomId).emit("updatePlayers", room);
      }
    }
  });

  // Envoi des questions aux joueurs de la room
  async function sendQuestion(roomId) {
    let room = rooms[roomId];
    if (!room) return;

    room.question_now = await getRandomQuestion();
    let q = room.question_now;
    console.log(q.question);
    if (room.nbQuestionsAsked >= 2) {
      io.to(roomId).emit("gameOver", room.players);
      room.nbQuestionsAsked = 0;
      return;
    }
    
    io.to(roomId).emit("newQuestion", {
      question: q.question,
      options: q.options,
      type: q.type,
      time: 12 
      
    });

    room.nbQuestionsAsked++;

    setTimeout(() => {
      rooms[roomId].currentQuestionIndex++;
      sendQuestion(roomId);
    }, 12000); 
  }
});

server.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});
