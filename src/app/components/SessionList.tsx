'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

interface Session {
  session_id: string;
  filename: string;
  upload_time: number;
  message_count: number;
}

export default function SessionList({ 
  onSelectSessionAction 
}: { 
  onSelectSessionAction: (sessionId: string, filename: string) => void 
}) {
  const { getIdToken } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSessions = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const token = await getIdToken();
        if (!token) {
          throw new Error('Not authenticated');
        }
        
        const res = await fetch('http://localhost:8000/sessions', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!res.ok) {
          throw new Error(`Failed to fetch sessions: ${res.status}`);
        }
        
        const data = await res.json();
        setSessions(data.sessions || []);
      } catch (err) {
        console.error('Error fetching sessions:', err);
        setError(err instanceof Error ? err.message : 'Failed to load sessions');
      } finally {
        setLoading(false);
      }
    };
    
    fetchSessions();
  }, [getIdToken]);

  if (loading) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gray-800 p-4 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
        <div className="bg-red-900/50 text-red-200 p-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 p-4 rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Your Documents</h2>
      
      {sessions.length === 0 ? (
        <p className="text-gray-400 text-center py-4">No documents uploaded yet</p>
      ) : (
        <ul className="space-y-2">
          {sessions.map((session) => (
            <li key={session.session_id} className="border border-gray-700 rounded-lg">
              <button
                onClick={() => onSelectSessionAction(session.session_id, session.filename)}
                className="w-full text-left p-3 hover:bg-gray-700 rounded-lg transition"
              >
                <p className="font-medium truncate">{session.filename}</p>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{new Date(session.upload_time * 1000).toLocaleDateString()}</span>
                  <span>{session.message_count} messages</span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
