require('dotenv').config();
const express = require("express");
const http = require("http");
const crypto = require("crypto");
const bcrypt = require("bcrypt");
const { Server } = require("socket.io");
const Question = require("./models/Question");
const GameRules = require("./models/GameRules");
const { normalizeWord } = require("./utils/tools");
const { washBDD, DB_MODE, initClient } = require("./db/dbConnection");
const { authenticateSocket, isAdmin, isCreatorOrAdmin, generateToken } = require("./middleware/auth");
const RateLimiter = require("./middleware/rateLimiter");
const { sanitizeInput, sanitizeObject } = require("./utils/sanitize");
const { questionSchema, gameRulesSchema, validate } = require("./utils/validation");
const logger = require('./utils/logger');
const { validateEnv } = require('./config/validateEnv');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const compression = require('compression');

validateEnv();

const app = express();
const server = http.createServer(app);

app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(compression());

// Rate limiting HTTP
const httpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', httpLimiter);

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    const db = await initClient();
    
    // Test simple de la BDD
    let query = DB_MODE.toUpperCase() === 'POSTGRES' 
      ? 'SELECT 1 as result' 
      : 'SELECT 1 as result';
    
    if (DB_MODE.toUpperCase() === 'POSTGRES') {
      await db.query(query);
    } else {
      await db.query(query);
    }
    
    res.status(200).json({
      status: 'ok',
      database: 'connected',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0'
    });
  } catch (error) {
    logger.error('Health check failed', { error: error.message });
    res.status(503).json({ 
      status: 'error', 
      database: 'disconnected',
      message: 'Service unavailable' 
    });
  }
});

// Metrics endpoint (optionnel mais utile)
app.get('/metrics', (req, res) => {
  const metrics = {
    connectedSockets: io.engine.clientsCount,
    activeRooms: Object.keys(rooms).length,
    memory: {
      used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
      total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
    },
    uptime: Math.floor(process.uptime()) + ' seconds',
    nodeVersion: process.version
  };
  res.json(metrics);
});

// Route de base
app.get('/', (req, res) => {
  res.json({ 
    name: 'CultureGoat API', 
    version: '1.0.0',
    status: 'running' 
  });
});

// Configuration CORS sécurisée
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const io = new Server(server, {
  cors: {
    origin: [
      FRONTEND_URL,                    
      'http://localhost:5173',
      'http://localhost:8080',
      'http://localhost:4173',
      'http://127.0.0.1:8080',
    ],
    methods: ["GET", "POST"],
    credentials: true
  },
});

// Rate limiter global
const rateLimiter = new RateLimiter(15, 1000); // 15 requêtes/seconde max
rateLimiter.cleanup();

let rooms = {};

// Middleware d'authentification
io.use(authenticateSocket);

// Middleware de rate limiting
io.use((socket, next) => {
  if (!rateLimiter.check(socket.id)) {
    return next(new Error('Rate limit exceeded'));
  }
  next();
});

// Vérifie si la partie est terminée selon les règles définies
function isOver(roomId){
  let room = rooms[roomId];
  if (!room) return;
  
  if (room.gameRules.rules == "ScoreMax") {
    for (let playerId in room.players) {
      if (room.players[playerId].score >= room.gameRules.scoreMax) {
        io.to(roomId).emit("gameOver", room.players);
        room.nbQuestionsAsked = 0;
        clearTimeout(room.questionTimeOut); 
        room.started = false;
        room.isGameOver = true; 
        return true;
      }
    }
  } else if (room.gameRules.rules == "FixedQuestions") {
    if (room.nbQuestionsAsked >= room.gameRules.questionMax) {
      io.to(roomId).emit("gameOver", room.players);
      room.nbQuestionsAsked = 0;
      clearTimeout(room.questionTimeOut);
      room.started = false;
      room.isGameOver = true; 
      return true;
    }
  }
  return false;
}

// Envoi d'une nouvelle question à la room
async function sendQuestion(roomId) {
  let room = rooms[roomId];

  if (!room) return;
  if (!room.started) return;
  clearTimeout(room.questionTimeOut);

  const selectedTopics = room.gameRules.selectedTopics;
  const totalQuestions = await Question.getNbQuestion(
    selectedTopics && selectedTopics.length > 0 ? selectedTopics : null
  );

  room.answeredPlayers = 0;
  room.answeredPlayersList = {}; 
  room.question_now = await Question.getRandomQuestion(
    selectedTopics && selectedTopics.length > 0 ? selectedTopics : null
  );
  
  if (room.questionsAsked.length == totalQuestions) {
    room.questionsAsked = [];
  }
  while (room.questionsAsked.includes(room.question_now.id)) {
    room.question_now = await Question.getRandomQuestion(
      selectedTopics && selectedTopics.length > 0 ? selectedTopics : null
    );
  }
  room.questionsAsked.push(room.question_now.id);
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
    image_link: q.image_link,
  });
  
  room.questionTimeOut = setTimeout(() => {
    isOver(roomId);
    sendQuestion(roomId);
  }, timeLimit * 1000 + 4000);
  
  return timeLimit;
}

// Gestion des connexions Socket.IO
io.on("connection", (socket) => {
  console.log(`✅ Connexion: ${socket.id} (role: ${socket.role})`);
  
  // Authentification Admin
  socket.on("adminLogin", async (password, callback) => {
    try {
      if (password === process.env.ADMIN_PASSWORD) {
        const token = generateToken('admin');
        callback({ success: true, token });
      } else {
        callback({ success: false, error: 'Invalid password' });
      }
    } catch (error) {
      console.error("Erreur adminLogin:", error);
      callback({ success: false, error: 'Server error' });
    }
  });

  // Authentification Créateur
  socket.on("creatorLogin", async (password, callback) => {
    try {
      if (password === process.env.CREATOR_PASSWORD) {
        const token = generateToken('creator');
        callback({ success: true, token });
      } else {
        callback({ success: false, error: 'Invalid password' });
      }
    } catch (error) {
      console.error("Erreur creatorLogin:", error);
      callback({ success: false, error: 'Server error' });
    }
  });
  
  // Rejoindre ou créer une room 
  socket.on("joinRoom", ({ roomId, playerName }) => {
    try {
      // Sanitize inputs
      roomId = sanitizeInput(roomId);
      playerName = sanitizeInput(playerName);
      
      // Validation
      if (!roomId || roomId.length < 4 || roomId.length > 20) {
        return socket.emit("error", "Invalid room ID");
      }
      if (!playerName || playerName.length > 50) {
        return socket.emit("error", "Invalid player name");
      }
      
      if (!rooms[roomId]) {
        logger.info('Nouveau joueur', { socketId: socket.id, roomId });
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
          questionTimeOut: null,
          isGameOver: false,
          rematchCountdown: null,
          questionsAsked: []
        };
      }
      
      let existingPlayer = null;
      for (let playerId in rooms[roomId].players) {
        if (rooms[roomId].players[playerId].name === playerName) {
          existingPlayer = playerId;
          break;
        }
      }
      
      if (existingPlayer && existingPlayer !== socket.id) {
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
        
        if (rooms[roomId].host === existingPlayer) {
          rooms[roomId].host = socket.id;
        }
      } else if (!rooms[roomId].players[socket.id]) {
        rooms[roomId].players[socket.id] = {
          name: playerName,
          score: 0
        };
        rooms[roomId].readyPlayers[socket.id] = false;
      }
      
      socket.join(roomId);
      
      if (rooms[roomId].started) {
        socket.emit("gameAlreadyStarted", {
          question: rooms[roomId].question_now,
          players: rooms[roomId].players
        });
        
        rooms[roomId].readyPlayers[socket.id] = true;
      }
      
      io.to(roomId).emit("updatePlayers", {
        players: rooms[roomId].players,
        host: rooms[roomId].host,
        started: rooms[roomId].started
      });
    } catch (error) {
      console.error("Erreur joinRoom:", error);
      socket.emit("error", "Failed to join room");
    }
  });

  // Préparation de la partie avec les règles définies
  socket.on("prepareGame", (data) => {
    try {
      const { roomId, rules } = data;
      const room = rooms[roomId];
      
      if (!room) {
        return socket.emit("error", "Room not found");
      }
      
      // Vérifier que c'est bien l'host
      if (room.host !== socket.id) {
        return socket.emit("error", "Only host can start game");
      }
      
      // Valider les règles
      const validatedRules = validate(gameRulesSchema, rules);
      
      let gameRules = new GameRules(
        validatedRules.rulesOption,
        validatedRules.scoreMax,
        validatedRules.qcmTimeLimit,
        validatedRules.openTimeLimit,
        validatedRules.questionMax,
        validatedRules.selectedTopics
      );
      
      rooms[roomId].gameRules = gameRules;
      io.to(roomId).emit("gameStarting");
    } catch (error) {
      console.error("Erreur prepareGame:", error);
      socket.emit("error", "Invalid game rules");
    }
  });

  // Joueur prêt
  socket.on("ready", async (roomId) => {
    try {
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
    } catch (error) {
      console.error("Erreur ready:", error);
    }
  });

  // Réception d'une réponse d'un joueur
  socket.on("answer", ({ roomId, answer }) => {
    try {
      let room = rooms[roomId];
      if (!room) return;
      
      if (room.answeredPlayersList[socket.id]) {
        return;
      }
      
      // Sanitize answer
      answer = sanitizeInput(answer);
      
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
    } catch (error) {
      console.error("Erreur answer:", error);
    }
  });

  // Gestion de la déconnexion d'un joueur
  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      let room = rooms[roomId];
      if (room.players[socket.id]) {
        if (room.started) {
          room.players[socket.id].disconnected = true;
          
          io.to(roomId).emit("updatePlayers", {
            players: room.players,
            host: room.host,
            started: room.started
          });
        } else {
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

  // Ajout d'une nouvelle question (PROTÉGÉ)
  socket.on("addQuestion", async (questionData, callback) => {
    try {
      // Vérifier les permissions
      if (!isCreatorOrAdmin(socket)) {
        return callback({ success: false, error: 'Unauthorized' });
      }
      
      // Sanitize
      questionData = sanitizeObject(questionData);
      
      // Valider
      const validatedData = validate(questionSchema, questionData);
      
      const question = new Question(
        null,
        validatedData.question,
        validatedData.options,
        validatedData.response,
        validatedData.desc,
        validatedData.topic.label,
        validatedData.type.label,
        validatedData.image_link
      );
      
      await question.save(validatedData.topic.id, validatedData.type.id);

      io.emit("questionAdded", question);
      callback({ success: true });
    } catch (error) {
      console.error("Erreur lors de l'ajout de la question :", error);
      callback({ success: false, error: error.message });
    }
  });

  // Récupération des sujets et types de questions
  socket.on("getTopicsAndTypes", async () => {
    try {
      const topics = await Question.getAllTopics();
      const types = await Question.getAllTypes();
      socket.emit("topicsAndTypes", { topics, types });
    } catch (error) {
      console.error("Erreur lors de la récupération des sujets et types :", error);
    }
  });

  // Rejeter une question
  socket.on("deleteQuestion", async (questionId) => {
    try {
      if (!isAdmin(socket)) {
        return socket.emit("error", "Unauthorized");
      }
      
      if (!Number.isInteger(questionId) || questionId <= 0) {
        return socket.emit("error", "Invalid question ID");
      }
      
      const question = new Question();
      question.id = questionId;
      await question.delete();
      await washBDD();
      io.emit("questionDeleted", questionId);
    } catch (error) {
      console.error("Erreur lors de la suppression de la question :", error);
    }
  });

  // Valider une question 
  socket.on("validateQuestion", async (questionId) => {
    try {
      if (!isAdmin(socket)) {
        return socket.emit("error", "Unauthorized");
      }
      
      if (!Number.isInteger(questionId) || questionId <= 0) {
        return socket.emit("error", "Invalid question ID");
      }
      
      const question = new Question();
      question.id = questionId;
      await question.validate();
      await washBDD();
      io.emit("questionValidated", questionId);
    } catch (error) {
      console.error("Erreur lors de la validation de la question :", error);
    }
  });

  // Récupération des questions en attente de validation (PROTÉGÉ)
  socket.on("getTempQuestions", async () => {
    try {
      if (!isAdmin(socket)) {
        return socket.emit("error", "Unauthorized");
      }
      
      const questions = await Question.getAllTempQuestions();
      socket.emit("tempQuestions", questions);
    } catch (error) {
      console.error("Erreur getTempQuestions:", error);
    }
  });

  // Demande de rematch
  socket.on("requestRematch", (roomId) => {
    try {
      let room = rooms[roomId];
      if (!room || !room.isGameOver) return;

      for (let playerId in room.players) {
        room.players[playerId].score = 0;
        room.players[playerId].disconnected = false;
      }

      room.readyPlayers = {};
      for (let playerId in room.players) {
        room.readyPlayers[playerId] = false;
      }
      room.nbQuestionsAsked = 0;
      room.currentQuestionIndex = 0;
      room.question_now = null;
      room.answeredPlayers = 0;
      room.answeredPlayersList = {};
      room.isGameOver = false;
      room.started = false;

      io.to(roomId).emit("rematchStarting", {
        countdown: 5,
        players: room.players
      });

      let countdown = 5;
      clearInterval(room.rematchCountdown);
      
      room.rematchCountdown = setInterval(() => {
        countdown--;
        io.to(roomId).emit("rematchCountdown", countdown);

        if (countdown <= 0) {
          clearInterval(room.rematchCountdown);
          room.rematchCountdown = null;
          for (let playerId in room.players) {
            room.readyPlayers[playerId] = true;
          }
          room.started = true;
          sendQuestion(roomId);
        }
      }, 1000);
    } catch (error) {
      console.error("Erreur requestRematch:", error);
    }
  });
});

process.on('uncaughtException', (error) => {
  logger.error('💥 Uncaught Exception:', { error: error.message, stack: error.stack });
  console.error('💥 Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('💥 Unhandled Rejection:', { reason, promise });
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('SIGTERM', () => {
  logger.info('SIGTERM signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT signal received: closing HTTP server');
  server.close(() => {
    logger.info('HTTP server closed');
    process.exit(0);
  });
});


const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`✅ Serveur lancé sur http://localhost:${PORT}`);
  console.log(`🔒 Mode: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🌐 CORS autorisé pour: ${process.env.FRONTEND_URL || 'http://localhost:5173'}`);
});
