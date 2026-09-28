# ==============================================================================
# Stage 1: Build Vite / React SPA Frontend
# ==============================================================================
FROM node:20-bookworm-slim AS client-builder

WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./

ARG VITE_CARTO_API_KEY

RUN npm run build

# ==============================================================================
# Stage 2: Production Container with Node.js & Python 3.11 Runtime
# ==============================================================================
FROM python:3.11-slim-bookworm

WORKDIR /app

# Install Node.js 20, curl, and essential system libraries for OpenCV/MediaPipe
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    libgl1 \
    libglib2.0-0 \
    libegl1 \
    libgles2 \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Install Python ML dependencies across models (MineSign AI & Model 4)
COPY ["minesign_ai/requirements.txt", "/tmp/minesign_req.txt"]
COPY ["model 4/requirements.txt", "/tmp/model_4_req.txt"]

RUN pip install --no-cache-dir \
    -r /tmp/minesign_req.txt \
    -r /tmp/model_4_req.txt \
    && rm -f /tmp/*_req.txt

# Install Server Dependencies
WORKDIR /app/server
COPY server/package*.json ./
RUN npm ci --omit=dev

# Copy Server Source Code
COPY server/ /app/server/

# Copy Python AI Modules & Data Assets
COPY minesign_ai/ /app/minesign_ai/
COPY ["model 4/", "/app/model 4/"]
COPY ["model 6/", "/app/model 6/"]

# Copy Compiled React Client from Stage 1
COPY --from=client-builder /app/client/dist /app/client/dist

# Copy Startup Script
COPY start.sh /app/start.sh
RUN chmod +x /app/start.sh

# Environment Variables & Port Exposure
WORKDIR /app
ENV NODE_ENV=production
ENV PYTHONUNBUFFERED=1
ENV PORT=5001

EXPOSE 5001

CMD ["/app/start.sh"]
