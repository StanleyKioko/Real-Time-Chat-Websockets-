import React, { useState, useEffect, useRef } from "react";

// Mock data for demonstration
const MOCK_USERS = [
  { id: 1, name: "Alice", isOnline: true, isTyping: false },
  { id: 2, name: "Bob", isOnline: true, isTyping: false },
  { id: 3, name: "Charlie", isOnline: false, isTyping: false },
  { id: 4, name: "Diana", isOnline: true, isTyping: true },
];

const MOCK_MESSAGES = [
  { id: 1, user: "Alice", message: "Hey everyone! How's it going?", timestamp: new Date(Date.now() - 300000) },
  { id: 2, user: "Bob", message: "Great! Just working on some new features.", timestamp: new Date(Date.now() - 240000) },
  { id: 3, user: "You", message: "Same here! This WebSocket integration is pretty cool.", timestamp: new Date(Date.now() - 180000) },
];

function Chat() {
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState(MOCK_MESSAGES);
  const [users, setUsers] = useState(MOCK_USERS);
  const [newMessage, setNewMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);

  // Mock WebSocket connection
  useEffect(() => {
    // Simulate connection delay
    const timer = setTimeout(() => {
      setIsConnected(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !isConnected) return;

    const message = {
      id: Date.now(),
      user: "You",
      message: newMessage,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, message]);
    setNewMessage("");
    setIsTyping(false);
  };

  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (!isTyping) {
      setIsTyping(true);
    }

    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
  };

  const handleConnect = () => {
    setIsConnected(true);
  };

  const formatTime = (timestamp) => {
    return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const onlineUsersCount = users.filter(user => user.isOnline).length;
  const typingUsers = users.filter(user => user.isTyping);

  return (
    <div className="min-h-screen bg-dark-100 text-dark-900">
      {/* Header */}
      <header className="bg-dark-200 border-b border-dark-300 p-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">🚀</span>
              </div>
              <span className="text-primary-400 text-sm font-medium">WebSocket Showcase</span>
            </div>
          </div>
          
          <h1 className="text-4xl font-bold text-white mb-2">Real-Time Chat Demo</h1>
          <p className="text-dark-700 text-lg">
            Experience the power of WebSocket technology with this interactive chat application. 
            Connect, send messages, and see real-time updates in action.
          </p>
        </div>
      </header>

      {/* Features Section */}
      <section className="bg-dark-200 border-b border-dark-300 py-8">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">💬</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Real-Time Messaging</h3>
                <p className="text-dark-700 text-sm">Instant message delivery with WebSocket connections</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">👥</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Live User Presence</h3>
                <p className="text-dark-700 text-sm">See who's online and typing in real-time</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">⌨️</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Typing Indicators</h3>
                <p className="text-dark-700 text-sm">Visual feedback when users are composing messages</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center flex-shrink-0 mt-1">
                <span className="text-white text-sm">🔗</span>
              </div>
              <div>
                <h3 className="text-white font-semibold mb-1">Connection Status</h3>
                <p className="text-dark-700 text-sm">Visual indicators for connection state management</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Chat Interface */}
      <main className="max-w-6xl mx-auto p-6">
        <div className="bg-dark-200 rounded-xl border border-dark-300 overflow-hidden">
          {/* Connection Status */}
          <div className="bg-dark-300 p-4 border-b border-dark-400">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
                  isConnected ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    isConnected ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
                </div>
                <span className="text-dark-700">
                  👥 {onlineUsersCount} online
                </span>
              </div>
              
              {!isConnected && (
                <button
                  onClick={handleConnect}
                  className="bg-primary-500 hover:bg-primary-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Connect
                </button>
              )}
            </div>
          </div>

          <div className="flex h-96">
            {/* Messages Area */}
            <div className="flex-1 flex flex-col">
              {/* Messages */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.user === 'You' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                      msg.user === 'You'
                        ? 'bg-primary-500 text-white'
                        : 'bg-dark-300 text-dark-900'
                    }`}>
                      {msg.user !== 'You' && (
                        <div className="text-xs font-medium mb-1 opacity-75">{msg.user}</div>
                      )}
                      <div className="text-sm">{msg.message}</div>
                      <div className="text-xs opacity-75 mt-1">{formatTime(msg.timestamp)}</div>
                    </div>
                  </div>
                ))}

                {/* Typing Indicators */}
                {typingUsers.length > 0 && (
                  <div className="flex justify-start">
                    <div className="bg-dark-300 text-dark-700 px-4 py-2 rounded-lg max-w-xs">
                      <div className="text-xs font-medium mb-1">
                        {typingUsers.map(user => user.name).join(', ')} 
                        {typingUsers.length === 1 ? ' is' : ' are'} typing
                      </div>
                      <div className="typing-indicator">
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                        <div className="typing-dot"></div>
                      </div>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-dark-400">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={handleTyping}
                    placeholder={isConnected ? "Type your message..." : "Connect to start chatting"}
                    disabled={!isConnected}
                    className="flex-1 bg-dark-300 border border-dark-400 rounded-lg px-4 py-2 text-dark-900 placeholder-dark-600 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <button
                    type="submit"
                    disabled={!isConnected || !newMessage.trim()}
                    className="bg-primary-500 hover:bg-primary-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-medium transition-colors"
                  >
                    Send
                  </button>
                </div>
                {isTyping && (
                  <div className="text-xs text-dark-600 mt-2">You are typing...</div>
                )}
              </form>
            </div>

            {/* Users Sidebar */}
            <div className="w-64 bg-dark-300 border-l border-dark-400 p-4">
              <h3 className="text-white font-semibold mb-4">Online Users ({onlineUsersCount})</h3>
              <div className="space-y-2">
                {users.map((user) => (
                  <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-dark-400 transition-colors">
                    <div className={`w-3 h-3 rounded-full ${
                      user.isOnline ? 'bg-green-400' : 'bg-gray-500'
                    }`}></div>
                    <span className="text-dark-900 text-sm">{user.name}</span>
                    {user.isTyping && (
                      <div className="ml-auto">
                        <div className="typing-indicator scale-75">
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                          <div className="typing-dot"></div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default Chat;