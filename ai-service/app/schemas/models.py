from typing import Optional

from pydantic import BaseModel


class VoiceMemoryRequest(BaseModel):
    fileId: str
    userId: str
    transcript: Optional[str] = None
    audioBase64: Optional[str] = None
    audioFormat: Optional[str] = None
    skipTts: bool = False


class VoiceUploadResponse(BaseModel):
    fileId: str


class TextMemoryRequest(BaseModel):
    userId: str
    text: str


class RecallQueryRequest(BaseModel):
    userId: str
    query: str


class RecallAssistRequest(BaseModel):
    query: str
    items: list[dict]


class VoiceProcessRequest(BaseModel):
    fileId: str
    userId: str
    transcript: Optional[str] = None


class VoiceIntentRequest(BaseModel):
    fileId: str
    userId: str
    transcript: Optional[str] = None
    audioBase64: Optional[str] = None
    audioFormat: Optional[str] = None


class TTSRequest(BaseModel):
    text: str


class MemoryVectorUpsertRequest(BaseModel):
    memoryId: str
    userId: str
    summary: str
    contentRaw: str
    memoryType: str
    createdAt: str
    importance: float = 0.0
    tags: list[str] = []


class MemoryVectorSearchRequest(BaseModel):
    userId: str
    query: str
    limit: int = 8
    memoryTypes: list[str] = []


class ReminderItem(BaseModel):
    memoryId: str
    summary: str
    timeText: str


class ApiEnvelope(BaseModel):
    success: bool = True
    requestId: str
    data: dict
