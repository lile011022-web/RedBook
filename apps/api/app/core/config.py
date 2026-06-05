from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "sqlite:///./redbook.db"
    jwt_secret: str = "dev-change-me"
    jwt_algorithm: str = "HS256"
    openai_api_key: str | None = None
    s3_endpoint_url: str | None = None
    s3_bucket: str = "redbook-media"
    s3_region: str = "us-east-1"
    s3_access_key_id: str | None = None
    s3_secret_access_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")


@lru_cache
def get_settings() -> Settings:
    return Settings()
