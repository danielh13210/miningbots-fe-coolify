FROM ubuntu:latest
EXPOSE 8000

WORKDIR /app
COPY . /app
RUN apt-get update && apt-get install -y python3
CMD ["python3", "-m","http.server","8000"]