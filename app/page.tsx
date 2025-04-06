'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import { FaBars } from 'react-icons/fa';

type Message = {
  role: 'user' | 'assistant';
  content: string;
  error?: boolean;
};

export default function Tutor() {
  const [input, setInput] = useState('');
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    transcript,
    listening,
    browserSupportsSpeechRecognition,
    resetTranscript
  } = useSpeechRecognition();

  useEffect(() => {
    setIsMounted(true);
    return () => window.speechSynthesis?.cancel();
  }, []);

  const speak = useCallback((text: string) => {
    if (!isMounted || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  }, [isMounted]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadedImage(e.target.files[0]);
    }
  };

  const handleVoice = useCallback(() => {
    if (listening) {
      SpeechRecognition.stopListening();
    } else {
      SpeechRecognition.startListening({ continuous: true, language: 'en-US' });
      resetTranscript();
    }
  }, [listening, resetTranscript]);

  const askGroq = useCallback(async () => {
    if (!input.trim() || !isMounted) return;

    setIsLoading(true);
    const userMessage: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');

    try {
      const formData = new FormData();
      formData.append('messages', JSON.stringify([...messages, userMessage]));
      if (uploadedImage) {
        formData.append('image', uploadedImage);
        setUploadedImage(null);
      }

      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText.includes('<!DOCTYPE') ? 'Server error' : errorText);
      }

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'AI processing failed');

      const assistantMessage = {
        role: 'assistant' as const,
        content: data.content || "I didn't get a response"
      };
      setMessages(prev => [...prev, assistantMessage]);
      speak(assistantMessage.content);
    } catch (error: any) {
      console.error('API Error:', error);
      const errorMessage = {
        role: 'assistant' as const,
        content: `Error: ${error.message}`,
        error: true
      };
      setMessages(prev => [...prev, errorMessage]);
      speak("Sorry, I encountered an error");
    } finally {
      setIsLoading(false);
    }
  }, [input, messages, isMounted, speak, uploadedImage]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (listening) setInput(transcript);
  }, [transcript, listening]);

  useEffect(() => {
    if (!listening && transcript.trim()) {
      askGroq();
    }
  }, [listening, transcript, askGroq]);

  if (!isMounted) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  if (!browserSupportsSpeechRecognition) return (
    <div className="min-h-screen flex items-center justify-center text-red-500">
      Your browser doesn't support speech recognition. Please use Chrome or Edge.
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white">
      
      {/* Sidebar */}
      <aside className={`bg-white dark:bg-gray-800 border-r dark:border-gray-700 p-4 transition-all duration-300 ease-in-out ${sidebarOpen ? 'w-64' : 'w-16'} flex flex-col`}>
        <div className="flex justify-between items-center mb-6">
          <div className="text-xl font-bold text-blue-600 dark:text-blue-300 whitespace-nowrap overflow-hidden">
            {sidebarOpen ? '🚀 QueryBot' : '🚀'}
          </div>
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-xl">
            <FaBars />
          </button>
        </div>

        {sidebarOpen && (
          <nav className="space-y-2">
            <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Home</button>
            <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">Settings</button>
            <button className="w-full text-left px-3 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-700">About</button>
          </nav>
        )}

        <button
          onClick={() => document.documentElement.classList.toggle('dark')}
          className="mt-auto px-4 py-2 bg-gray-200 dark:bg-gray-600 text-gray-800 dark:text-white rounded"
        >
          Toggle Theme
        </button>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col p-4 max-w-3xl mx-auto">
        {/* Chat Box */}
        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {messages.map((msg, idx) => (
            <div key={idx} className={`p-3 rounded-lg ${
              msg.error ? 'bg-red-100 text-red-800' :
              msg.role === 'user' ? 'bg-blue-100 dark:bg-blue-800' : 'bg-green-100 dark:bg-green-800'
            }`}>
              {msg.content}
            </div>
          ))}
          {isLoading && <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">Thinking...</div>}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="space-y-2">
          <div className="flex flex-col gap-2 md:flex-row">
            <label htmlFor="file-upload" className="w-full md:w-auto cursor-pointer border-2 border-dashed rounded-lg p-3 text-center text-sm bg-white dark:bg-gray-800">
              📁 Upload Image
              <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" id="file-upload" />
              {uploadedImage && <p className="text-green-500 text-xs truncate mt-1">✅ {uploadedImage.name}</p>}
            </label>

            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && !isLoading && askGroq()}
              placeholder="Ask a question..."
              className="flex-1 p-2 border rounded dark:bg-gray-800"
              disabled={isLoading}
            />

            <button
              onClick={handleVoice}
              className={`rounded-full w-12 h-12 flex items-center justify-center ${
                listening ? 'bg-red-500 animate-pulse' : 'bg-blue-500 hover:bg-blue-600'
              } text-white`}
              disabled={isLoading}
            >
              {listening ? '🛑' : '🎤'}
            </button>
          </div>

          <button
            onClick={askGroq}
            disabled={isLoading || !input.trim()}
            className="w-full bg-green-500 hover:bg-green-600 text-white p-3 rounded-lg disabled:bg-gray-400"
          >
            {isLoading ? 'Processing...' : 'Ask QueryBot'}
          </button>
        </div>
      </main>
    </div>
  );
}
