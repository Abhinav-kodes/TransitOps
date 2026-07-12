FROM ghcr.io/astral-sh/uv:python3.11-alpine
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy
WORKDIR /app

# Copy configuration files first to optimize build cache
COPY pyproject.toml ./

# Let uv sync naturally without dev packages
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --no-dev

# Copy application source code
COPY . /app

EXPOSE 8000
# Leverage 'uv run' to safely execute uvicorn within the locked environment context
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]