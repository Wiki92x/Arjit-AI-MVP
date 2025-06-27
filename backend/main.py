import os
import fitz  # PyMuPDF
from uuid import uuid4
from fastapi import FastAPI, UploadFile, File, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
from dotenv import load_dotenv
import re
from collections import Counter
import time
from typing import Dict, List, Optional
import json
import jwt
import asyncio
from fastapi.responses import StreamingResponse

load_dotenv()
OPENROUTER_KEY = os.getenv("OPENROUTER_API_KEY")

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://askaipdf.netlify.app",  # This looks correct
        os.getenv("FRONTEND_URL", ""),  # This might be empty
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Store text chunks directly without embeddings
session_store = {}

class Message(BaseModel):
    role: str
    content: str
    timestamp: Optional[float] = None

class ChatRequest(BaseModel):
    session_id: str
    question: str = None
    query: str = None
    model: str = "openai/gpt-4"  # Default model
    temperature: float = 0.7     # Default temperature

def preprocess_text(text):
    # Convert to lowercase and remove punctuation
    text = re.sub(r'[^\w\s]', '', text.lower())
    return text

def get_text_similarity(query, text):
    # Simple keyword matching similarity
    query_words = set(preprocess_text(query).split())
    text_words = preprocess_text(text).split()
    
    # Count occurrences of query words in text
    word_count = Counter(text_words)
    matches = sum(word_count[word] for word in query_words if word in word_count)
    
    return matches

# Simple JWT verification
async def get_current_user(authorization: str = Header(None)) -> str:
    if not authorization or not authorization.startswith('Bearer '):
        raise HTTPException(
            status_code=401,
            detail="Not authenticated"
        )
    
    token = authorization.replace('Bearer ', '')
    
    try:
        # In a real app, you'd verify with Firebase Admin SDK
        payload = jwt.decode(token, options={"verify_signature": False})
        user_id = payload.get("user_id")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
        return user_id
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid token")

@app.post("/upload")
async def upload(file: UploadFile = File(...)):
    try:
        pdf_bytes = await file.read()
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        full_text = "\n".join(page.get_text() for page in doc)

        # Split into chunks
        chunks = [full_text[i:i+1000] for i in range(0, len(full_text), 1000)]
        
        session_id = str(uuid4())
        # Store both chunks and metadata
        session_store[session_id] = {
            "chunks": chunks,
            "filename": file.filename,
            "upload_time": time.time(),
            "messages": []  # Initialize empty message history
        }
        print("Session created:", session_id)
        return {"session_id": session_id, "filename": file.filename}
    except Exception as e:
        print("Upload error:", str(e))
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")

@app.post("/chat-with-pdf")
async def chat_with_pdf(req: ChatRequest):
    session = session_store.get(req.session_id)
    if not session:
        return {"reply": "Session not found."}

    # Get chunks from updated structure
    chunks = session["chunks"]
    
    # Find most relevant chunks using text similarity
    question = req.question or req.query
    scored_chunks = [(chunk, get_text_similarity(question, chunk)) for chunk in chunks]
    top_chunks = sorted(scored_chunks, key=lambda x: x[1], reverse=True)[:3]
    
    context = "\n".join(chunk for chunk, score in top_chunks)
    prompt = f"Answer the question based on the following:\n\n{context}\n\nQuestion: {question}"

    # Store user message in history
    user_message = Message(role="user", content=question, timestamp=time.time())
    session["messages"].append(user_message.dict())

    async with httpx.AsyncClient(timeout=60.0) as client:
        res = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_KEY}",
                "Content-Type": "application/json",
                "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),  # Use environment variable
                "X-Title": "AskAI Chat"
            },
            json={
                "model": req.model,
                "temperature": req.temperature,
                "messages": [{"role": "user", "content": prompt}]
            }
        )
        reply = res.json()["choices"][0]["message"]["content"]
        
        # Store assistant message in history
        assistant_message = Message(role="assistant", content=reply, timestamp=time.time())
        session["messages"].append(assistant_message.dict())
        
        return {"reply": reply}

@app.get("/chat-with-pdf/stream")  # Changed from @app.post to @app.get
async def chat_with_pdf_stream(
    session_id: str,  # Changed from req: ChatRequest to query params
    question: str = None, 
    query: str = None,
    model: str = "openai/gpt-4",
    temperature: float = 0.7
):
    session = session_store.get(session_id)
    if not session:
        return {"reply": "Session not found."}

    # Get chunks from updated structure
    chunks = session["chunks"]
    
    # Find most relevant chunks using text similarity
    question = question or query
    scored_chunks = [(chunk, get_text_similarity(question, chunk)) for chunk in chunks]
    top_chunks = sorted(scored_chunks, key=lambda x: x[1], reverse=True)[:3]
    
    context = "\n".join(chunk for chunk, score in top_chunks)
    prompt = f"Answer the question based on the following:\n\n{context}\n\nQuestion: {question}"

    # Store user message in history
    user_message = Message(role="user", content=question, timestamp=time.time())
    session["messages"].append(user_message.dict())
    
    async def generate():
        # SSE format: "data: {payload}\n\n"
        yield f"data: {json.dumps({'type': 'start'})}\n\n"
        
        # Send context info
        context_data = json.dumps({
            'type': 'context',
            'chunks': [chunk[:100] + "..." for chunk, _ in top_chunks]  # Preview first 100 chars
        })
        yield f"data: {context_data}\n\n"
        
        # Start real streaming
        async with httpx.AsyncClient(timeout=60.0) as client:
            async with client.stream(
                "POST",
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENROUTER_KEY}",
                    "Content-Type": "application/json",
                    "HTTP-Referer": os.getenv("FRONTEND_URL", "http://localhost:3000"),  # Use environment variable
                    "X-Title": "AskAI Chat"
                },
                json={
                    "model": model,
                    "temperature": temperature,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": True  # Enable streaming
                },
            ) as response:
                accumulated_response = ""
                
                async for chunk in response.aiter_lines():
                    if chunk.startswith("data: "):
                        chunk = chunk[6:]  # Remove "data: " prefix
                    
                    if chunk == "[DONE]" or not chunk.strip():
                        continue
                        
                    try:
                        chunk_data = json.loads(chunk)
                        delta = chunk_data.get("choices", [{}])[0].get("delta", {}).get("content", "")
                        if delta:
                            accumulated_response += delta
                            yield f"data: {json.dumps({'type': 'token', 'token': delta})}\n\n"
                            await asyncio.sleep(0.01)  # Small delay to avoid overwhelming the client
                    except json.JSONDecodeError:
                        continue
                
                # Store the complete response in chat history
                assistant_message = Message(role="assistant", content=accumulated_response, timestamp=time.time())
                session["messages"].append(assistant_message.dict())
                
                # Signal completion
                yield f"data: {json.dumps({'type': 'end'})}\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream"
    )

@app.post("/chat")
async def chat(req: ChatRequest):
    # Map query to question if needed
    if req.query and not req.question:
        req.question = req.query
    # Call the existing chat-with-pdf endpoint
    return await chat_with_pdf(req)

# Endpoint to get chat history
@app.get("/history/{session_id}")
async def get_history(session_id: str):
    session = session_store.get(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "messages": session.get("messages", []),
        "filename": session.get("filename", "Unknown")
    }

# Add endpoint to get user's sessions
@app.get("/sessions")
async def get_user_sessions():
    user_sessions = []
    for session_id, session in session_store.items():
        user_sessions.append({
            "session_id": session_id,
            "filename": session.get("filename", "Unnamed document"),
            "upload_time": session.get("upload_time"),
            "message_count": len(session.get("messages", [])) // 2  # Pair of user/assistant messages
        })
    
    return {"sessions": sorted(user_sessions, key=lambda s: s["upload_time"], reverse=True)}