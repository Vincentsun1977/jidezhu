import base64
import io
import json
import os
import re
import subprocess
import tempfile
from datetime import datetime, timedelta
from pathlib import Path
from typing import Optional
from uuid import uuid4

import dashscope
from openai import OpenAI
from http import HTTPStatus

from dashscope.audio.asr import Recognition
from dashscope import Generation

from app.core.settings import settings

GENERATED_AUDIO_DIR = Path(__file__).resolve().parents[1] / "generated_audio"
CHINESE_NUMBER_MAP = {
    "零": 0,
    "一": 1,
    "二": 2,
    "两": 2,
    "三": 3,
    "四": 4,
    "五": 5,
    "六": 6,
    "七": 7,
    "八": 8,
    "九": 9,
    "十": 10,
}
WEEKDAY_MAP = {
    "一": 0,
    "二": 1,
    "三": 2,
    "四": 3,
    "五": 4,
    "六": 5,
    "日": 6,
    "天": 6,
}


def get_openai_client() -> Optional[OpenAI]:
    if not settings.openai_api_key:
        return None
    return OpenAI(api_key=settings.openai_api_key)


def configure_dashscope() -> bool:
    if not settings.dashscope_api_key:
        return False

    dashscope.api_key = settings.dashscope_api_key
    if settings.dashscope_region == "singapore":
        dashscope.base_websocket_api_url = "wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference"
        dashscope.base_http_api_url = "https://dashscope-intl.aliyuncs.com/api/v1"
    else:
        dashscope.base_websocket_api_url = "wss://dashscope.aliyuncs.com/api-ws/v1/inference"
        dashscope.base_http_api_url = "https://dashscope.aliyuncs.com/api/v1"
    return True


def get_nested_attr(source, *keys):
    value = source
    for key in keys:
        if isinstance(value, dict):
            value = value.get(key)
        else:
            value = getattr(value, key, None)
        if value is None:
            return None
    return value


def normalize_audio_file(input_path: str) -> tuple[str, dict]:
    output_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
    output_file.close()
    output_path = output_file.name

    command = [
        "ffmpeg",
        "-y",
        "-i",
        input_path,
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        output_path,
    ]
    process = subprocess.run(command, capture_output=True, text=True)
    debug = {
        "normalized": process.returncode == 0,
        "ffmpegCode": process.returncode,
        "ffmpegError": process.stderr[-1200:] if process.stderr else "",
        "normalizedPath": output_path,
    }
    return output_path, debug


def extract_text_from_sentence(sentence) -> str:
    if isinstance(sentence, dict):
        return str(sentence.get("text", "")).strip()

    if isinstance(sentence, list):
        texts = []
        for item in sentence:
            if isinstance(item, dict):
                text = str(item.get("text", "")).strip()
                if text:
                    texts.append(text)
        return "".join(texts).strip()

    return ""


def detect_memory_type(text: str) -> str:
    if "药" in text:
        return "medicine"
    if "买" in text:
        return "shopping"
    if "旅游" in text or "出行" in text:
        return "travel"
    if "家" in text:
        return "family"
    return "daily"


def parse_chinese_number(value: str) -> Optional[int]:
    text = str(value or "").strip()
    if not text:
        return None
    if text.isdigit():
        return int(text)
    if text == "十":
        return 10
    if "十" in text:
        parts = text.split("十")
        tens = CHINESE_NUMBER_MAP.get(parts[0], 1 if parts[0] == "" else None)
        ones = CHINESE_NUMBER_MAP.get(parts[1], 0 if len(parts) > 1 and parts[1] == "" else None)
        if tens is not None and ones is not None:
            return tens * 10 + ones
    total = 0
    for char in text:
        if char not in CHINESE_NUMBER_MAP:
            return None
        total = total * 10 + CHINESE_NUMBER_MAP[char]
    return total


def build_memory_summary(text: str) -> str:
    summary = text.strip()
    patterns_to_strip = [
        r"^帮我(记录|记一下|记个|记一条|记住)(一下)?[，,\s]*",
        r"^记一下[，,\s]*",
        r"^帮我提醒一下(我)?[，,\s]*",
        r"[，,。\s]*帮我提醒一下(我)?$",
        r"[，,。\s]*帮我记一下$",
        r"[，,。\s]*请帮我记住$",
    ]
    for pattern in patterns_to_strip:
        summary = re.sub(pattern, "", summary)

    summary = re.sub(r"\s+", "", summary)
    summary = summary.strip("，,。；; ")

    if "会议" in summary and "重要" in summary and "项目更新" in summary:
        summary = summary.replace("有一个", "").replace("我有一个", "")

    if len(summary) > 24:
        summary = f"{summary[:24]}..."

    return summary or text.strip()


def transcribe_audio(
    file_id: str,
    hint: Optional[str] = None,
    audio_base64: Optional[str] = None,
    audio_format: Optional[str] = None,
) -> dict:
    transcript = (hint or "").strip()
    if transcript:
        return {"text": transcript, "confidence": 0.99, "provider": settings.ai_provider}

    if settings.ai_provider == "qwen" and audio_base64 and configure_dashscope():
        audio_bytes = base64.b64decode(audio_base64)
        suffix = (audio_format or "mp3").lower().replace(".", "")
        with tempfile.NamedTemporaryFile(suffix=f".{suffix}", delete=False) as temp_audio:
            temp_audio.write(audio_bytes)
            temp_audio_path = temp_audio.name

        try:
            normalized_path, normalize_debug = normalize_audio_file(temp_audio_path)
            recognition = Recognition(
                model=settings.dashscope_asr_model,
                format="wav",
                sample_rate=16000,
                callback=None,
            )
            result = recognition.call(normalized_path)
            if result.status_code == HTTPStatus.OK:
                sentence = result.get_sentence()
                text = extract_text_from_sentence(sentence)
                if text:
                    return {
                        "text": text,
                        "confidence": 0.95,
                        "provider": "qwen",
                        "debug": {
                            **normalize_debug,
                            "statusCode": int(result.status_code),
                            "rawSentence": sentence,
                        },
                    }
            return {
                "text": "",
                "confidence": 0.0,
                "provider": "qwen_failed",
                "debug": {
                    **normalize_debug,
                    "statusCode": int(getattr(result, "status_code", 0) or 0),
                    "message": getattr(result, "message", ""),
                    "requestId": getattr(result, "request_id", ""),
                    "rawSentence": result.get_sentence() if hasattr(result, "get_sentence") else None,
                    "parsedText": extract_text_from_sentence(result.get_sentence() if hasattr(result, "get_sentence") else None),
                },
            }
        finally:
            try:
                os.remove(temp_audio_path)
            except OSError:
                pass
            try:
                os.remove(normalized_path)
            except Exception:
                pass

    client = get_openai_client()
    if settings.ai_provider == "openai" and client and audio_base64:
        audio_bytes = base64.b64decode(audio_base64)
        suffix = (audio_format or "mp3").lower().replace(".", "")
        file_like = io.BytesIO(audio_bytes)
        file_like.name = f"recording.{suffix}"
        response = client.audio.transcriptions.create(
            model=settings.openai_transcribe_model,
            file=file_like,
        )
        text = getattr(response, "text", "").strip()
        if text:
            return {"text": text, "confidence": 0.95, "provider": "openai", "debug": {"rawText": text}}

    if "medicine" in file_id:
        transcript = "我晚上要吃降压药"
    elif "shopping" in file_id:
        transcript = "记一下，我想买鸡蛋和牛奶"
    elif "travel" in file_id:
        transcript = "下个月我想去苏州旅游"
    else:
        transcript = "我刚刚说了一件重要的事情"

    return {"text": transcript, "confidence": 0.72, "provider": "mock", "debug": {"fallback": True}}


def parse_memory_text(text: str) -> dict:
    clean_text = text.strip()
    summary = build_memory_summary(clean_text)
    memory_type = detect_memory_type(clean_text)
    needs_reminder = any(keyword in clean_text for keyword in ["药", "记得", "晚上", "提醒"])
    return {
        "summary": summary,
        "memoryType": memory_type,
        "lifeCategory": "health" if memory_type == "medicine" else "daily",
        "timeScope": "custom",
        "needsReminder": needs_reminder,
        "importance": 0.92 if memory_type == "medicine" else 0.75,
        "tags": [],
    }


def classify_voice_intent(text: str) -> dict:
    content = text.strip()
    if not content:
        return {"intent": "unknown", "confidence": 0.0, "provider": "rule", "reason": "empty_text"}

    recall_patterns = [
        r"我上次",
        r"我之前",
        r"我以前",
        r"我最近说过",
        r"我提到过",
        r"我记过",
        r"我有没有",
        r"我是不是",
        r"我参加过",
        r"我去过",
        r"我看过",
        r"我说过",
        r"哪个医院",
        r"哪家医院",
        r"哪个地方",
        r"哪里",
        r"什么会议",
        r"什么地方",
        r"什么内容",
        r"哪天",
        r"什么时候",
        r"几点",
        r"多少",
        r"有没有提过",
        r"有没有说过",
        r"记得.*吗",
        r"还记得.*吗",
        r"你记得.*吗",
        r"帮我找",
        r"帮我查",
        r"帮我想想",
        r"我想找",
        r"我想知道",
        r"找回忆",
    ]
    if any(re.search(pattern, content) for pattern in recall_patterns):
        return {"intent": "memory_recall", "confidence": 0.92, "provider": "rule", "reason": "recall_pattern"}

    interrogative_markers = ["吗", "呢", "么", "哪个", "哪家", "哪里", "什么", "怎么", "几", "多少", "是不是", "有没有"]
    if any(marker in content for marker in interrogative_markers):
        return {"intent": "memory_recall", "confidence": 0.82, "provider": "rule", "reason": "interrogative_marker"}

    create_patterns = [
        r"帮我记",
        r"记一下",
        r"记住",
        r"提醒我",
        r"别忘了",
    ]
    if any(re.search(pattern, content) for pattern in create_patterns):
        return {"intent": "memory_create", "confidence": 0.9, "provider": "rule", "reason": "create_pattern"}

    if configure_dashscope():
        prompt = (
            "你是一个老人语音记忆助手的意图分类器。"
            "请只输出 JSON，不要输出解释。"
            '可选 intent 只有: "memory_create", "memory_recall", "reminder_action", "unknown"。'
            "判断下面这句话更像是要记录一件事，还是找回过去记忆。"
            "如果是问过去说过什么、去过哪里、提到过什么，通常是 memory_recall。"
            "如果是让系统记住一件新事、提醒某件未来的事，通常是 memory_create。"
            "只要用户是在提问过去有没有说过、去过哪里、哪个医院、什么会议、什么时候发生，就一定优先判成 memory_recall，不要判成 memory_create。"
            '示例1: "帮我记一下明天下午三点开会" -> {"intent":"memory_create","confidence":0.95,"reason":"未来待办"}。'
            '示例2: "我上次去的是哪个医院" -> {"intent":"memory_recall","confidence":0.96,"reason":"查询过去去过的地点"}。'
            '示例3: "我有没有说过下周去体检" -> {"intent":"memory_recall","confidence":0.93,"reason":"查询是否说过某件事"}。'
            '示例4: "提醒我明天早上吃药" -> {"intent":"memory_create","confidence":0.94,"reason":"创建提醒"}。'
            '示例5: "我去年参加的一个重要会议是什么" -> {"intent":"memory_recall","confidence":0.95,"reason":"查询过去的会议"}。'
            '示例6: "我是不是提过要去医院复查" -> {"intent":"memory_recall","confidence":0.95,"reason":"查询过去是否提过"}。'
            f"用户语句：{content}"
            '输出格式：{"intent":"memory_create","confidence":0.88,"reason":"..."}'
        )
        intent_data = call_dashscope_json(prompt, settings.dashscope_intent_model)
        if intent_data:
            return {
                "intent": str(intent_data.get("intent", "unknown")).strip() or "unknown",
                "confidence": float(intent_data.get("confidence", 0.7) or 0.7),
                "provider": "qwen",
                "reason": str(intent_data.get("reason", "dashscope_classifier")).strip() or "dashscope_classifier",
            }

    return {"intent": "unknown", "confidence": 0.5, "provider": "fallback_rule", "reason": "default_unknown"}


def call_dashscope_json(prompt: str, model: str) -> Optional[dict]:
    if not configure_dashscope():
        return None

    try:
        response = Generation.call(
            model=model,
            prompt=prompt,
            result_format="message",
        )
        if getattr(response, "status_code", None) != HTTPStatus.OK:
            return None
        choices = get_nested_attr(response, "output", "choices")
        message_text = ""
        if isinstance(choices, list) and choices:
            message_text = get_nested_attr(choices[0], "message", "content") or ""
        if isinstance(message_text, list):
            message_text = "".join(
                str(item.get("text", "")) if isinstance(item, dict) else str(item)
                for item in message_text
            )
        parsed_text = str(message_text).strip()
        if parsed_text.startswith("```"):
            parsed_text = re.sub(r"^```(?:json)?", "", parsed_text).strip()
            parsed_text = re.sub(r"```$", "", parsed_text).strip()
        return json.loads(parsed_text)
    except Exception:
        return None


def analyze_recall_query(query: str) -> dict:
    content = query.strip()
    if not content:
        return {"timeScope": "lastWeek", "keywords": [], "memoryTypes": [], "reason": "empty_query"}

    fallback_scope = "all"
    if "今天" in content:
        fallback_scope = "today"
    elif "昨天" in content:
        fallback_scope = "yesterday"
    elif "最近三天" in content or "最近3天" in content:
        fallback_scope = "last3days"
    elif "上周" in content:
        fallback_scope = "lastWeek"
    elif "本月" in content:
        fallback_scope = "thisMonth"
    elif "去年" in content:
        fallback_scope = "lastYear"

    keywords = []
    for token in ["医院", "体检", "会议", "项目", "吃药", "药", "旅游", "牛奶", "鸡蛋"]:
        if token in content:
            keywords.append(token)

    memory_types = []
    if any(token in content for token in ["药", "吃药", "体检", "医院"]):
        memory_types.append("medicine")
    if "会议" in content or "项目" in content:
        memory_types.append("important")
    if "旅游" in content:
        memory_types.append("travel")
    if "买" in content:
        memory_types.append("shopping")

    prompt = (
        "你是一个老人语音记忆助手的查询理解器。"
        "请把用户想找的回忆理解成结构化 JSON。"
        'timeScope 只能是: "today","yesterday","last3days","lastWeek","thisMonth","lastYear","all"。'
        'memoryTypes 可选: "medicine","shopping","travel","family","important","daily"。'
        "keywords 是帮助检索的中文关键词数组，尽量抽出医院、药名、会议、地点、体检、项目等关键实体。"
        "如果用户在问过去是否提过某件事、去过哪里、参加过什么，通常 timeScope 应该尽量宽一点，不要过度缩小。"
        '示例1：{"timeScope":"all","keywords":["医院"],"memoryTypes":["medicine"],"reason":"用户在问过去去过哪个医院"}。'
        '示例2：{"timeScope":"lastYear","keywords":["会议","项目"],"memoryTypes":["important"],"reason":"用户在回忆去年重要会议"}。'
        '输出格式：{"timeScope":"all","keywords":["医院"],"memoryTypes":["medicine"],"reason":"..."}。'
        f"用户查询：{content}"
    )
    ai_data = call_dashscope_json(prompt, settings.dashscope_recall_model)
    if ai_data:
        return {
            "timeScope": str(ai_data.get("timeScope", fallback_scope)).strip() or fallback_scope,
            "keywords": [str(item).strip() for item in ai_data.get("keywords", []) if str(item).strip()],
            "memoryTypes": [str(item).strip() for item in ai_data.get("memoryTypes", []) if str(item).strip()],
            "reason": str(ai_data.get("reason", "qwen_recall_query")).strip() or "qwen_recall_query",
        }

    return {
        "timeScope": fallback_scope,
        "keywords": keywords,
        "memoryTypes": memory_types,
        "reason": "rule_recall_query",
    }


def summarize_recall_results(query: str, items: list[dict]) -> dict:
    if not items:
        return {
            "summary": "这一段时间暂时没有找到相关回忆。",
            "selectedMemoryIds": [],
        }

    fallback_ids = [item.get("memoryId") for item in items[:5] if item.get("memoryId")]
    fallback_top = items[0]
    top_summary = str(fallback_top.get("summary", "")).strip() or "一条记忆"
    query_text = query.strip()

    if any(token in query_text for token in ["医院", "体检", "看病", "复查"]):
        fallback_summary = f"我先帮您想起来了，最相关的一条是：{top_summary}。"
    elif any(token in query_text for token in ["会议", "项目", "开会"]):
        fallback_summary = f"我先帮您找到最相关的会议记录：{top_summary}。"
    elif any(token in query_text for token in ["有没有", "是不是", "提过"]):
        fallback_summary = f"我找到一条最相关的记录：{top_summary}。"
    else:
        fallback_summary = f"我先帮您想到一条最相关的回忆：{top_summary}。"

    prompt = (
        "你是一个老人语音记忆助手，请根据用户查询，从候选记忆中挑出最相关的结果，并生成一句老人能听懂、像家人提醒一样自然的回答。"
        "回答必须先说结论，再少量补充，优先直接回答问题本身，不要先说找到了几条。"
        "如果用户在问哪个医院、什么会议、什么时候、有没有提过，尽量直接说出医院名、会议内容、时间或结论。"
        "如果候选里没有足够确定的答案，就说目前只找到这些相关记录，不要编造。"
        "语气要温和、简洁、口语化，像：'我帮您想起来了，您提到的是……'、'我先帮您找到最相关的一条……'。"
        "summary 最多两句话，尽量控制在 40 个汉字以内。"
        "请只输出 JSON，不要解释。"
        '输出格式：{"summary":"...","selectedMemoryIds":["id1","id2","id3"]}。'
        f"用户查询：{query}\n"
        f"候选记忆：{json.dumps(items, ensure_ascii=False)}"
    )
    ai_data = call_dashscope_json(prompt, settings.dashscope_recall_model)
    if ai_data:
        selected_ids = [str(item).strip() for item in ai_data.get("selectedMemoryIds", []) if str(item).strip()]
        return {
            "summary": str(ai_data.get("summary", fallback_summary)).strip() or fallback_summary,
            "selectedMemoryIds": selected_ids or fallback_ids,
        }

    return {
        "summary": fallback_summary,
        "selectedMemoryIds": fallback_ids,
    }


def extract_reminder_trigger(text: str) -> dict:
    now = datetime.now()
    content = text.strip()

    if not content:
        return {"shouldCreate": False}

    target_date = now.date()
    if "今天" in content:
        target_date = now.date()
    elif "明天" in content:
        target_date = (now + timedelta(days=1)).date()
    elif "后天" in content:
        target_date = (now + timedelta(days=2)).date()
    elif "下周一" in content:
        days_until_next_monday = (7 - now.weekday()) % 7 or 7
        target_date = (now + timedelta(days=days_until_next_monday)).date()
    else:
        weekday_match = re.search(r"(下周|这周|本周|这个星期|星期|周)([一二三四五六日天])", content)
        if weekday_match:
            weekday = WEEKDAY_MAP.get(weekday_match.group(2))
            if weekday is not None:
                current_weekday = now.weekday()
                delta = weekday - current_weekday
                prefix = weekday_match.group(1)
                if prefix == "下周":
                    delta = delta + 7 if delta >= 0 else delta + 14
                elif delta < 0:
                    delta += 7
                target_date = (now + timedelta(days=delta)).date()

    hour = None
    minute = 0

    match = re.search(r"([0-2]?\d|[一二两三四五六七八九十]{1,3})点半", content)
    if match:
        hour = parse_chinese_number(match.group(1))
        minute = 30
    else:
        match = re.search(r"([0-2]?\d|[一二两三四五六七八九十]{1,3})点(([0-5]?\d)|([一二三四五六七八九十]{1,3}))?分?", content)
        if match:
            hour = parse_chinese_number(match.group(1))
            minute = parse_chinese_number(match.group(2) or "0") or 0

    if "下午" in content or "晚上" in content:
        if hour is not None and hour < 12:
            hour += 12
        elif hour is None:
            hour = 19
    elif "中午" in content:
        hour = 12 if hour is None else hour
    elif "早上" in content or "上午" in content:
        hour = 9 if hour is None else hour

    if hour is None:
        return {"shouldCreate": False}

    trigger_at = datetime.combine(target_date, datetime.min.time()).replace(
        hour=hour,
        minute=minute,
        second=0,
        microsecond=0,
    )

    if trigger_at <= now:
        trigger_at = trigger_at + timedelta(days=1)

    return {
        "shouldCreate": True,
        "triggerAt": trigger_at.isoformat(),
        "title": build_memory_summary(content),
    }


def synthesize_reply(text: str) -> dict:
    audio_file_id = ""
    provider = "mock"

    if settings.ai_provider == "qwen" and configure_dashscope():
        GENERATED_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        response = dashscope.MultiModalConversation.call(
            model=settings.dashscope_tts_model,
            api_key=settings.dashscope_api_key,
            text=text,
            voice=settings.dashscope_tts_voice,
            language_type=settings.dashscope_tts_language,
        )
        if getattr(response, "status_code", None) == HTTPStatus.OK:
            audio_file_id = get_nested_attr(response, "output", "audio", "url") or ""
            provider = "qwen" if audio_file_id else "mock"

    client = get_openai_client()
    if not audio_file_id and settings.ai_provider == "openai" and client:
        GENERATED_AUDIO_DIR.mkdir(parents=True, exist_ok=True)
        output_name = f"{uuid4().hex}.mp3"
        output_path = GENERATED_AUDIO_DIR / output_name
        with client.audio.speech.with_streaming_response.create(
            model=settings.openai_tts_model,
            voice=settings.openai_tts_voice,
            input=text,
            format="mp3",
        ) as response:
            response.stream_to_file(output_path)
        audio_file_id = f"{settings.public_base_url.rstrip('/')}/generated-audio/{output_name}"
        provider = "openai"
    elif settings.tts_audio_base_url:
        audio_file_id = f"{settings.tts_audio_base_url.rstrip('/')}/{text[:12]}"
        provider = settings.ai_provider

    return {
        "replyText": text,
        "audioFileId": audio_file_id,
        "provider": provider if audio_file_id else "mock",
    }
