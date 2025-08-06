const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');
const admin = require('firebase-admin');

// Initialize Firebase Admin SDK
const serviceAccount = require('./websockets-ec8ac-firebase-adminsdk-fbsvc-309bdab6dc.json'); 

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: 'websockets-ec8ac',
});

const app = express();
const server = http.createServer(app);

// Enable CORS for your React frontend
app.use(cors({
  origin: "http://localhost:3000", // React dev server
  credentials: true
}));

app.use(express.json());

// Middleware to verify Firebase ID Token
async function verifyFirebaseToken(idToken) {
  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    return decodedToken;
  } catch (error) {
    console.error('Error verifying Firebase ID token:', error);
    throw new Error('Unauthorized');
  }
}

// Authentication endpoint
app.post('/api/auth', async (req, res) => {
  try{
    const { idToken } = req.body;
    if (!idToken) {
      return res.status(400).json({ error: 'ID token is required' });
    }
    const decodedToken = await verifyFirebaseToken(idToken);
    res.json({
      success: true,
      user:{
        uid: decodedToken.uid,
        email: decodedToken.email,
        name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous',
      }
    });
  } catch (error) {
    console.error('Authentication error:',error);
    res.status(401).json({ error: 'Unauthorized' });
  }
});

// Simple health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'WebSocket server is running', 
    timestamp: new Date().toISOString(),
    connectedClients: wsServer.clients.size 
  });
});

// Start HTTP server on port 8080
const PORT = 8080;
server.listen(PORT, () => {
  console.log(`HTTP Server listening on port ${PORT}`);
  console.log(`Health check available at: http://localhost:${PORT}/health`);
});

// WebSocket server on port 8081 (different from HTTP)
const WS_PORT = 8081;
const wsServer = new WebSocketServer({ port: WS_PORT });

// Store connected clients with additional info
const clients = new Map();
let messageId = 1;

console.log(`WebSocket Server listening on port ${WS_PORT}`);
console.log('Waiting for WebSocket connections...');

wsServer.on('connection', (ws, req) => {
  const clientId = Math.random().toString(36).substring(2, 15);
  
  console.log(`New client connected! Client ID: ${clientId}`);
  
  // Store client info
  clients.set(ws, {
    id: clientId,
    connectedAt: new Date(),
    lastSeen: new Date(),
    userInfo: null,
    authenticated: false,
    firebaseUser: null
  });

  // Send welcome message
  const welcomeMessage = {
    type: 'connection',
    message: 'Connected to WebSocket server',
    clientId: clientId,
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(welcomeMessage));
  console.log(`Sent welcome message to ${clientId}:`, welcomeMessage);

  // Handle incoming messages
  ws.on('message', async (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`Received message from ${clientId}:`, message);

      // Update client's last seen
      if (clients.has(ws)) {
        clients.get(ws).lastSeen = new Date();
      }

      // Process different message types
      switch (message.type) {
        case 'authenticate':
          try {
            console.log(`Authenticating user ${clientId} with token`);
            const decodedToken = await verifyFirebaseToken(message.idToken);
            
            // Update client info with authenticated user
            if (clients.has(ws)) {
              const clientInfo = clients.get(ws);
              clientInfo.authenticated = true;
              clientInfo.firebaseUser = {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous'
              };
              clients.set(ws, clientInfo);
            }

            // Send authentication success
            ws.send(JSON.stringify({
              type: 'authentication_success',
              user: {
                uid: decodedToken.uid,
                email: decodedToken.email,
                name: decodedToken.name || decodedToken.email?.split('@')[0] || 'Anonymous'
              },
              timestamp: new Date().toISOString()
            }));

            console.log(`User ${clientId} authenticated successfully as ${decodedToken.email}`);
            broadcastUserCount();
          } catch (error) {
            console.error(`Authentication failed for ${clientId}:`, error);
            ws.send(JSON.stringify({
              type: 'authentication_error',
              message: 'Authentication failed',
              timestamp: new Date().toISOString()
            }));
          }
          break;

        case 'chat_message':
          const clientInfo = clients.get(ws);
          if (!clientInfo?.authenticated) {
            ws.send(JSON.stringify({
              type: 'error',
              message: 'Authentication required to send messages',
              timestamp: new Date().toISOString()
            }));
            return;
          }
          console.log(`Broadcasting chat message from authenticated user ${clientId}`);
          broadcastChatMessage(message, clientInfo);
          break;

        case 'typing_start':
          const clientInfo2 = clients.get(ws);
          if (clientInfo2?.authenticated) {
            console.log(`${clientId} started typing`);
            broadcastTypingStatus(clientInfo2, true);
          }
          break;

        case 'typing_stop':
          const clientInfo3 = clients.get(ws);
          if (clientInfo3?.authenticated) {
            console.log(`${clientId} stopped typing`);
            broadcastTypingStatus(clientInfo3, false);
          }
          break;

        case 'user_info':
          console.log(`Updating user info for ${clientId}:`, message.userInfo);
          updateUserInfo(ws, message.userInfo);
          break;

        default:
          console.log(`Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`Error parsing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(ws);
    broadcastUserCount();
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(`WebSocket error for client ${clientId}:`, error);
    clients.delete(ws);
  });
});

// Broadcast chat message to all connected clients
function broadcastChatMessage(message, senderClientInfo) {
  const chatMessage = {
    type: 'chat_message',
    id: messageId++,
    user: senderClientInfo.firebaseUser.name,
    userEmail: senderClientInfo.firebaseUser.email,
    message: message.message,
    senderId: senderClientInfo.id,
    senderUid: senderClientInfo.firebaseUser.uid,
    timestamp: new Date().toISOString()
  };

  console.log(`Broadcasting to ${wsServer.clients.size} clients:`, chatMessage);

  let broadcastCount = 0;
  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      const clientInfo = clients.get(client);
      // Only send messages to authenticated clients
      if (clientInfo?.authenticated) {
        client.send(JSON.stringify(chatMessage));
        broadcastCount++;
      }
    }
  });
  
  console.log(`Message sent to ${broadcastCount} authenticated clients`);
}

// Broadcast typing status
function broadcastTypingStatus(senderClientInfo, isTyping) {
  const typingMessage = {
    type: 'typing_status',
    senderId: senderClientInfo.id,
    senderName: senderClientInfo.firebaseUser.name,
    isTyping: isTyping,
    timestamp: new Date().toISOString()
  };

  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      const clientInfo = clients.get(client);
      // Don't send typing status back to the sender and only to authenticated clients
      if (clientInfo?.authenticated && clientInfo.id !== senderClientInfo.id) {
        client.send(JSON.stringify(typingMessage));
      }
    }
  });
}

// Broadcast current user count (only authenticated users)
function broadcastUserCount() {
  const authenticatedCount = Array.from(clients.values()).filter(client => client.authenticated).length;
  
  const userCountMessage = {
    type: 'user_count',
    count: authenticatedCount,
    timestamp: new Date().toISOString()
  };

  console.log(`Broadcasting authenticated user count: ${authenticatedCount}`);

  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(userCountMessage));
    }
  });
}

// Update user information
function updateUserInfo(ws, userInfo) {
  if (clients.has(ws)) {
    clients.get(ws).userInfo = userInfo;
    const clientId = clients.get(ws).id;
    console.log(`Updated user info for ${clientId}:`, userInfo);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('Shutting down servers...');
  wsServer.close();
  server.close();
});

process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  wsServer.close();
  server.close();
  process.exit(0);
});

console.log('WebSocket server is ready!');
console.log(`WebSocket URL: ws://localhost:${WS_PORT}`);
console.log(`Health check: http://localhost:${PORT}/health`);