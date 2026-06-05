from app.services.openai_writer import build_draft_prompt, parse_draft_content


def test_build_draft_prompt_includes_persona_and_compliance_language():
    prompt = build_draft_prompt(
        positioning="new mother skincare",
        content_direction="gentle routines",
        tone="warm",
        disabled_words=["guaranteed"],
        topic="summer moisturizer",
    )

    assert "new mother skincare" in prompt
    assert "gentle routines" in prompt
    assert "warm" in prompt
    assert "summer moisturizer" in prompt
    assert "guaranteed" in prompt
    assert "manual review" in prompt.lower()
    assert "do not make exaggerated claims" in prompt.lower()


def test_parse_draft_content_reads_structured_json_text():
    content = parse_draft_content(
        """
        {
          "title": "Summer moisturizer checklist",
          "body": "A gentle routine for manual review.",
          "tags": ["skincare", "summer"],
          "cover_text": "Gentle summer care"
        }
        """
    )

    assert content.title == "Summer moisturizer checklist"
    assert content.body == "A gentle routine for manual review."
    assert content.tags == ["skincare", "summer"]
    assert content.cover_text == "Gentle summer care"
