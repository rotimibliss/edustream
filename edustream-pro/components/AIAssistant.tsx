
import React, { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';
import { askGemini } from '../services/geminiService';

const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hello Principal! I am your AI assistant. How can I help you today? I can draft parent emails, analyze attendance trends, or help with lesson planning.', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: ChatMessage = { role: 'user', content: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    const response = await askGemini(input);
    
    const assistantMsg: ChatMessage = { role: 'assistant', content: response, timestamp: new Date() };
    setMessages(prev => [...prev, assistantMsg]);
    setIsLoading(false);
  };

  return (
    <div className="h-full flex flex-col p-8 bg-gray-50 max-h-[calc(100vh-64px)]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Admin AI Copilot</h1>
        <p className="text-sm text-gray-500">Your intelligent assistant for school management tasks.</p>
      </div>

      <div className="flex-1 bg-white rounded-3xl shadow-xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                msg.role === 'user' 
                  ? 'bg-indigo-600 text-white rounded-br-none' 
                  : 'bg-gray-100 text-gray-800 rounded-bl-none'
              }`}>
                <div className="whitespace-pre-wrap leading-relaxed text-sm">{msg.content}</div>
                <div className={`text-[10px] mt-1 opacity-60 ${msg.role === 'user' ? 'text-right' : 'text-left'}`}>
                  {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 rounded-2xl px-5 py-4 rounded-bl-none flex space-x-2 items-center">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.3s]"></div>
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-.5s]"></div>
              </div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-6 bg-gray-50 border-t border-gray-100">
          <div className="relative flex items-center bg-white rounded-2xl border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-500 shadow-sm transition-all px-2">
            <textarea
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask me to draft an email, analyze student trends, etc..."
              className="flex-1 px-4 py-4 bg-transparent outline-none resize-none text-sm"
            />
            <button 
              onClick={handleSend}
              disabled={isLoading || !input.trim()}
              className="bg-indigo-600 text-white p-3 rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-colors ml-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path>
              </svg>
            </button>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
             <button 
               onClick={() => setInput("Draft an email to parents about upcoming final exams.")}
               className="text-[10px] font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors text-gray-600"
             >
               Draft Exam Email
             </button>
             <button 
               onClick={() => setInput("Suggest 3 improvement steps for students with low math grades.")}
               className="text-[10px] font-bold bg-white border border-gray-200 px-3 py-1.5 rounded-full hover:bg-gray-50 transition-colors text-gray-600"
             >
               Improvement Plan
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIAssistant;
