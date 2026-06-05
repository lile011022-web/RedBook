from datetime import datetime, timezone

from app.services.compliance import (
    check_ai_draft_can_be_scheduled,
    check_disabled_words,
    check_over_claims,
    check_same_minute_account_conflict,
    compare_text_similarity,
)


def test_title_similarity_above_70_percent_warns():
    result = compare_text_similarity("夏天防晒好物推荐", "夏天防晒好物清单", threshold=0.70)

    assert result.is_warning is True
    assert result.score >= 0.70


def test_body_similarity_above_60_percent_warns():
    result = compare_text_similarity(
        "这篇内容介绍温和护肤步骤和适合新手的日常护理方法",
        "这篇笔记介绍温和护肤流程和适合新手的每日护理方法",
        threshold=0.60,
    )

    assert result.is_warning is True
    assert result.score >= 0.60


def test_disabled_words_warn_when_text_contains_persona_blocked_word():
    result = check_disabled_words("This product has guaranteed results.", ["guaranteed"])

    assert result.is_warning is True
    assert result.matches == ["guaranteed"]


def test_over_claims_warn_for_absolute_outcome_language():
    result = check_over_claims("This routine guarantees permanent results.")

    assert result.is_warning is True
    assert "guarantees" in result.matches


def test_unreviewed_ai_draft_cannot_be_scheduled():
    result = check_ai_draft_can_be_scheduled(source="ai", review_status="needs_review")

    assert result.allowed is False
    assert "human review" in result.message.lower()


def test_same_minute_different_account_conflict_is_rejected():
    scheduled_at = datetime(2026, 6, 5, 10, 30, tzinfo=timezone.utc)
    result = check_same_minute_account_conflict(
        new_account_id="account-b",
        new_scheduled_at=scheduled_at,
        existing_tasks=[
            {"account_id": "account-a", "scheduled_at": scheduled_at},
        ],
    )

    assert result.allowed is False
    assert "same minute" in result.message.lower()
