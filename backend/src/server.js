const express = require("express");
const http = require("http");
const { type } = require("os");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});

/*-----------------------------------------------------------------------*/
const questionsBank = [
  {
    q: "Quelle est la capitale de la France ?",
    options: ["Paris", "Berlin", "Madrid", "Rome"],
    a: "Paris",
    type: "qcm"
  },
  {
    q: "Dans quel films trouve t-on le personnage de Jack Sparrow ?",
    options: ["pirates des caraibes", "piratesdescaraibes", "piratesdescaraïbes", "pirates des caraïbes"],
    a: "1",
    type: "open"
  },
];
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

    let q = questionsBank[room.currentQuestionIndex];
    if (answer === q.a) {
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
  function sendQuestion(roomId) {
    let room = rooms[roomId];
    if (!room) return;

    let q = questionsBank[room.currentQuestionIndex];
    if (!q) {
      io.to(roomId).emit("gameOver", room.players);
      return;
    }
    
    io.to(roomId).emit("newQuestion", {
      question: q.q,
      options: q.options,
      type: q.type,
      time: 12 
    });

    setTimeout(() => {
      room.currentQuestionIndex++;
      sendQuestion(roomId);
    }, 12000); 
  }
});

server.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});
