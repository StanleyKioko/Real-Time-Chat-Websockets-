import React, { useState, useEffect, useRef } from "react";
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebase';
import Auth from './Auth';

function Chat() {
  const [user, setUser] = useState(null);
  const [idToken, setIdToken] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const [authenticated, setAuthenticated] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const wsRef = useRef(null);

  // Monitor authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const token = await user.getIdToken();
        setUser(user);
        setIdToken(token);
      } else {
        setUser(null);
        setIdToken(null);
        setAuthenticated(false);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Connect to WebSocket server
  useEffect(() => {
    if (!user || !idToken) return;

    const connectWebSocket = () => {
      try {
        console.log('Attempting to connect to WebSocket server...');
        setConnectionStatus("Connecting...");
        
        const ws = new WebSocket('ws://localhost:8081');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('Connected to WebSocket server');
          setIsConnected(true);
          setConnectionStatus("Connected");
          
          // Authenticate with Firebase token
          ws.send(JSON.stringify({
            type: 'authenticate',
            idToken: idToken
          }));
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('Received message:', data);

            switch (data.type) {
              case 'connection':
                console.log('Connection established:', data.message);
                setConnectionStatus("Connected to server");
                break;

              case 'authentication_success':
                console.log('Authentication successful:', data.user);
                setAuthenticated(true);
                setConnectionStatus("Authenticated and Connected");
                break;

              case 'authentication_error':
                console.error('Authentication failed:', data.message);
                setConnectionStatus("Authentication failed");
                setAuthenticated(false);
                break;
              
              case 'chat_message':
                console.log('New chat message:', data);
                setMessages(prev => [...prev, {
                  id: data.id,
                  user: data.user,
                  userEmail: data.userEmail,
                  message: data.message,
                  timestamp: new Date(data.timestamp),
                  senderUid: data.senderUid
                }]);
                break;
              
              case 'user_count':
                console.log('User count update:', data.count);
                setOnlineCount(data.count);
                break;
              
              case 'typing_status':
                console.log('Typing status:', data);
                // Handle typing indicators from other users
                break;

              case 'error':
                console.error('Server error:', data.message);
                break;
              
              default:
                console.log('Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('WebSocket connection closed:', event.code, event.reason);
          setIsConnected(false);
          setAuthenticated(false);
          setConnectionStatus("Disconnected - Reconnecting...");
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          setIsConnected(false);
          setAuthenticated(false);
          setConnectionStatus("Connection failed");
        };
      } catch (error) {
        console.error('Failed to create WebSocket connection:', error);
        setIsConnected(false);
        setAuthenticated(false);
        setConnectionStatus("Failed to connect");
        // Try to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      }
    };

    connectWebSocket();

    // Cleanup on component unmount
    return () => {
      if (wsRef.current) {
        console.log('🧹 Cleaning up WebSocket connection');
        wsRef.current.close();
      }
    };
  }, [user, idToken]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleAuthSuccess = (firebaseUser, token) => {
    setUser(firebaseUser);
    setIdToken(token);
  };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      if (wsRef.current) {
        wsRef.current.close();
      }
      setMessages([]);
      setOnlineCount(0);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const sendWebSocketMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && authenticated) {
      console.log('Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.log('Cannot send message - WebSocket not connected or not authenticated');
      return false;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !authenticated) return;

    const message = {
      type: 'chat_message',
      message: newMessage.trim()
    };

    if (sendWebSocketMessage(message)) {
      setNewMessage("");
      setIsTyping(false);

      // Stop typing indicator
      sendWebSocketMessage({
        type: 'typing_stop'
      });
    }
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping && authenticated) {
      setIsTyping(true);
      sendWebSocketMessage({
        type: 'typing_start'
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (authenticated) {
        sendWebSocketMessage({
          type: 'typing_stop'
        });
      }
    }, 1000);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show loading while checking authentication
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-white font-bold text-2xl">🔄</span>
          </div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show authentication screen if not signed in
  if (!user) {
    return <Auth onAuthSuccess={handleAuthSuccess} />;
  }

  const displayName = user.displayName || user.email?.split('@')[0] || 'Anonymous';

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4">
            <div className="flex items-center gap-3 mb-3 sm:mb-0">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚀</span>
              </div>
              <span className="text-purple-400 text-sm font-medium">WebSocket Showcase</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-400">
                Welcome, <span className="text-white font-medium">{displayName}</span>!
              </div>
              <button
                onClick={handleSignOut}
                className="text-sm bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-lg transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Authenticated Real-Time Chat</h1>
          <p className="text-gray-400 text-base lg:text-lg">
            Secure WebSocket chat with Firebase Authentication. Only authenticated users can participate.
          </p>
        </div>
      </header>

      {/* Chat Interface */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Connection Status */}
          <div className="bg-gray-700 p-4 border-b border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  authenticated ? 'bg-green-800 text-green-300' : 'bg-yellow-800 text-yellow-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    authenticated ? 'bg-green-400' : 'bg-yellow-400'
                  }`}></div>
                  {authenticated ? 'AUTHENTICATED' : 'CONNECTING'}
                </div>
                <span className="text-gray-400 text-sm">
                  {onlineCount} authenticated users online
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row h-96">
            {/* Messages Area */}
            <div className="flex-1 flex flex-col min-h-0">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <p>No messages yet. Start the conversation!</p>
                    {!authenticated && (
                      <p className="text-yellow-400 text-sm mt-2">
                        ⚠️ Authenticating with server...
                      </p>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.senderUid === user.uid ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                        msg.senderUid === user.uid
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}>
                        {msg.senderUid !== user.uid && (
                          <div className="text-xs font-medium mb-1 opacity-75">{msg.user}</div>
                        )}
                        <div className="text-sm">{msg.message}</div>
                        <div className="text-xs opacity-75 mt-1">{formatTime(msg.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-gray-600">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder={authenticated ? "Type your message..." : "Authenticating..."}
                    disabled={!authenticated}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!authenticated || !newMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 sm:px-6 py-2 rounded-lg font-medium transition-colors whitespace-nowrap"
                  >
                    Send
                  </button>
                </div>
                {isTyping && (
                  <div className="text-xs text-gray-500 mt-2">You are typing...</div>
                )}
              </form>
            </div>

            {/* Users Sidebar */}
            <div className="w-full lg:w-64 bg-gray-700 border-t lg:border-t-0 lg:border-l border-gray-600 p-4 max-h-48 lg:max-h-none overflow-y-auto">
              <h3 className="text-white font-semibold mb-4">Authenticated Users ({onlineCount})</h3>
              <div className="space-y-2">
                {onlineCount > 0 ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-green-400"></div>
                    <span className="text-gray-100 text-sm flex-1 min-w-0 truncate">{displayName} (You)</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    {authenticated ? "No other users online" : "Connecting..."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;