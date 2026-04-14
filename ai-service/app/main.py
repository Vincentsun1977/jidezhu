from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.routes import router

app = FastAPI(title="记得住 AI Service", version="0.1.0")
app.include_router(router)
app.mount("/generated-audio", StaticFiles(directory="app/generated_audio"), name="generated-audio")
