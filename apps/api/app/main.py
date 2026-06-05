from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models as models  # noqa: F401
from app.api import (
    accounts,
    analytics,
    ai,
    auth,
    dashboard_records,
    drafts,
    health,
    media,
    personas,
    publish_logs,
    risks,
    schedule,
    settings,
)
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
app.include_router(ai.router)
app.include_router(schedule.router)
app.include_router(media.router)
app.include_router(publish_logs.router)
app.include_router(analytics.router)
app.include_router(dashboard_records.router)
app.include_router(risks.router)
app.include_router(settings.router)
app.include_router(health.router)
