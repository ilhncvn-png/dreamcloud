from __future__ import annotations

import re

_BLOCKED_PATTERNS: list[re.Pattern[str]] = [
    re.compile(r'\b(spam|scam|phishing)\b', re.IGNORECASE),
]

_MAX_REPEAT_CHARS = 5


class ModerationService:
    @classmethod
    def check(cls, text: str) -> tuple[bool, str | None]:
        """
        Returns (is_safe, reason). reason is None when safe.
        Sprint 1: keyword + heuristic rules. Sprint 5 will replace with ML classifier.
        """
        if len(text.strip()) == 0:
            return False, "empty_content"

        for pattern in _BLOCKED_PATTERNS:
            if pattern.search(text):
                return False, "blocked_keyword"

        # Detect repeated characters (e.g. "aaaaaaa") as spam signal
        if re.search(r'(.)\1{' + str(_MAX_REPEAT_CHARS) + r',}', text):
            return False, "repetitive_content"

        return True, None
