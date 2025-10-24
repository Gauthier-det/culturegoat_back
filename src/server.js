const express = require("express");
const http = require("http");
const { type } = require("os");
const { Server } = require("socket.io");
const Question = require("./Question");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


/*-----------------------------------------------------------------------*/

let rooms = {};

io.on("connection", (socket) => {

  //Création ou rejoindre une room
  socket.on("joinRoom", ({ roomId, playerName }) => {
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

    room.question_now = await Question.getRandomQuestion();
    let q = room.question_now;
    //console.log(q.question);
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
