import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_env = os.getenv("APP_ENV", "development")
    ai_provider = os.getenv("AI_PROVIDER", "qwen")
    api_token = os.getenv("AI_SERVICE_TOKEN", "")
    tts_audio_base_url = os.getenv("TTS_AUDIO_BASE_URL", "")
    openai_api_key = os.getenv("OPENAI_API_KEY", "")
    openai_transcribe_model = os.getenv("OPENAI_TRANSCRIBE_MODEL", "gpt-4o-transcribe")
    openai_tts_model = os.getenv("OPENAI_TTS_MODEL", "gpt-4o-mini-tts")
    openai_tts_voice = os.getenv("OPENAI_TTS_VOICE", "alloy")
    public_base_url = os.getenv("PUBLIC_BASE_URL", "http://127.0.0.1:8000")
    dashscope_api_key = os.getenv("DASHSCOPE_API_KEY", "")
    dashscope_region = os.getenv("DASHSCOPE_REGION", "beijing")
    dashscope_asr_model = os.getenv("DASHSCOPE_ASR_MODEL", "fun-asr-realtime")
    dashscope_embedding_model = os.getenv("DASHSCOPE_EMBEDDING_MODEL", "text-embedding-v4")
    dashscope_intent_model = os.getenv("DASHSCOPE_INTENT_MODEL", "qwen3.6-plus")
    dashscope_recall_model = os.getenv("DASHSCOPE_RECALL_MODEL", "qwen3.6-plus")
    dashscope_tts_model = os.getenv("DASHSCOPE_TTS_MODEL", "qwen3-tts-flash")
    dashscope_tts_voice = os.getenv("DASHSCOPE_TTS_VOICE", "Cherry")
    dashscope_tts_language = os.getenv("DASHSCOPE_TTS_LANGUAGE", "Chinese")
    vector_db_provider = os.getenv("VECTOR_DB_PROVIDER", "")
    milvus_uri = os.getenv("MILVUS_URI", "http://127.0.0.1:19530")
    milvus_token = os.getenv("MILVUS_TOKEN", "")
    milvus_database = os.getenv("MILVUS_DATABASE", "default")
    milvus_collection = os.getenv("MILVUS_COLLECTION", "memories")
    milvus_dimension = int(os.getenv("MILVUS_DIMENSION", "1024"))


settings = Settings()
