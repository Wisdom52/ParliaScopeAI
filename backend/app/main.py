from fastapi import FastAPI

app = FastAPI(title="ParliaScope API")

@app.get("/")
async def root():
    return {"message": "ParliaScope Backend API is running"}
