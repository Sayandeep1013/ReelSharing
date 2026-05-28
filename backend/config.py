from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_role_key: str

    # Groq — two separate keys as requested
    groq_text_api_key: str   # Whisper + LLM
    groq_vision_api_key: str  # Llama 3.2 Vision

    # Jina AI (embeddings)
    jina_api_key: str

    # Tavily (research links)
    tavily_api_key: str

    # Processing limits
    max_video_duration_seconds: int = 180   # 3 minutes
    max_upload_size_mb: int = 200
    max_key_frames: int = 10

    # Groq model names
    groq_llm_model: str = "llama-3.3-70b-versatile"
    groq_vision_model: str = "llama-3.2-11b-vision-preview"
    groq_whisper_model: str = "whisper-large-v3-turbo"

    # Frontend origin (for CORS)
    frontend_url: str = "http://localhost:3000"


settings = Settings()
