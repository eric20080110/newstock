from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "sqlite:///dev.db"
    fred_api_key: str = ""
    clerk_secret_key: str = ""
    clerk_domain: str = ""
    cors_origins: str = "http://localhost:5173"
    env: str = "development"

    class Config:
        env_file = ".env"


settings = Settings()
