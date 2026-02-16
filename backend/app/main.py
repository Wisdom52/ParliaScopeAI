from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, ingest, chat, audio, search
from fastapi.staticfiles import StaticFiles

app = FastAPI(title="ParliaScope API")

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

app.mount("/static", StaticFiles(directory="static"), name="static")

@app.get("/")
async def root():
    return {"message": "ParliaScope Backend API is running"}
