# Dockerfile
FROM python:3.9-slim

WORKDIR /app

COPY app/benchmark.py .

CMD ["python", "benchmark.py"]