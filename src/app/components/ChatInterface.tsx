'use client';

import { useState } from 'react';

type Message = { role: 'user' | 'bot'; text: string };

export default function ChatInterface() {
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);

  const sendMessage = async () => {
    if (!message.trim()) return;

    const userMessage: Message = { role: 'user', text: message };
    setMessages(prev => [...prev, userMessage]);
    setMessage('');

    try {
      const res = await fetch('http://localhost:8000/chat-with-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();
      const botMessage: Message = { role: 'bot', text: data.response || 'No response.' };
      setMessages(prev => [...prev, botMessage]);
    } catch {
      setMessages(prev => [...prev, { role: 'bot', text: 'Error: Could not reach the server.' }]);
    }
  };

  return (
    <div className="flex flex-col items-center justify-between min-h-screen bg-gray-950 px-4 py-6 text-white">
      <div className="w-full max-w-2xl bg-gray-900 rounded-xl shadow-lg p-6 flex flex-col gap-4 overflow-y-auto flex-1 border border-gray-800">
        <h1 className="text-3xl font-bold text-center mb-4 text-white">AskAI Chat</h1>
        <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh]">
          {messages.map((m, i) => (
            <div
              key={i}
              className={`px-4 py-2 rounded-lg w-fit max-w-[80%] ${
                m.role === 'user'
                  ? 'self-end bg-blue-600 text-white'
                  : 'self-start bg-gray-700 text-white'
              }`}
            >
              {m.text}
            </div>
          ))}
        </div>
      </div>

      <div className="w-full max-w-2xl mt-4 flex gap-2">
        <input
          type="text"
          value={message}
          onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          className="flex-1 px-4 py-3 rounded-lg bg-gray-800 border border-gray-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400 text-white placeholder-gray-400"
        />
        <button
          onClick={sendMessage}
          className="px-5 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-semibold"
        >
          Send
        </button>
      </div>
    </div>
  );
}