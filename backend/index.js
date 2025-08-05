const express = require('express');
const http = require('http');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const app = express();
const server = http.createServer(app);

// Enable CORS for your React frontend
app.use(cors({
  origin: "http://localhost:3000", // React dev server
  credentials: true
}));

app.use(express.json());

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
  
  console.log(`✅ New client connected! Client ID: ${clientId}`);
  
  // Store client info
  clients.set(ws, {
    id: clientId,
    connectedAt: new Date(),
    lastSeen: new Date(),
    userInfo: null
  });

  // Send welcome message
  const welcomeMessage = {
    type: 'connection',
    message: 'Connected to WebSocket server',
    clientId: clientId,
    timestamp: new Date().toISOString()
  };
  
  ws.send(JSON.stringify(welcomeMessage));
  console.log(`📤 Sent welcome message to ${clientId}:`, welcomeMessage);

  // Broadcast user count to all clients
  broadcastUserCount();

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📥 Received message from ${clientId}:`, message);

      // Update client's last seen
      if (clients.has(ws)) {
        clients.get(ws).lastSeen = new Date();
      }

      // Process different message types
      switch (message.type) {
        case 'chat_message':
          console.log(`💬 Broadcasting chat message from ${clientId}`);
          broadcastChatMessage(message, clientId);
          break;
        case 'typing_start':
          console.log(`⌨️ ${clientId} started typing`);
          broadcastTypingStatus(clientId, true);
          break;
        case 'typing_stop':
          console.log(`⌨️ ${clientId} stopped typing`);
          broadcastTypingStatus(clientId, false);
          break;
        case 'user_info':
          console.log(`👤 Updating user info for ${clientId}:`, message.userInfo);
          updateUserInfo(ws, message.userInfo);
          break;
        default:
          console.log(`❓ Unknown message type from ${clientId}:`, message.type);
      }
    } catch (error) {
      console.error(`❌ Error parsing message from ${clientId}:`, error);
      ws.send(JSON.stringify({
        type: 'error',
        message: 'Invalid message format',
        timestamp: new Date().toISOString()
      }));
    }
  });

  // Handle client disconnect
  ws.on('close', () => {
    console.log(`❌ Client ${clientId} disconnected`);
    clients.delete(ws);
    broadcastUserCount();
  });

  // Handle WebSocket errors
  ws.on('error', (error) => {
    console.error(`💥 WebSocket error for client ${clientId}:`, error);
    clients.delete(ws);
  });
});

// Broadcast chat message to all connected clients
function broadcastChatMessage(message, senderId) {
  const chatMessage = {
    type: 'chat_message',
    id: messageId++,
    user: message.user || 'Anonymous',
    message: message.message,
    senderId: senderId,
    timestamp: new Date().toISOString()
  };

  console.log(`📢 Broadcasting to ${wsServer.clients.size} clients:`, chatMessage);

  let broadcastCount = 0;
  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      client.send(JSON.stringify(chatMessage));
      broadcastCount++;
    }
  });
  
  console.log(`✅ Message sent to ${broadcastCount} clients`);
}

// Broadcast typing status
function broadcastTypingStatus(senderId, isTyping) {
  const typingMessage = {
    type: 'typing_status',
    senderId: senderId,
    isTyping: isTyping,
    timestamp: new Date().toISOString()
  };

  wsServer.clients.forEach((client) => {
    if (client.readyState === client.OPEN) {
      // Don't send typing status back to the sender
      const clientInfo = clients.get(client);
      if (clientInfo && clientInfo.id !== senderId) {
        client.send(JSON.stringify(typingMessage));
      }
    }
  });
}

// Broadcast current user count
function broadcastUserCount() {
  const userCountMessage = {
    type: 'user_count',
    count: wsServer.clients.size,
    timestamp: new Date().toISOString()
  };

  console.log(`👥 Broadcasting user count: ${wsServer.clients.size}`);

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
    console.log(`✅ Updated user info for ${clientId}:`, userInfo);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🛑 Shutting down servers...');
  wsServer.close();
  server.close();
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down servers...');
  wsServer.close();
  server.close();
  process.exit(0);
});

console.log('🚀 WebSocket server is ready!');
console.log(`📍 WebSocket URL: ws://localhost:${WS_PORT}`);
console.log(`📍 Health check: http://localhost:${PORT}/health`);