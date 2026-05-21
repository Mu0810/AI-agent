import sqlite3
import json
import os
import shutil
from datetime import datetime
from pathlib import Path

from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI, UploadFile, File, Form, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from backend.agents.reasoning import ReasoningAgent, db, CUSTOM_COMMANDS
from backend.tools.advanced import analyze_image, read_pdf, query_document as query_doc_fn

# ===== Rate Limiter =====
limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="NEXUS Agent API", version="3.2.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ===== CORS =====
FRONTEND_URL = os.getenv("FRONTEND_URL", "*")
IS_PRODUCTION = os.getenv("PRODUCTION", "false").lower() == "true"

if IS_PRODUCTION and FRONTEND_URL != "*":
    # Split by comma in case multiple URLs are provided
    raw_origins = [o.strip() for o in FRONTEND_URL.split(",") if o.strip()]
    origins = []
    for origin in raw_origins:
        origins.append(origin)
        if not origin.startswith("http://") and not origin.startswith("https://"):
            origins.append(f"https://{origin}")
            origins.append(f"http://{origin}")
else:
    origins = ["*"]

# Browser security rules: allow_credentials cannot be True when allow_origins is ["*"]
allow_credentials = False if "*" in origins else True

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=allow_credentials,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/tmp/nexus_uploads"))
UPLOAD_DIR.mkdir(exist_ok=True)

agents = {}

class ChatRequest(BaseModel):
    message: str
    user_id: str = "default"
    conversation_id: str = "default"

@app.get("/api/health")
async def health():
    """Health check endpoint for frontend connectivity detection."""
    return {
        "status": "ok",
        "provider": os.getenv("AI_PROVIDER", "ollama"),
        "model": os.getenv("AI_MODEL", "qwen2.5:7b"),
        "timestamp": datetime.now().isoformat(),
    }

@app.post("/api/chat")
@limiter.limit("20/minute")
async def chat(req: ChatRequest, request: Request):
    key = f"{req.user_id}:{req.conversation_id}"
    if key not in agents:
        agents[key] = ReasoningAgent(req.user_id, req.conversation_id)
    result, steps = agents[key].run(req.message)
    return {"response": result, "steps": steps, "conversation_id": req.conversation_id}

@app.post("/api/stream")
@limiter.limit("20/minute")
async def stream_chat(req: ChatRequest, request: Request):
    """Streaming chat endpoint using Server-Sent Events."""
    key = f"{req.user_id}:{req.conversation_id}"
    if key not in agents:
        agents[key] = ReasoningAgent(req.user_id, req.conversation_id)
    
    agent = agents[key]
    
    def event_generator():
        try:
            for event in agent.run_streaming(req.message):
                yield f"data: {json.dumps(event)}\n\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"
            yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        }
    )

@app.post("/api/upload/image")
@limiter.limit("10/minute")
async def upload_image(request: Request, file: UploadFile = File(...), prompt: str = Form("Describe this image in detail.")):
    filepath = UPLOAD_DIR / file.filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    result = analyze_image(str(filepath), prompt)
    return {"filename": file.filename, "analysis": result}

@app.post("/api/upload/pdf")
@limiter.limit("10/minute")
async def upload_pdf(request: Request, file: UploadFile = File(...)):
    filepath = UPLOAD_DIR / file.filename
    with open(filepath, "wb") as f:
        shutil.copyfileobj(file.file, f)
    text = read_pdf(str(filepath))
    return {"filename": file.filename, "text": text[:3000], "pages": text.count('\n') // 50 + 1}

@app.post("/api/query/document")
@limiter.limit("20/minute")
async def query_document_endpoint(request: Request, text: str = Form(...), question: str = Form(...)):
    """Query a document with a question."""
    result = query_doc_fn(text, question)
    return {"answer": result}

@app.get("/api/conversations")
async def get_conversations(user_id: str = "default"):
    db.create_user(user_id)
    return db.get_all_conversations_with_preview(user_id)

@app.get("/api/analytics")
async def get_analytics(user_id: str = "default"):
    return {"usage": db.get_usage_stats(user_id), "events": db.get_analytics(user_id)}

@app.get("/api/knowledge")
async def get_knowledge(user_id: str = "default", query: str = ""):
    return db.search_knowledge(user_id, query)

@app.post("/api/knowledge")
async def save_knowledge(user_id: str = "default", key: str = "", value: str = "", category: str = "general"):
    db.save_knowledge(user_id, key, value, category)
    return {"status": "saved"}

@app.delete("/api/knowledge/{key_id}")
async def delete_knowledge(key_id: int, user_id: str = "default"):
    """Delete knowledge entry by integer row ID."""
    db.delete_knowledge(key_id, user_id)
    return {"status": "deleted"}

@app.post("/api/reset")
async def reset(user_id: str = "default", conversation_id: str = "default"):
    key = f"{user_id}:{conversation_id}"
    if key in agents: agents[key].reset()
    return {"status": "ok"}

@app.get("/api/export/{conversation_id}")
async def export_chat(conversation_id: str, user_id: str = "default"):
    history = db.get_history(conversation_id, limit=1000)
    content = f"# NEXUS Chat Export\nExported: {datetime.now().strftime('%Y-%m-%d %H:%M')}\n\n---\n\n"
    for msg in history:
        role = "You" if msg["role"] == "user" else "NEXUS"
        content += f"## {role}\n{msg['content']}\n\n---\n\n"
    filepath = f"/tmp/chat_{conversation_id}.md"
    with open(filepath, "w") as f: f.write(content)
    return FileResponse(filepath, filename=f"chat_{conversation_id}.md")

@app.get("/api/commands")
async def get_commands():
    return {"commands": CUSTOM_COMMANDS}

@app.delete("/api/conversations/{conv_id}")
async def delete_conversation(conv_id: str, user_id: str = "default"):
    """Delete a conversation and all its messages."""
    db.delete_conversation(conv_id, user_id)
    key = f"{user_id}:{conv_id}"
    if key in agents:
        del agents[key]
    return {"status": "deleted"}

@app.get("/api/conversations/{conv_id}/messages")
async def get_conversation_messages(conv_id: str, user_id: str = "default"):
    """Get message history for a specific conversation."""
    messages = db.get_history(conv_id, limit=100)
    return {"messages": messages, "conversation_id": conv_id}

@app.post("/api/conversations/{conv_id}/regenerate")
@limiter.limit("10/minute")
async def regenerate_last(conv_id: str, req: ChatRequest, request: Request):
    """Regenerate the last assistant response."""
    db.delete_last_assistant_message(conv_id)
    key = f"{req.user_id}:{conv_id}"
    if key not in agents:
        agents[key] = ReasoningAgent(req.user_id, conv_id)
    agent = agents[key]
    if agent.messages and agent.messages[-1].get('role') == 'assistant':
        agent.messages.pop()
    result, steps = agent.run(req.message)
    return {"response": result, "steps": steps}

# ===== Run with: uvicorn backend.api.main:app --host 0.0.0.0 --port $PORT =====
if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", 8000))
    uvicorn.run("backend.api.main:app", host="0.0.0.0", port=port, reload=not IS_PRODUCTION)
