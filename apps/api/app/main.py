from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import inspect, text

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


def ensure_lightweight_schema_updates() -> None:
    inspector = inspect(engine)
    if "media_assets" not in inspector.get_table_names():
        return

    existing_columns = {column["name"] for column in inspector.get_columns("media_assets")}
    column_sql = {
        "source": "ALTER TABLE media_assets ADD COLUMN source VARCHAR(32) DEFAULT 'upload'",
        "file_size": "ALTER TABLE media_assets ADD COLUMN file_size INTEGER DEFAULT 0",
        "width": "ALTER TABLE media_assets ADD COLUMN width INTEGER",
        "height": "ALTER TABLE media_assets ADD COLUMN height INTEGER",
    }
    with engine.begin() as connection:
        for column_name, statement in column_sql.items():
            if column_name not in existing_columns:
                connection.execute(text(statement))


ensure_lightweight_schema_updates()

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
