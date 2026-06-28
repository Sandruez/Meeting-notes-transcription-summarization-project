import logging
import os
import time

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

from database import engine, Base

load_dotenv()

# Create tables on startup (idempotent — seed.py drops & recreates separately).
Base.metadata.create_all(bind=engine)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("fireflies")

app = FastAPI(title="Fireflies Clone API", version="1.0.0")

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")
ALLOWED_ORIGINS = list({FRONTEND_URL, "http://localhost:3000", "http://127.0.0.1:3000"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def log_requests(request: Request, call_next):
    start = time.time()
    response = await call_next(request)
    latency_ms = (time.time() - start) * 1000
    logger.info(
        "%s %s -> %d (%.1fms)",
        request.method,
        request.url.path,
        response.status_code,
        latency_ms,
    )
    return response


from routers import meetings, action_items, summaries, ai, search

app.include_router(meetings.router, prefix="/api")
app.include_router(action_items.router, prefix="/api")
app.include_router(summaries.router, prefix="/api")
app.include_router(ai.router, prefix="/api")
app.include_router(search.router, prefix="/api")


@app.get("/health")
async def health_check():
    from services.ai_service import ai_enabled

    return {"status": "ok", "version": "1.0.0", "ai_enabled": ai_enabled()}
