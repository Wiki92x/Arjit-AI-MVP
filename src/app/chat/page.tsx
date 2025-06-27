'use client';
import { useState } from 'react';
import PdfUpload from '../components/PdfUpload';
import ChatBox from '../components/ChatBox';

export default function ChatPage() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pdfName, setPdfName] = useState<string>('Document');

  const handleUpload = (id: string, fileName: string) => {
    setSessionId(id);
    setPdfName(fileName);
  };

  return (
    <main className="min-h-screen bg-gray-900 text-white p-6 flex flex-col items-center">
      <h1 className="text-3xl font-bold mb-6">AskAI Chat</h1>
      
      {!sessionId ? (
        <div className="w-full max-w-xl">
          <PdfUpload onSessionIdAction={handleUpload} />
        </div>
      ) : (
        <div className="w-full max-w-3xl">
          <ChatBox sessionId={sessionId} pdfName={pdfName} />
        </div>
      )}
    </main>
  );
}