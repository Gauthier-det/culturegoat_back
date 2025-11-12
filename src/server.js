const express = require("express");
const http = require("http");
const { type } = require("os");
const { Server } = require("socket.io");
const Question = require("./Question");
const GameRules = require("./GameRules");
const { normalizeWord } = require("./tools");
const { washBDD, DB_MODE, initClient } = require("./dbConnection");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] },
});


/*-----------------------------------------------------------------------*/

// Envoi des questions aux joueurs de la room
async function sendQuestion(roomId) {
  let room = rooms[roomId];
  if (!room) return;

  room.question_now = await Question.getRandomQuestion();
  let q = room.question_now;
  //console.log(q.question);
  //console.log(room.gameRules.rules);
  if (room.gameRules.rules == "ScoreMax") {
    for (let playerId in room.players) {
      //console.log(room.players[playerId].score);
      if (room.players[playerId].score >= room.gameRules.scoreMax) {
        io.to(roomId).emit("gameOver", room.players);
        room.nbQuestionsAsked = 0;
        return;
      }
    }
  }
  else if (room.gameRules.rules == "FixedQuestions") {
    //console.log(room.nbQuestionsAsked, room.gameRules.questionMax);
    if (room.nbQuestionsAsked >= room.gameRules.questionMax) {
      io.to(roomId).emit("gameOver", room.players);
      room.nbQuestionsAsked = 0;
      return;
    }
  }

  let timeLimit = 5;
  if (q.type === "qcm") {
    timeLimit = room.gameRules.qcmTimeLimit || 8;
  } else if (q.type === "open") {
    timeLimit = room.gameRules.openTimeLimit || 12;
  }
  
  io.to(roomId).emit("newQuestion", {
    question: q.question,
    options: q.options,
    type: q.type,
    time: timeLimit + 4,
    response: q.response,
    desc: q.desc,
    image_link: q.image_link
  });

  room.nbQuestionsAsked++;

  setTimeout(() => {
    rooms[roomId].currentQuestionIndex++;
    sendQuestion(roomId);
  }, timeLimit * 1000 + 4000);
}

let rooms = {};

/*-----------------------------------------------------------------------*/

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
        nbQuestionsAsked: 0,
        gameRules: null
      };
    }

    rooms[roomId].players[socket.id] = { name: playerName, score: 0 };
    rooms[roomId].readyPlayers[socket.id] = false;
    //console.log(rooms);
    socket.join(roomId);

    io.to(roomId).emit("updatePlayers", rooms[roomId]);
  });

  // Mise en place de la partie
  socket.on("prepareGame", (data) => {
    const roomId = data.roomId;
    const rules = data.rules;
    let gameRules = new GameRules(rules.rulesOption, rules.scoreMax, rules.qcmTimeLimit, rules.openTimeLimit, rules.questionMax);
    rooms[roomId].gameRules = gameRules;
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
    if (answer === normalizeWord(q.response)) {
      room.players[socket.id].score += 1;
    }
  });

  // Déconnexion
  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      let room = rooms[roomId];
      if (room.players[socket.id]) {
        let newHostId = null;
        delete room.players[socket.id];
        if (socket.id === room.host) {
          newHostId = Object.keys(room.players)[0];
          room.host = newHostId;
        }
        io.to(roomId).emit("updatePlayers", room, newHostId);
      }
    }
  });

  socket.on("addQuestion", async (questionData, callback) => {
    try {
      const question = new Question(
        null, 
        questionData.question,
        questionData.options,
        questionData.response,
        questionData.desc,
        questionData.topic.label, 
        questionData.type.label, 
        questionData.image_link
      );
      //console.log("Nouvelle question créée :", question);
      await question.save(questionData.topic.id, questionData.type.id);
      io.emit("questionAdded", question);
      callback({ success: true });
    } catch (error) {
      console.error("Erreur lors de l'ajout de la question :", error);
    }
  });

  socket.on("getTopicsAndTypes", async () => {
    try {
      const topics = await Question.getAllTopics();
      const types = await Question.getAllTypes();
      socket.emit("topicsAndTypes", { topics, types });
    } catch (error) {
      console.error("Erreur lors de la récupération des sujets et types :", error);
    }
  });

  socket.on("deleteQuestion", async (questionId) => {
    try {
      const question = new Question();
      question.id = questionId;
      await question.delete();
      await washBDD();
      io.emit("questionDeleted", questionId);
    } catch (error) {
      console.error("Erreur lors de la suppression de la question :", error);
    }
  });

  socket.on("validateQuestion", async (questionId) => {
    try {
      const question = new Question();
      question.id = questionId;
      await question.validate();
      await washBDD();
      io.emit("questionValidated", questionId);
    } catch (error) {
      console.error("Erreur lors de la validation de la question :", error);
    }
  });

  socket.on("getTempQuestions", async () => {
    const questions = await Question.getAllTempQuestions();
    socket.emit("tempQuestions", questions);
  });

});

server.listen(3000, () => {
  console.log("Serveur lancé sur http://localhost:3000");
});

/*-----------------------------------------------------------------------*/