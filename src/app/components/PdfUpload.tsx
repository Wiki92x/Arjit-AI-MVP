'use client';
import { useState } from 'react';
import { config } from '../../config';

interface Props {
  onSessionIdAction: (id: string, filename: string) => void;
}

export default function PdfUpload({ onSessionIdAction }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState('');
  const [uploading, setUploading] = useState(false);

  const upload = async () => {
    if (!file) return;
    setUploading(true);
    setStatus('Uploading...');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${config.apiUrl}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed: ${res.status}`);
      }

      const data = await res.json();
      console.log("Received session:", data.session_id);
      onSessionIdAction(data.session_id, file.name);
      setStatus('Upload successful');
    } catch (error) {
      console.error("Upload error:", error);
      setStatus('Upload failed: ' + (error instanceof Error ? error.message : String(error)));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="w-full p-6 bg-gray-800 rounded-xl shadow-md">
      <h2 className="text-xl font-semibold mb-4">Upload a PDF to chat with</h2>
      
      <div className="mb-4">
        <label className="block text-sm font-medium mb-2">Select PDF document</label>
        <input 
          type="file" 
          accept=".pdf" 
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="w-full p-2 border border-gray-600 rounded bg-gray-700 text-white"
        />
        {file && <p className="mt-2 text-sm text-gray-300">Selected: {file.name}</p>}
      </div>
      
      <button 
        onClick={upload} 
        disabled={!file || uploading}
        className="w-full bg-green-600 text-white px-4 py-3 rounded hover:bg-green-700 disabled:opacity-50 transition"
      >
        {uploading ? 'Uploading...' : 'Upload PDF'}
      </button>
      
      {status && <p className={`mt-3 text-sm ${status.includes('failed') ? 'text-red-400' : 'text-green-400'}`}>{status}</p>}
    </div>
  );
}