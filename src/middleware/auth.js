const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default-secret-change-me';

/**
 * Middleware d'authentification Socket.IO
 */
function authenticateSocket(socket, next) {
  const token = socket.handshake.auth.token;
  
  // Permettre les connexions non authentifiées pour les joueurs
  if (!token) {
    socket.authenticated = false;
    socket.role = 'guest';
    return next();
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    socket.authenticated = true;
    socket.userId = decoded.userId;
    socket.role = decoded.role; // 'admin', 'creator', 'guest'
    next();
  } catch (err) {
    socket.authenticated = false;
    socket.role = 'guest';
    next();
  }
}

/**
 * Vérifier si l'utilisateur est admin
 */
function isAdmin(socket) {
  return socket.authenticated && socket.role === 'admin';
}

/**
 * Vérifier si l'utilisateur est créateur ou admin
 */
function isCreatorOrAdmin(socket) {
  return socket.authenticated && (socket.role === 'creator' || socket.role === 'admin');
}

/**
 * Générer un token JWT
 */
function generateToken(role, userId = null) {
  return jwt.sign(
    { role, userId: userId || `${role}-${Date.now()}` },
    JWT_SECRET,
    { expiresIn: '24h' }
  );
}

module.exports = {
  authenticateSocket,
  isAdmin,
  isCreatorOrAdmin,
  generateToken
};
