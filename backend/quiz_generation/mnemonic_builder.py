def build_mnemonic_prompt(text: str, topic: str, style: str = "acronym") -> str:
    style_guidelines = {
        "acronym": "Create a memorable phrase or acronym where each letter/word corresponds to key components or steps of the topic in order.",
        "rhyme": "Create a short, catchy, rhythm-focused rhyme (2-4 lines) that makes the concept easy to memorize.",
        "story": "Create a short, vivid, funny or unusual mini-story where characters or events correspond to key concepts.",
        "surprise": "Choose the single best mnemonic style (acronym, rhyme, or funny story) that best suits this concept."
    }

    selected_guideline = style_guidelines.get(style.lower(), style_guidelines["acronym"])

    return f"""
You are an expert memory coach helping a student memorize study material.

Create a contextual memory trick (mnemonic) for the following topic:
TOPIC TO REMEMBER: "{topic}"
REQUESTED MEMORY STYLE: "{style}"

Style Instruction:
{selected_guideline}

Guidelines:
- Base the mnemonic strictly on the provided study material below. Do NOT invent facts or external knowledge.
- Make it easy to remember, creative, and genuinely useful for studying.
- For the "breakdown" field, list each component of the mnemonic with its corresponding concept from the text (e.g. "P — Physical layer").

Return ONLY valid JSON with no extra commentary outside the JSON.

Use this exact JSON structure:

{{
    "title": "Short descriptive title (e.g. Remember the OSI Layers)",
    "mnemonic": "The main mnemonic phrase, rhyme, or story text",
    "style": "{style}",
    "breakdown": [
        "First letter/component — Concept explanation",
        "Second letter/component — Concept explanation"
    ]
}}

STUDY MATERIAL:
{text}
"""
