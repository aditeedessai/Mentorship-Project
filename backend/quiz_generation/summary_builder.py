def build_summary_prompt(text: str) -> str:

    return f"""
You are an experienced university professor helping a student
orient themselves before a quiz.

Write a QUICK overview of the study material below — a fast skim,
not a detailed study guide, and not a replacement for reading the
actual material.

Structure the overview as short paragraphs, each covering a
different angle, so it's easy to scan rather than one dense block
of text:

- Paragraph 1: what this material is broadly about.
- Paragraph 2: the main concepts or themes it introduces.
- Paragraph 3 (if needed): how the ideas connect or build on each other.
- Paragraph 4 or 5 (if needed): what's worth paying closest attention to.

Write at least 2 paragraphs. Only add a 3rd, 4th, or 5th paragraph
if the material genuinely covers enough distinct ground to need it —
do not pad a short or simple document out to more paragraphs than
it needs.

Each paragraph should be only 1 to 2 sentences - short and easy to
scan, not a full explanation. Written in plain, natural language,
not bullet points.

Do NOT go into detail on any single topic.
Do NOT include definitions, examples, or step-by-step explanations.
Do NOT write more than 2 sentences per paragraph.
Do NOT write more than 5 paragraphs in total.

Also include a short, descriptive title for the material, and a
short list of the key topics covered (single words or short
phrases, not full sentences).

Return ONLY valid JSON.

Use this structure:

{{
    "title": "Short descriptive title",
    "overview_paragraphs": [
        "First short paragraph - what the material is broadly about.",
        "Second short paragraph - the main concepts or themes."
    ],
    "key_topics": ["Topic one", "Topic two", "Topic three"]
}}

STUDY MATERIAL:
{text}
"""