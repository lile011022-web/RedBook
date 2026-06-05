from app.services.openai_writer import (
    build_dashboard_analysis_prompt,
    build_draft_options_prompt,
    build_draft_prompt,
    build_image_generation_prompt,
    build_media_ideas_prompt,
    parse_dashboard_analysis,
    parse_draft_content,
    parse_draft_options,
    parse_media_ideas,
)


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


def test_parse_draft_options_reads_multiple_structured_drafts():
    options = parse_draft_options(
        """
        {
          "drafts": [
            {
              "title": "标题 A",
              "body": "正文 A",
              "tags": ["护肤", "新手"],
              "cover_text": "封面 A"
            },
            {
              "title": "标题 B",
              "body": "正文 B",
              "tags": "not-list",
              "cover_text": "封面 B"
            }
          ]
        }
        """
    )

    assert len(options) == 2
    assert options[0].title == "标题 A"
    assert options[0].tags == ["护肤", "新手"]
    assert options[1].tags == []


def test_build_draft_options_prompt_mentions_multiple_chinese_manual_review():
    prompt = build_draft_options_prompt(
        positioning="宝妈护肤",
        content_direction="温和护肤",
        tone="真诚",
        disabled_words=["根治"],
        topic="夏季防晒",
        count=3,
        extra_requirements="多给标题差异",
    )

    assert "Option count: 3" in prompt
    assert "夏季防晒" in prompt
    assert "Use Chinese" in prompt
    assert "manual review" in prompt.lower()


def test_parse_dashboard_analysis_reads_structured_json_text():
    analysis = parse_dashboard_analysis(
        """
        {
          "summary": "曝光和观看下降，互动不足。",
          "diagnosis": ["封面点击率还可以，但转化弱"],
          "recommendations": ["强化开头利益点"],
          "next_actions": ["测试 3 个封面标题"],
          "content_angles": ["新手避坑", "真实使用前后"]
        }
        """
    )

    assert analysis.summary == "曝光和观看下降，互动不足。"
    assert analysis.diagnosis == ["封面点击率还可以，但转化弱"]
    assert analysis.recommendations == ["强化开头利益点"]
    assert analysis.next_actions == ["测试 3 个封面标题"]
    assert analysis.content_angles == ["新手避坑", "真实使用前后"]


def test_build_dashboard_analysis_prompt_uses_manual_data_boundary():
    class PersonaStub:
        positioning = "本地生活账号"
        content_direction = "探店"
        tone = "自然"
        publish_frequency = "每周 3 篇"

    class RecordStub:
        period_label = "近7日"
        period_start = "2026-05-29"
        period_end = "2026-06-04"
        exposure_count = 51
        view_count = 7
        like_count = 0
        comment_count = 0
        net_follower_count = 0
        new_follow_count = 0
        cover_click_rate = 13.7
        video_completion_rate = 0
        favorite_count = 0
        share_count = 0
        unfollow_count = 0
        profile_visit_count = 8
        exposure_change = "-40%"
        view_change = "-46%"
        like_change = ""
        comment_change = ""
        follower_change = ""
        cover_click_change = "-2%"
        video_completion_change = ""
        profile_visit_change = "-57%"
        notes = "手动录入"

    prompt = build_dashboard_analysis_prompt(
        persona=PersonaStub(),
        records=[RecordStub()],
        recent_drafts=[],
    )

    assert "manually entered" in prompt
    assert "do not ask to automate" in prompt
    assert "51" in prompt
    assert "近7日" in prompt


def test_parse_media_ideas_reads_structured_json_text():
    ideas = parse_media_ideas(
        """
        {
          "cover_concepts": ["封面一"],
          "shooting_script": ["镜头一"],
          "video_storyboard": ["分镜一"],
          "asset_checklist": ["图片素材"]
        }
        """
    )

    assert ideas.cover_concepts == ["封面一"]
    assert ideas.shooting_script == ["镜头一"]
    assert ideas.video_storyboard == ["分镜一"]
    assert ideas.asset_checklist == ["图片素材"]


def test_build_media_prompts_include_persona_and_boundaries():
    class PersonaStub:
        positioning = "合肥本地生活博主"
        content_direction = "直播预告"
        tone = "真诚"
        disabled_words = ["保证"]

    ideas_prompt = build_media_ideas_prompt(persona=PersonaStub(), goal="周末直播预热")
    image_prompt = build_image_generation_prompt(
        persona=PersonaStub(),
        prompt="主播招聘封面",
        style="真实手机摄影",
    )

    assert "合肥本地生活博主" in ideas_prompt
    assert "不要包含自动发布" in ideas_prompt
    assert "主播招聘封面" in image_prompt
    assert "真实手机摄影" in image_prompt
