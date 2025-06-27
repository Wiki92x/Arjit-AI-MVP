'use client';

import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import PdfUpload from './components/PdfUpload';
import ChatBox from './components/ChatBox';
import Auth from './components/Auth';
import SessionList from './components/SessionList';

export default function Home() {
  const { user, loading } = useAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('Document');
  
  const handleFileUpload = (id: string, fileName: string = 'Document') => {
    setSessionId(id);
    setPdfName(fileName);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center">AskAI PDF Chat</h1>
        
        {!user ? (
          <Auth />
        ) : (
          <>
            {!sessionId ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-1">
                  <SessionList onSelectSessionAction={(id, name) => {
                    setSessionId(id);
                    setPdfName(name);
                  }} />
                </div>
                <div className="md:col-span-2">
                  <PdfUpload onSessionIdAction={handleFileUpload} />
                </div>
              </div>
            ) : (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl">{pdfName}</h2>
                  <button 
                    onClick={() => setSessionId(null)}
                    className="bg-gray-700 hover:bg-gray-600 px-3 py-1 rounded text-sm"
                  >
                    Back to Files
                  </button>
                </div>
                <ChatBox sessionId={sessionId} pdfName={pdfName} />
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
}