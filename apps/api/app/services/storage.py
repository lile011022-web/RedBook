from pathlib import PurePosixPath


def build_media_storage_key(account_id: str, asset_id: str, filename: str) -> str:
    safe_name = PurePosixPath(filename).name
    return str(PurePosixPath("accounts", account_id, "media", asset_id, safe_name))


def build_cross_account_reuse_warning(account_id: str, reused_from_asset_id: str) -> dict[str, str]:
    return {
        "account_id": account_id,
        "risk_type": "cross_account_media_reuse",
        "severity": "warning",
        "message": "Media with the same sha256 already exists under another account.",
        "related_entity_type": "media_asset",
        "related_entity_id": reused_from_asset_id,
    }
