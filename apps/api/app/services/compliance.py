from dataclasses import dataclass
from datetime import datetime
from difflib import SequenceMatcher


@dataclass(frozen=True)
class SimilarityResult:
    score: float
    threshold: float
    is_warning: bool


@dataclass(frozen=True)
class RuleResult:
    allowed: bool
    message: str


@dataclass(frozen=True)
class WarningResult:
    is_warning: bool
    matches: list[str]
    message: str


OVER_CLAIM_TERMS = [
    "guarantee",
    "guaranteed",
    "guarantees",
    "permanent",
    "100%",
    "治愈",
    "根治",
    "保证",
]


def compare_text_similarity(left: str, right: str, threshold: float) -> SimilarityResult:
    score = SequenceMatcher(None, left.strip(), right.strip()).ratio()
    return SimilarityResult(score=score, threshold=threshold, is_warning=score >= threshold)


def check_disabled_words(text: str, disabled_words: list[str]) -> WarningResult:
    normalized_text = text.lower()
    matches = [word for word in disabled_words if word and word.lower() in normalized_text]
    return WarningResult(
        is_warning=bool(matches),
        matches=matches,
        message="Text contains persona disabled words." if matches else "No disabled words found.",
    )


def check_over_claims(text: str) -> WarningResult:
    normalized_text = text.lower()
    matches = [term for term in OVER_CLAIM_TERMS if term.lower() in normalized_text]
    return WarningResult(
        is_warning=bool(matches),
        matches=matches,
        message="Text may contain over-claim language." if matches else "No over-claim language found.",
    )


def check_ai_draft_can_be_scheduled(source: str, review_status: str) -> RuleResult:
    if source == "ai" and review_status != "approved":
        return RuleResult(
            allowed=False,
            message="AI-generated drafts require human review before scheduling.",
        )
    return RuleResult(allowed=True, message="Draft can be scheduled.")


def check_same_minute_account_conflict(
    new_account_id: str,
    new_scheduled_at: datetime,
    existing_tasks: list[dict],
) -> RuleResult:
    new_minute = new_scheduled_at.replace(second=0, microsecond=0)
    for task in existing_tasks:
        existing_minute = task["scheduled_at"].replace(second=0, microsecond=0)
        if task["account_id"] != new_account_id and existing_minute == new_minute:
            return RuleResult(
                allowed=False,
                message="Multiple accounts cannot be scheduled in the same minute.",
            )
    return RuleResult(allowed=True, message="No same-minute multi-account conflict.")
