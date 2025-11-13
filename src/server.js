const express = require("express");
const http = require("http");
const { type } = require("os");
const { Server } = require("socket.io");
const Question = require("./models/Question");
const GameRules = require("./models/GameRules");
const { normalizeWord } = require("./utils/tools");
const { washBDD, DB_MODE, initClient } = require("./db/dbConnection");

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  },
});

let rooms = {};

function isOver(roomId){
  let room = rooms[roomId];
  if (!room) return;
  
  if (room.gameRules.rules == "ScoreMax") {
    for (let playerId in room.players) {
      if (room.players[playerId].score >= room.gameRules.scoreMax) {
        io.to(roomId).emit("gameOver", room.players);
        room.nbQuestionsAsked = 0;
        clearTimeout(room.questionTimeOut)
        room.started = false;
        return true;
      }
    }
  } else if (room.gameRules.rules == "FixedQuestions") {
    if (room.nbQuestionsAsked >= room.gameRules.questionMax) {
      io.to(roomId).emit("gameOver", room.players);
      room.nbQuestionsAsked = 0;
      clearTimeout(room.questionTimeOut)
      room.started = false;
      return true;
    }
  }
  return false;
}

async function sendQuestion(roomId) {
  let room = rooms[roomId];
  if (!room) return;
  if (!room.started) return;
  
  clearTimeout(room.questionTimeOut);
  room.answeredPlayers = 0;
  room.answeredPlayersList = {}; // Track qui a répondu
  room.question_now = await Question.getRandomQuestion();
  room.nbQuestionsAsked += 1;
  
  let q = room.question_now;
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
  
  room.questionTimeOut = setTimeout(() => {
    isOver(roomId);
    sendQuestion(roomId);
  }, timeLimit * 1000 + 4000);
  
  return timeLimit;
}

io.on("connection", (socket) => {
  
  // Rejoindre ou créer une room (modifié pour gérer les parties en cours)
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
        gameRules: null,
        answeredPlayers: 0,
        answeredPlayersList: {},
        questionTimeOut: null
      };
    }
    
    // Vérifier si le joueur existait déjà (reconnexion)
    let existingPlayer = null;
    for (let playerId in rooms[roomId].players) {
      if (rooms[roomId].players[playerId].name === playerName) {
        existingPlayer = playerId;
        break;
      }
    }
    
    if (existingPlayer && existingPlayer !== socket.id) {
      // Reconnexion : transférer le score
      console.log(`Reconnexion de ${playerName} (ancien: ${existingPlayer}, nouveau: ${socket.id})`);
      rooms[roomId].players[socket.id] = {
        name: rooms[roomId].players[existingPlayer].name,
        score: rooms[roomId].players[existingPlayer].score
      };
      delete rooms[roomId].players[existingPlayer];
      
      if (rooms[roomId].readyPlayers[existingPlayer] !== undefined) {
        rooms[roomId].readyPlayers[socket.id] = rooms[roomId].readyPlayers[existingPlayer];
        delete rooms[roomId].readyPlayers[existingPlayer];
      }
      
      // Si l'ancien joueur était l'host
      if (rooms[roomId].host === existingPlayer) {
        rooms[roomId].host = socket.id;
      }
    } else if (!rooms[roomId].players[socket.id]) {
      // Nouveau joueur
      rooms[roomId].players[socket.id] = {
        name: playerName,
        score: 0
      };
      rooms[roomId].readyPlayers[socket.id] = false;
    }
    
    socket.join(roomId);
    
    // Si la partie a déjà commencé, informer le joueur
    if (rooms[roomId].started) {
      socket.emit("gameAlreadyStarted", {
        question: rooms[roomId].question_now,
        players: rooms[roomId].players
      });
      
      // Marquer comme prêt automatiquement
      rooms[roomId].readyPlayers[socket.id] = true;
    }
    
    // Envoyer uniquement les données nécessaires (pas tout l'objet room)
    io.to(roomId).emit("updatePlayers", {
      players: rooms[roomId].players,
      host: rooms[roomId].host,
      started: rooms[roomId].started
    });
  });

  socket.on("prepareGame", (data) => {
    const roomId = data.roomId;
    const rules = data.rules;
    let gameRules = new GameRules(
      rules.rulesOption,
      rules.scoreMax,
      rules.qcmTimeLimit,
      rules.openTimeLimit,
      rules.questionMax
    );
    rooms[roomId].gameRules = gameRules;
    io.to(roomId).emit("gameStarting");
  });

  socket.on("ready", async (roomId) => {
    let room = rooms[roomId];
    if (!room) return;
    
    room.readyPlayers[socket.id] = true;
    const allReady = Object.values(room.readyPlayers).every((v) => v);
    
    if (allReady && !room.started) {
      room.started = true;
      room.currentQuestionIndex = 0;
      isOver(roomId);
      room.timeLimit = await sendQuestion(roomId);
    }
  });

  socket.on("answer", ({ roomId, answer }) => {
    let room = rooms[roomId];
    if (!room) return;
    
    // Empêcher les réponses multiples
    if (room.answeredPlayersList[socket.id]) {
      return;
    }
    
    let q = rooms[roomId].question_now;
    if (answer === normalizeWord(q.response)) {
      room.players[socket.id].score += 1;
    }
    
    room.answeredPlayersList[socket.id] = true;
    room.answeredPlayers = room.answeredPlayers + 1;
    
    if (room.answeredPlayers >= Object.keys(room.players).length) {
      clearTimeout(room.questionTimeOut);
      io.to(roomId).emit("showAnswer", {
        response: q.response,
        desc: q.desc,
        image_link: q.image_link
      });
      
      setTimeout(() => {
        isOver(roomId);
        sendQuestion(roomId);
      }, 4000);
    }
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      let room = rooms[roomId];
      if (room.players[socket.id]) {
        console.log(`Joueur ${socket.id} déconnecté de la room ${roomId}`);
        
        // Ne pas supprimer immédiatement si la partie est en cours
        if (room.started) {
          console.log("Partie en cours, le joueur peut se reconnecter");
          // On garde le joueur dans la liste mais on note qu'il est déconnecté
          room.players[socket.id].disconnected = true;
          
          // Envoyer les données nettoyées
          io.to(roomId).emit("updatePlayers", {
            players: room.players,
            host: room.host,
            started: room.started
          });
        } else {
          // Si la partie n'a pas commencé, on peut supprimer
          let newHostId = null;
          delete room.players[socket.id];
          delete room.readyPlayers[socket.id];
          
          if (socket.id === room.host) {
            room.host = null;
            if(Object.keys(room.players).length != 0){
              newHostId = Object.keys(room.players)[0];
              room.host = newHostId;
            }
          }
          
          io.to(roomId).emit("updatePlayers", {
            players: room.players,
            host: room.host,
            started: room.started
          }, newHostId);
        }
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

server.listen(3001, () => {
  console.log("Serveur lancé sur http://localhost:3001");
});