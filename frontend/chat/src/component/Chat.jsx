import React, { useState, useEffect, useRef } from "react";

function Chat() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [onlineCount, setOnlineCount] = useState(0);
  const [userName, setUserName] = useState("");
  const [hasSetName, setHasSetName] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState("Connecting...");
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const wsRef = useRef(null);

  // Connect to WebSocket server
  useEffect(() => {
    const connectWebSocket = () => {
      try {
        console.log('🔄 Attempting to connect to WebSocket server...');
        setConnectionStatus("Connecting...");
        
        const ws = new WebSocket('ws://localhost:8081');
        wsRef.current = ws;

        ws.onopen = () => {
          console.log('✅ Connected to WebSocket server');
          setIsConnected(true);
          setConnectionStatus("Connected");
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log('📥 Received message:', data);

            switch (data.type) {
              case 'connection':
                console.log('🎉 Connection established:', data.message);
                setConnectionStatus("Connected to server");
                break;
              
              case 'chat_message':
                console.log('💬 New chat message:', data);
                setMessages(prev => [...prev, {
                  id: data.id,
                  user: data.user,
                  message: data.message,
                  timestamp: new Date(data.timestamp)
                }]);
                break;
              
              case 'user_count':
                console.log('👥 User count update:', data.count);
                setOnlineCount(data.count);
                break;
              
              case 'typing_status':
                console.log('⌨️ Typing status:', data);
                // Handle typing indicators from other users
                break;
              
              default:
                console.log('❓ Unknown message type:', data.type);
            }
          } catch (error) {
            console.error('❌ Error parsing WebSocket message:', error);
          }
        };

        ws.onclose = (event) => {
          console.log('❌ WebSocket connection closed:', event.code, event.reason);
          setIsConnected(false);
          setConnectionStatus("Disconnected - Reconnecting...");
          // Attempt to reconnect after 3 seconds
          setTimeout(() => {
            console.log('🔄 Attempting to reconnect...');
            connectWebSocket();
          }, 3000);
        };

        ws.onerror = (error) => {
          console.error('💥 WebSocket error:', error);
          setIsConnected(false);
          setConnectionStatus("Connection failed");
        };
      } catch (error) {
        console.error('💥 Failed to create WebSocket connection:', error);
        setIsConnected(false);
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
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendWebSocketMessage = (message) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      console.log('📤 Sending message:', message);
      wsRef.current.send(JSON.stringify(message));
      return true;
    } else {
      console.log('❌ Cannot send message - WebSocket not connected');
      return false;
    }
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected || !hasSetName) return;

    const message = {
      type: 'chat_message',
      user: userName,
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
    
    if (!isTyping && hasSetName && isConnected) {
      setIsTyping(true);
      sendWebSocketMessage({
        type: 'typing_start'
      });
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      if (hasSetName && isConnected) {
        sendWebSocketMessage({
          type: 'typing_stop'
        });
      }
    }, 1000);
  };

  const handleSetName = (e) => {
    e.preventDefault();
    if (userName.trim() && isConnected) {
      setHasSetName(true);
      sendWebSocketMessage({
        type: 'user_info',
        userInfo: { name: userName.trim() }
      });
    }
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Show name input if not set
  if (!hasSetName) {
    return (
      <div className="min-h-screen bg-gray-900 text-gray-100 flex items-center justify-center">
        <div className="bg-gray-800 p-8 rounded-xl border border-gray-700 max-w-md w-full mx-4">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-purple-600 rounded-lg flex items-center justify-center mx-auto mb-4">
              <span className="text-white font-bold text-2xl">🚀</span>
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Join the Chat</h1>
            <p className="text-gray-400">Enter your name to start chatting</p>
          </div>
          
          <form onSubmit={handleSetName}>
            <div className="mb-4">
              <input
                type="text"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name..."
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-3 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                maxLength={20}
                required
              />
            </div>
            <button
              type="submit"
              disabled={!userName.trim() || !isConnected}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg font-medium transition-colors"
            >
              {isConnected ? 'Join Chat' : 'Connecting...'}
            </button>
          </form>
          
          <div className="mt-4 text-center">
            <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm ${
              isConnected ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full ${
                isConnected ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
              {connectionStatus}
            </span>
          </div>
          
          {/* Debug info */}
          <div className="mt-4 text-xs text-gray-500 text-center">
            <p>Debug: WebSocket State = {wsRef.current?.readyState || 'null'}</p>
            <p>Connecting to: ws://localhost:8081</p>
          </div>
        </div>
      </div>
    );
  }

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
            <div className="text-sm text-gray-400">
              Welcome, <span className="text-white font-medium">{userName}</span>!
            </div>
          </div>
          
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Real-Time Chat Demo</h1>
          <p className="text-gray-400 text-base lg:text-lg">
            Experience the power of WebSocket technology with this interactive chat application. 
            Connect, send messages, and see real-time updates in action.
          </p>
        </div>
      </header>

      {/* Features Section */}
      <section className="bg-gray-800 border-b border-gray-700 py-6 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">💬</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Real-Time Messaging</h3>
                <p className="text-gray-400 text-xs lg:text-sm">Instant message delivery with WebSocket connections</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">👥</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Live User Presence</h3>
                <p className="text-gray-400 text-xs lg:text-sm">See who's online and typing in real-time</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">⌨️</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Typing Indicators</h3>
                <p className="text-gray-400 text-xs lg:text-sm">Visual feedback when users are composing messages</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-gray-700 rounded-lg">
              <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">🔗</span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-white font-semibold mb-1 text-sm lg:text-base">Connection Status</h3>
                <p className="text-gray-400 text-xs lg:text-sm">Visual indicators for connection state management</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <main className="max-w-7xl mx-auto p-4 sm:p-6">
        <div className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
          {/* Connection Status */}
          <div className="bg-gray-700 p-4 border-b border-gray-600">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3 flex-wrap">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isConnected ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </div>
                <span className="text-gray-400 text-sm">
                  👥 {onlineCount} online
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
                    {!isConnected && (
                      <p className="text-red-400 text-sm mt-2">
                        ⚠️ Not connected to server. Check console for details.
                      </p>
                    )}
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.user === userName ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg break-words ${
                        msg.user === userName
                          ? 'bg-purple-600 text-white'
                          : 'bg-gray-700 text-gray-100'
                      }`}>
                        {msg.user !== userName && (
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
                    placeholder={isConnected ? "Type your message..." : "Connecting to server..."}
                    disabled={!isConnected}
                    className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!isConnected || !newMessage.trim()}
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
              <h3 className="text-white font-semibold mb-4">Online Users ({onlineCount})</h3>
              <div className="space-y-2">
                {onlineCount > 0 ? (
                  <div className="flex items-center gap-3 p-2 rounded-lg">
                    <div className="w-3 h-3 rounded-full flex-shrink-0 bg-green-400"></div>
                    <span className="text-gray-100 text-sm flex-1 min-w-0 truncate">{userName} (You)</span>
                  </div>
                ) : (
                  <div className="text-gray-500 text-sm">
                    {isConnected ? "No users online" : "Connecting..."}
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