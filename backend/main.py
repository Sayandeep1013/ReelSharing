import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from routes import notes, process

# ── Logging setup ──────────────────────────────────────────
# All modules use logging.getLogger(__name__).
# Render captures stdout so these appear in the Render log viewer.
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

app = FastAPI(title="ReelSharing API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url, "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(notes.router)
app.include_router(process.router)


@app.get("/health")
async def health():
    """Wake-up endpoint for cold start — frontend pings this on load."""
    return {"status": "ok"}


@app.get("/")
async def root():
    return {"message": "ReelSharing API"}
