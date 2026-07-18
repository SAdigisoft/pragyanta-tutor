FROM python:3.11-slim
WORKDIR /app
COPY api/requirements.txt /app/api/requirements.txt
RUN pip install --no-cache-dir -r /app/api/requirements.txt
COPY api /app/api
COPY alembic /app/alembic
COPY alembic.ini /app/alembic.ini
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]

