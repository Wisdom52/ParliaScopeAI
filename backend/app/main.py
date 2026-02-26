from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import traceback

from app.routes import auth, ingest, chat, audio, search, location, docs, subscriptions, bills, representatives
from app.routes.ingest import perform_hansard_crawl
from app.database import SessionLocal
from fastapi.staticfiles import StaticFiles
import asyncio

app = FastAPI(title="ParliaScope API")

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    with open("error_log.txt", "a") as f:
        f.write(f"\n--- Exception at {request.url} ---\n")
        f.write(traceback.format_exc())
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
