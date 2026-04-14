import hashlib
from typing import Any, Dict, List, Optional

from pymilvus import DataType, MilvusClient

from app.core.settings import settings
from app.services.voice_pipeline import build_memory_summary, configure_dashscope

from dashscope import TextEmbedding


def is_milvus_enabled() -> bool:
    return settings.vector_db_provider == "milvus" and bool(settings.milvus_uri)


def get_milvus_client() -> MilvusClient:
    if not is_milvus_enabled():
        raise RuntimeError("Milvus is disabled")
    kwargs: Dict[str, Any] = {
        "uri": settings.milvus_uri,
        "db_name": settings.milvus_database,
    }
    if settings.milvus_token:
        kwargs["token"] = settings.milvus_token
    return MilvusClient(**kwargs)


def get_milvus_status() -> dict:
    if not is_milvus_enabled():
        return {
            "provider": settings.vector_db_provider or "none",
            "uri": settings.milvus_uri,
            "database": settings.milvus_database,
            "connected": False,
            "collection": settings.milvus_collection,
            "collectionExists": False,
            "disabled": True,
        }
    client = get_milvus_client()
    root_client_kwargs: Dict[str, Any] = {"uri": settings.milvus_uri}
    if settings.milvus_token:
        root_client_kwargs["token"] = settings.milvus_token
    root_client = MilvusClient(**root_client_kwargs)
    databases = root_client.list_databases()
    collections = client.list_collections()
    return {
        "provider": "milvus",
        "uri": settings.milvus_uri,
        "database": settings.milvus_database,
        "databases": databases,
        "databaseExists": settings.milvus_database in databases,
        "collection": settings.milvus_collection,
        "connected": True,
        "collections": collections,
        "collectionExists": settings.milvus_collection in collections,
    }


def ensure_milvus_collection() -> dict:
    if not is_milvus_enabled():
        return {
            "created": False,
            "collection": settings.milvus_collection,
            "disabled": True,
        }
    client = get_milvus_client()
    collections = client.list_collections()

    if settings.milvus_collection in collections:
        description = client.describe_collection(settings.milvus_collection)
        return {
            "created": False,
            "collection": settings.milvus_collection,
            "description": description,
        }

    schema = client.create_schema(auto_id=False, enable_dynamic_field=True)
    schema.add_field("id", DataType.VARCHAR, is_primary=True, max_length=128)
    schema.add_field("userId", DataType.VARCHAR, max_length=128)
    schema.add_field("memoryId", DataType.VARCHAR, max_length=128)
    schema.add_field("summary", DataType.VARCHAR, max_length=1024)
    schema.add_field("contentRaw", DataType.VARCHAR, max_length=4096)
    schema.add_field("memoryType", DataType.VARCHAR, max_length=64)
    schema.add_field("createdAt", DataType.VARCHAR, max_length=64)
    schema.add_field("importance", DataType.FLOAT)
    schema.add_field("vector", DataType.FLOAT_VECTOR, dim=settings.milvus_dimension)

    index_params = client.prepare_index_params()
    index_params.add_index(
        field_name="vector",
        index_type="AUTOINDEX",
        metric_type="COSINE",
    )

    client.create_collection(
        collection_name=settings.milvus_collection,
        schema=schema,
        index_params=index_params,
    )
    description = client.describe_collection(settings.milvus_collection)
    return {
        "created": True,
        "collection": settings.milvus_collection,
        "description": description,
    }


def build_search_text(payload: dict) -> str:
    summary = str(payload.get("summary", "")).strip()
    content_raw = str(payload.get("contentRaw", "")).strip()
    memory_type = str(payload.get("memoryType", "")).strip()
    tags = [str(item).strip() for item in payload.get("tags", []) if str(item).strip()]
    segments = [summary, content_raw, memory_type, " ".join(tags)]
    return " ".join(segment for segment in segments if segment).strip()


def fallback_embedding(text: str) -> List[float]:
    vector: List[float] = []
    seed = text or "memory_assistant"
    while len(vector) < settings.milvus_dimension:
        digest = hashlib.sha256(seed.encode("utf-8")).digest()
        for index in range(0, len(digest), 4):
            chunk = digest[index:index + 4]
            value = int.from_bytes(chunk, "big", signed=False)
            normalized = (value / 4294967295.0) * 2 - 1
            vector.append(normalized)
            if len(vector) >= settings.milvus_dimension:
                break
        seed = f"{seed}:next"
    return vector


def generate_embedding(text: str) -> dict:
    content = text.strip()
    if not content:
        return {
            "vector": fallback_embedding("empty_memory"),
            "provider": "fallback_hash",
            "searchText": "",
        }

    if configure_dashscope():
        response = TextEmbedding.call(
            model=settings.dashscope_embedding_model,
            input=content,
            text_type="document",
        )
        if getattr(response, "status_code", None) == 200:
            output = getattr(response, "output", {}) or {}
            embeddings = output.get("embeddings", []) if isinstance(output, dict) else []
            if embeddings:
                vector = embeddings[0].get("embedding", [])
                if len(vector) == settings.milvus_dimension:
                    return {
                        "vector": vector,
                        "provider": "qwen",
                        "searchText": content,
                    }
                if vector:
                    resized = vector[: settings.milvus_dimension]
                    if len(resized) < settings.milvus_dimension:
                        resized.extend([0.0] * (settings.milvus_dimension - len(resized)))
                    return {
                        "vector": resized,
                        "provider": "qwen_resized",
                        "searchText": content,
                    }

    return {
        "vector": fallback_embedding(content),
        "provider": "fallback_hash",
        "searchText": content,
    }


def upsert_memory_vector(payload: dict) -> dict:
    if not is_milvus_enabled():
        search_text = build_search_text(payload)
        return {
            "memoryId": str(payload.get("memoryId", "")).strip(),
            "vectorDocId": "",
            "provider": "vector_disabled",
            "searchText": search_text,
            "collection": settings.milvus_collection,
            "database": settings.milvus_database,
            "disabled": True,
        }
    client = get_milvus_client()
    ensure_milvus_collection()
    search_text = build_search_text(payload)
    embedding = generate_embedding(search_text)
    summary = str(payload.get("summary", "")).strip()
    content_raw = str(payload.get("contentRaw", "")).strip()
    if not summary:
        summary = build_memory_summary(content_raw)

    document = {
        "id": str(payload.get("memoryId", "")).strip(),
        "userId": str(payload.get("userId", "")).strip(),
        "memoryId": str(payload.get("memoryId", "")).strip(),
        "summary": summary[:1024],
        "contentRaw": content_raw[:4096],
        "memoryType": str(payload.get("memoryType", "daily")).strip()[:64] or "daily",
        "createdAt": str(payload.get("createdAt", "")).strip()[:64],
        "importance": float(payload.get("importance", 0.0) or 0.0),
        "vector": embedding["vector"],
    }
    client.upsert(collection_name=settings.milvus_collection, data=[document])
    return {
        "memoryId": document["memoryId"],
        "vectorDocId": document["id"],
        "provider": embedding["provider"],
        "searchText": embedding["searchText"],
        "collection": settings.milvus_collection,
        "database": settings.milvus_database,
    }


def search_memory_vectors(user_id: str, query: str, limit: int = 8, memory_types: Optional[List[str]] = None) -> dict:
    if not is_milvus_enabled():
        return {
            "provider": "vector_disabled",
            "queryText": query,
            "hits": [],
            "filter": "",
            "collection": settings.milvus_collection,
            "database": settings.milvus_database,
            "disabled": True,
        }
    client = get_milvus_client()
    ensure_milvus_collection()
    memory_types = memory_types or []
    embedding = generate_embedding(query)

    filter_parts = [f'userId == "{user_id}"']
    normalized_types = [item for item in memory_types if item and item != "important"]
    if normalized_types:
        if len(normalized_types) == 1:
            filter_parts.append(f'memoryType == "{normalized_types[0]}"')
        else:
            joined = ", ".join(f'"{item}"' for item in normalized_types)
            filter_parts.append(f"memoryType in [{joined}]")

    filter_expr = " && ".join(filter_parts)
    result = client.search(
        collection_name=settings.milvus_collection,
        data=[embedding["vector"]],
        limit=max(1, min(limit, 20)),
        filter=filter_expr,
        output_fields=["memoryId", "summary", "contentRaw", "memoryType", "createdAt", "importance"],
    )

    hits = []
    for item in result[0] if result else []:
        if hasattr(item, "to_dict"):
            hit_data = item.to_dict()
        else:
            hit_data = dict(item) if isinstance(item, dict) else {}
        entity = hit_data.get("entity", {})
        hits.append(
            {
                "memoryId": entity.get("memoryId") or hit_data.get("id"),
                "summary": entity.get("summary", ""),
                "contentRaw": entity.get("contentRaw", ""),
                "memoryType": entity.get("memoryType", "daily"),
                "createdAt": entity.get("createdAt", ""),
                "importance": entity.get("importance", 0.0),
                "score": hit_data.get("distance"),
            }
        )

    return {
        "provider": embedding["provider"],
        "queryText": query,
        "hits": hits,
        "filter": filter_expr,
        "collection": settings.milvus_collection,
        "database": settings.milvus_database,
    }
