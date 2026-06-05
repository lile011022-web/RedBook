from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models as models  # noqa: F401
from app.api import accounts, auth, drafts, health, media, personas, risks, schedule
from app.db.base import Base
from app.db.session import engine

Base.metadata.create_all(bind=engine)

app = FastAPI(title="RedBook API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(accounts.router)
app.include_router(personas.router)
app.include_router(drafts.router)
app.include_router(schedule.router)
app.include_router(media.router)
app.include_router(risks.router)
app.include_router(health.router)
