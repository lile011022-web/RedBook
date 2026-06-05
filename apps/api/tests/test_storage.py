from app.services.storage import build_cross_account_reuse_warning, build_media_storage_key


def test_media_storage_key_is_scoped_by_account_id():
    key = build_media_storage_key(
        account_id="acc_123",
        asset_id="asset_456",
        filename="cover.png",
    )

    assert key == "accounts/acc_123/media/asset_456/cover.png"


def test_media_storage_key_strips_nested_filename_paths():
    key = build_media_storage_key(
        account_id="acc_123",
        asset_id="asset_456",
        filename="../nested/cover.png",
    )

    assert key == "accounts/acc_123/media/asset_456/cover.png"


def test_cross_account_reuse_warning_has_structured_message():
    warning = build_cross_account_reuse_warning(
        account_id="account-b",
        reused_from_asset_id="asset-a",
    )

    assert warning["risk_type"] == "cross_account_media_reuse"
    assert warning["account_id"] == "account-b"
    assert warning["related_entity_id"] == "asset-a"
