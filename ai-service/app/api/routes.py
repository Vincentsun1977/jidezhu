from fastapi import APIRouter

from app.schemas.models import (
    MemoryVectorUpsertRequest,
    MemoryVectorSearchRequest,
    RecallAssistRequest,
    RecallQueryRequest,
    TTSRequest,
    TextMemoryRequest,
    VoiceIntentRequest,
    VoiceMemoryRequest,
)
from app.services.mock_data import HOME_SUMMARY, RECALL_RESULT, TEXT_MEMORY, VOICE_MEMORY
from app.services.milvus_service import (
    ensure_milvus_collection,
    get_milvus_status,
    search_memory_vectors,
    upsert_memory_vector,
)
from app.services.voice_pipeline import (
    analyze_recall_query,
    classify_voice_intent,
    extract_reminder_trigger,
    parse_memory_text,
    summarize_recall_results,
    synthesize_reply,
    transcribe_audio,
)

router = APIRouter()


@router.get("/health")
def health_check():
    return {"success": True, "requestId": "health_001", "data": {"status": "ok"}}


@router.get("/api/v1/vector/health")
def vector_health_check():
    status = get_milvus_status()
    return {"success": True, "requestId": "vector_health_001", "data": status}


@router.post("/api/v1/vector/bootstrap")
def vector_bootstrap():
    result = ensure_milvus_collection()
    return {"success": True, "requestId": "vector_bootstrap_001", "data": result}


@router.post("/api/v1/vector/upsert-memory")
def vector_upsert_memory(payload: MemoryVectorUpsertRequest):
    result = upsert_memory_vector(payload.model_dump())
    return {"success": True, "requestId": "vector_upsert_001", "data": result}


@router.post("/api/v1/vector/search-memories")
def vector_search_memories(payload: MemoryVectorSearchRequest):
    result = search_memory_vectors(
        user_id=payload.userId,
        query=payload.query,
        limit=payload.limit,
        memory_types=payload.memoryTypes,
    )
    return {"success": True, "requestId": "vector_search_001", "data": result}


@router.get("/api/v1/home/summary")
def get_home_summary():
    return {"success": True, "requestId": "req_home_001", "data": HOME_SUMMARY}


@router.post("/api/v1/voice/upload")
def upload_voice():
    return {
        "success": True,
        "requestId": "req_upload_001",
        "data": {
            "fileId": "cloud://bucket/audio/mock-upload.mp3",
        },
    }


@router.post("/api/v1/memory/from-voice")
def create_memory_from_voice(payload: VoiceMemoryRequest):
    transcription = transcribe_audio(
        payload.fileId,
        payload.transcript,
        payload.audioBase64,
        payload.audioFormat,
    )
    parsed = parse_memory_text(transcription["text"])
    reminder = extract_reminder_trigger(transcription["text"])
    reply_text = f"我记住了，{parsed['summary']}"
    if payload.skipTts:
        reply = {
            "replyText": reply_text,
            "audioFileId": "",
            "provider": "tts_skipped",
            "ttsError": "",
        }
    else:
        try:
            reply = synthesize_reply(reply_text)
        except Exception as error:  # pragma: no cover - external provider fallback
            reply = {
                "replyText": reply_text,
                "audioFileId": "",
                "provider": f"{transcription['provider']}_tts_fallback",
                "ttsError": str(error),
            }
    data = {
        "memoryId": VOICE_MEMORY["memoryId"],
        "requestUserId": payload.userId,
        "requestFileId": payload.fileId,
        "contentRaw": transcription["text"],
        "summary": parsed["summary"],
        "memoryType": parsed["memoryType"],
        "needsReminder": parsed["needsReminder"],
        "reminderSuggestion": reminder,
        "replyText": reply["replyText"],
        "replyAudioFileId": reply["audioFileId"],
        "provider": transcription["provider"],
        "asrDebug": transcription.get("debug", {}),
        "ttsProvider": reply.get("provider", "mock"),
        "ttsError": reply.get("ttsError", ""),
    }
    return {"success": True, "requestId": "req_voice_001", "data": data}


@router.post("/api/v1/voice/intent")
def classify_voice(payload: VoiceIntentRequest):
    transcription = transcribe_audio(
        payload.fileId,
        payload.transcript,
        payload.audioBase64,
        payload.audioFormat,
    )
    intent_result = classify_voice_intent(transcription["text"])
    return {
        "success": True,
        "requestId": "req_voice_intent_001",
        "data": {
            "queryText": transcription["text"],
            "intent": intent_result["intent"],
            "confidence": intent_result["confidence"],
            "provider": intent_result["provider"],
            "reason": intent_result["reason"],
            "asrProvider": transcription["provider"],
            "asrDebug": transcription.get("debug", {}),
        },
    }


@router.post("/api/v1/memory/from-text")
def create_memory_from_text(payload: TextMemoryRequest):
    data = dict(TEXT_MEMORY)
    data["contentRaw"] = payload.text
    return {"success": True, "requestId": "req_text_001", "data": data}


@router.post("/api/v1/recall/query")
def recall_query(payload: RecallQueryRequest):
    data = dict(RECALL_RESULT)
    data["queryText"] = payload.query
    return {"success": True, "requestId": "req_recall_001", "data": data}


@router.post("/api/v1/recall/assist")
def recall_assist(payload: RecallAssistRequest):
    query_meta = analyze_recall_query(payload.query)
    summary_meta = summarize_recall_results(payload.query, payload.items)
    return {
        "success": True,
        "requestId": "req_recall_assist_001",
        "data": {
            "queryMeta": query_meta,
            "summary": summary_meta["summary"],
            "selectedMemoryIds": summary_meta["selectedMemoryIds"],
        },
    }


@router.post("/api/v1/tts/synthesize")
def tts_synthesize(payload: TTSRequest):
    reply = synthesize_reply(payload.text)
    return {"success": True, "requestId": "req_tts_001", "data": reply}
