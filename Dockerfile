FROM python:3.13.9-slim-bookworm
EXPOSE 8000

WORKDIR /app
COPY . /app
CMD ["python3", "-m","http.server","8000"]