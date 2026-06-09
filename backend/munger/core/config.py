from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///dev.db"
    fred_api_key: str = ""
    clerk_secret_key: str = ""
    clerk_domain: str = ""
    cors_origins: str = "*"
    env: str = "development"
    newsapi_key: str = ""
    gemini_api_key: str = ""
    cron_secret: str = ""

    class Config:
        env_file = ".env"


settings = Settings()
