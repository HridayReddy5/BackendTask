# Simple local generator for dev / fallback
def generate_mock_survey(description: str, num_questions: int = 8, language: str = "en") -> dict:
    base_title = f"Survey: {description}"
    qs = []
    # Always start with satisfaction + rating + two open-text + one multi
    qs.append({
        "id": "q1", "type": "multiple_choice_single",
        "text": "How satisfied are you overall?",
        "required": True,
        "choices": [
            {"id":"c1","label":"Very satisfied"},
            {"id":"c2","label":"Satisfied"},
            {"id":"c3","label":"Neutral"},
            {"id":"c4","label":"Dissatisfied"},
            {"id":"c5","label":"Very dissatisfied"},
        ],
    })
    qs.append({"id":"q2","type":"rating","text":"Rate your overall experience","scale_min":1,"scale_max":5})
    qs.append({"id":"q3","type":"open_text","text":"What did we do well?","placeholder":"Your answer..."})
    qs.append({"id":"q4","type":"open_text","text":"What could we improve?","placeholder":"Your answer..."})
    qs.append({
        "id":"q5","type":"multiple_choice_multi",
        "text":"Which aspects mattered most?",
        "choices":[
            {"id":"c1","label":"Price"},
            {"id":"c2","label":"Quality"},
            {"id":"c3","label":"Delivery"},
            {"id":"c4","label":"Customer support"},
        ],
    })
    return {
        "title": base_title,
        "description": f'Auto-generated (mock) from brief: "{description}"',
        "questions": qs[:max(3, min(num_questions, len(qs)))]
    }
