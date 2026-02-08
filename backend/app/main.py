from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routes import auth, ingest

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

@app.get("/")
async def root():
    return {"message": "ParliaScope Backend API is running"}
