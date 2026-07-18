import os


SUPPORTED_AI_PROVIDERS = {"mock", "ollama", "openai"}


def get_ai_provider() -> str:
    """Return the configured provider while preserving the original keyless defaults."""
    configured = os.getenv("AI_PROVIDER", "").strip().lower()
    if configured:
        if configured not in SUPPORTED_AI_PROVIDERS:
            choices = ", ".join(sorted(SUPPORTED_AI_PROVIDERS))
            raise RuntimeError(f"AI_PROVIDER must be one of: {choices}")
        if configured == "openai" and not os.getenv("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY is required when AI_PROVIDER=openai")
        return configured

    if os.getenv("MOCK_OPENAI", "1") == "1":
        return "mock"
    return "openai" if os.getenv("OPENAI_API_KEY") else "mock"


def ollama_base_url() -> str:
    return os.getenv("OLLAMA_BASE_URL", "http://localhost:11434").rstrip("/")
