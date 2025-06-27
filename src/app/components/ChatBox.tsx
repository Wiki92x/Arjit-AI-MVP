import { useEffect, useRef, useState } from 'react';
import { config } from '../../config';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp?: number;
}

// Models available in OpenRouter
const AVAILABLE_MODELS = [
  { id: 'openai/gpt-4', name: 'GPT-4' },
  { id: 'openai/gpt-4o', name: 'GPT-4o' },
  { id: 'openai/gpt-3.5-turbo', name: 'GPT-3.5' },
  { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus' },
  { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet' },
  { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku' },
];

export default function ChatBox({ sessionId, pdfName }: { sessionId: string; pdfName: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(AVAILABLE_MODELS[0].id);
  const [temperature, setTemperature] = useState(0.7);
  const [error, setError] = useState<string | null>(null);
  const [lastQuestion, setLastQuestion] = useState<string>('');
  const [streamingMessage, setStreamingMessage] = useState<string>('');
  const [contextChunks, setContextChunks] = useState<string[]>([]);
  const [showContextPreview, setShowContextPreview] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Auto-scroll chat on new messages
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, streamingMessage]);

  // Cleanup event source on unmount
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, []);

  // Load chat history on initial load
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const res = await fetch(`${config.apiUrl}/history/${sessionId}`);
        if (res.ok) {
          const data = await res.json();
          setMessages(data.messages || []);
        }
      } catch (error) {
        console.error("Failed to load chat history:", error);
      }
    };
    
    if (sessionId) {
      loadHistory();
    }
  }, [sessionId]);

  const handleSend = async (retryQuestion?: string) => {
    const questionToSend = retryQuestion || input;
    if (!questionToSend.trim()) return;

    if (!retryQuestion) {
      // Only set these for new questions, not retries
      const userMsg: Message = { role: 'user', content: questionToSend };
      setMessages((prev) => [...prev, userMsg]);
      setLastQuestion(questionToSend);
      setInput('');
    }
    
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${config.apiUrl}/chat-with-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: sessionId,
          question: questionToSend,
          model: selectedModel,
          temperature: temperature
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.reply || 'No response received.',
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (error) {
      console.error("API error:", error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      // Don't add error message to chat, show retry UI instead
    } finally {
      setLoading(false);
    }
  };

  const handleStreamingChat = async () => {
    if (!input.trim()) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);
    setStreamingMessage('');
    setError(null);
    setContextChunks([]);
    setLastQuestion(input);
    const currentInput = input;
    setInput('');

    // Close any existing event source
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
    }

    try {
      const eventSource = new EventSource(
        `${config.apiUrl}/chat-with-pdf/stream?` + 
        `session_id=${encodeURIComponent(sessionId)}&` +
        `question=${encodeURIComponent(currentInput)}&` +
        `model=${encodeURIComponent(selectedModel)}&` +
        `temperature=${encodeURIComponent(temperature.toString())}`
      );
      
      eventSourceRef.current = eventSource;

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data);
        
        if (data.type === 'start') {
          // Chat started
        } else if (data.type === 'context') {
          // Received context chunks
          setContextChunks(data.chunks);
          setShowContextPreview(true);
        } else if (data.type === 'token') {
          // Received a new token
          setStreamingMessage(prev => prev + data.token);
        } else if (data.type === 'end') {
          // Streaming completed
          eventSource.close();
          eventSourceRef.current = null;
          setLoading(false);
          
          // Add the complete message to the history - use the full message from the server if available
          const completeMessage = data.fullMessage || streamingMessage;
          const assistantMsg: Message = {
            role: 'assistant',
            content: completeMessage,
          };
          setMessages(prev => [...prev, assistantMsg]);
          setStreamingMessage('');
        }
      };
      
      eventSource.onerror = (error) => {
        console.error('SSE Error:', error);
        eventSource.close();
        eventSourceRef.current = null;
        setLoading(false);
        setError('Stream connection error. Please try again.');
      };
      
    } catch (error) {
      console.error("Streaming error:", error);
      setLoading(false);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
    }
  };

  return (
    <div className="w-full">
      {/* Model settings section */}
      <div className="mb-4 p-3 bg-gray-800 rounded-lg">
        <div className="flex flex-col md:flex-row justify-between items-center gap-3">
          <div className="w-full md:w-1/2">
            <label className="block text-sm mb-1">PDF: <span className="font-semibold">{pdfName}</span></label>
            <select 
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="w-full p-2 bg-gray-700 rounded text-white"
            >
              {AVAILABLE_MODELS.map(model => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>
          
          <div className="w-full md:w-1/2">
            <label className="block text-sm mb-1">
              Temperature: {temperature.toFixed(1)} 
              <span className="text-xs ml-1 text-gray-400">
                ({temperature < 0.4 ? 'Precise' : temperature > 0.7 ? 'Creative' : 'Balanced'})
              </span>
            </label>
            <input 
              type="range" 
              min="0.1" 
              max="1.0" 
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Chat area */}
      <div ref={chatRef} className="h-[50vh] overflow-y-auto bg-gray-800 p-4 rounded-xl mb-4 scroll-smooth">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center py-10">
            Ask a question about the uploaded PDF
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`mb-4 ${
                msg.role === 'user' ? 'text-right' : 'text-left'
              }`}
            >
              <div 
                className={`inline-block px-4 py-2 rounded-lg max-w-[80%] ${
                  msg.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-700 text-green-300'
                }`}
              >
                {msg.content}
              </div>
              {msg.timestamp && (
                <div className="text-xs text-gray-500 mt-1">
                  {new Date(msg.timestamp * 1000).toLocaleTimeString()}
                </div>
              )}
            </div>
          ))
        )}

        {streamingMessage && (
          <div className="text-left mb-4">
            <div className="inline-block px-4 py-2 rounded-lg bg-gray-700 text-green-300">
              <div className="relative">
                {showContextPreview && contextChunks.length > 0 && (
                  <div className="absolute top-0 right-0">
                    <button 
                      onClick={() => setShowContextPreview(!showContextPreview)}
                      className="text-xs bg-blue-700 hover:bg-blue-600 p-1 rounded"
                    >
                      {showContextPreview ? 'Hide Context' : 'Show Context'}
                    </button>
                    
                    {showContextPreview && (
                      <div className="mt-1 p-2 bg-gray-800 rounded text-xs max-w-xs max-h-40 overflow-y-auto">
                        <p className="font-bold mb-1">AI is using these sections:</p>
                        {contextChunks.map((chunk, i) => (
                          <div key={i} className="mb-1 pb-1 border-b border-gray-700">
                            {chunk}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {streamingMessage}
                <span className="animate-pulse">▌</span>
              </div>
            </div>
          </div>
        )}

        {loading && !streamingMessage && (
          <div className="text-left mb-4">
            <div className="inline-block px-4 py-2 rounded-lg bg-gray-700">
              <div className="flex items-center gap-2">
                <div className="animate-pulse text-green-300">AI is thinking...</div>
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-green-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="text-center my-4">
            <div className="bg-red-900/50 text-red-200 p-3 rounded-lg inline-block">
              <p className="mb-2">Error: {error}</p>
              <button 
                onClick={() => handleSend(lastQuestion)}
                className="bg-red-700 hover:bg-red-600 text-white px-4 py-2 rounded-md"
              >
                Retry
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Input area */}
      <div className="flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleStreamingChat()}
          className="flex-1 p-3 rounded bg-gray-700 text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="Ask a question about the PDF..."
        />
        <button 
          onClick={handleStreamingChat}
          disabled={loading || !input.trim()}
          className="bg-blue-600 px-6 py-3 text-white rounded font-medium hover:bg-blue-700 disabled:opacity-50 transition"
        >
          Send
        </button>
      </div>
    </div>
  );
}
