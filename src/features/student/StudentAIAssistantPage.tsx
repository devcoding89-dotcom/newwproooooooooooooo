import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, BookOpen, Sparkles } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import EmptyState from '../../components/ui/EmptyState';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: { doc: string; page: number; similarity: number }[];
  timestamp: Date;
}

const SUGGESTIONS = [
  'Explain binary trees with examples',
  'What are the differences between TCP and UDP?',
  'Summarize database normalization concepts',
  'How does recursion work?',
];

export default function StudentAIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (question?: string) => {
    const text = question || input.trim();
    if (!text || isLoading) return;
    setInput('');

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    // Simulated AI response (in production, calls /functions/v1/ai-chat)
    await new Promise((r) => setTimeout(r, 1500));
    const assistantMsg: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: `Based on your course materials, here is an explanation of "${text}":\n\nThis is a simulated AI response. In production, this would use the RAG pipeline with your uploaded course PDFs via OpenAI GPT-4 to provide accurate, source-cited answers from your specific course materials.\n\nThe response would include relevant citations from your lecture notes, textbooks, and other uploaded materials.`,
      sources: [
        { doc: 'Week 3 Lecture Notes', page: 14, similarity: 0.94 },
        { doc: 'Course Textbook Chapter 5', page: 87, similarity: 0.88 },
      ],
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, assistantMsg]);
    setIsLoading(false);
  };

  return (
    <DashboardLayout title="AI Revision Assistant" subtitle="Ask questions about your course materials">
      <div className="flex flex-col h-[calc(100vh-13rem)]">
        {messages.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-6">
            <div className="p-4 bg-primary-50 rounded-2xl mb-4">
              <Sparkles className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Ask me anything about your courses</h2>
            <p className="text-sm text-gray-500 mb-8 text-center max-w-md">
              I can answer questions based on your uploaded course materials and always cite my sources.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full max-w-lg">
              {SUGGESTIONS.map((s) => (
                <button key={s} onClick={() => handleSend(s)}
                  className="text-left px-4 py-3 bg-white border border-gray-100 shadow-sm rounded-xl hover:bg-gray-50 hover:border-gray-200 transition-all text-sm text-gray-700">
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto space-y-4 p-1 pb-2">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'assistant' && (
                  <div className="p-1.5 bg-primary-100 rounded-xl h-fit flex-shrink-0">
                    <Bot className="w-4 h-4 text-primary-600" />
                  </div>
                )}
                <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'bg-primary-600 text-white rounded-br-md'
                      : 'bg-white border border-gray-100 shadow-sm text-gray-800 rounded-bl-md'
                  }`}>
                    {msg.content}
                  </div>
                  {msg.sources && msg.sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {msg.sources.map((src, i) => (
                        <div key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-100 rounded-lg">
                          <BookOpen className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-[10px] text-blue-700 font-medium">{src.doc}, p.{src.page}</span>
                          <span className="text-[10px] text-blue-400">{Math.round(src.similarity * 100)}%</span>
                        </div>
                      ))}
                    </div>
                  )}
                  <span className="text-[10px] text-gray-400">{msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                {msg.role === 'user' && (
                  <div className="p-1.5 bg-gray-100 rounded-xl h-fit flex-shrink-0">
                    <User className="w-4 h-4 text-gray-600" />
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="flex gap-3">
                <div className="p-1.5 bg-primary-100 rounded-xl h-fit">
                  <Bot className="w-4 h-4 text-primary-600" />
                </div>
                <div className="bg-white border border-gray-100 shadow-sm rounded-2xl rounded-bl-md px-4 py-3">
                  <div className="flex gap-1.5 items-center">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Input */}
        <div className="flex gap-2.5 pt-3 border-t border-gray-100">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder="Ask a question about your course materials..."
            className="flex-1 input-field"
            disabled={isLoading}
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || isLoading}
            className="btn-primary px-4 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </DashboardLayout>
  );
}
