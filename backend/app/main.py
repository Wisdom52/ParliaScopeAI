from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback
import time

from app.core.logger import logger
from app.routes import auth, ingest, chat, audio, search, location, docs, subscriptions, bills, representatives, representatives_stance, baraza, fact_shield, admin, admin_leader
from app.routes.ingest import perform_hansard_crawl
from app.database import SessionLocal, engine, Base
import app.models # Trigger models registration
from fastapi.staticfiles import StaticFiles
import asyncio

# Create tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="ParliaScope API")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Exception at {request.url}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal Server Error", "error": str(exc)},
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allow all for development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def audit_log_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    
    # Audit log format: [IP] Method Path - Status (Time ms)
    client_ip = request.client.host if request.client else "Unknown"
    logger.info(f"Audit: {client_ip} {request.method} {request.url.path} - {response.status_code} ({process_time:.3f}s)")
    
    return response

app.include_router(auth.router)
app.include_router(ingest.router)
app.include_router(chat.router)
app.include_router(audio.router)
app.include_router(search.router)
app.include_router(location.router)
app.include_router(docs.router)
app.include_router(subscriptions.router)
app.include_router(bills.router)
app.include_router(representatives.router)
app.include_router(representatives_stance.router)
app.include_router(baraza.router)
app.include_router(fact_shield.router)
app.include_router(admin.router)
app.include_router(admin_leader.router)

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.on_event("startup")
async def startup_event():
    # Trigger Hansard crawl in the background
    async def run_crawl():
        db = SessionLocal()
        try:
            await perform_hansard_crawl(db, limit=6, ai_parsing=True)
        finally:
            db.close()
    
    # Run without blocking the startup
    asyncio.create_task(run_crawl())

@app.get("/")
async def root():
    return {"message": "ParliaScope Backend API is running"}
