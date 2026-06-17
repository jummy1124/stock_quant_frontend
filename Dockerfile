# syntax=docker/dockerfile:1

# ---------- 1) build stage ----------
FROM node:20-alpine AS build
WORKDIR /app

# 先複製依賴清單，善用 layer 快取
COPY package.json package-lock.json* ./
RUN npm ci || npm install

# 複製原始碼並打包
COPY . .
# VITE_API_BASE_URL 為建置期預設值；執行期可由 config.js 覆寫 (見 docker-entrypoint.sh)
ARG VITE_API_BASE_URL=http://localhost:8000
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
RUN npm run build

# ---------- 2) runtime stage ----------
FROM nginx:1.27-alpine AS runtime

# nginx 設定 (SPA fallback)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 靜態檔
COPY --from=build /app/dist /usr/share/nginx/html

# 執行期注入 API 位址的 entrypoint
COPY docker-entrypoint.sh /docker-entrypoint.d/40-app-config.sh
RUN chmod +x /docker-entrypoint.d/40-app-config.sh

# 執行期可覆寫；預設指向同主機 8000
ENV VITE_API_BASE_URL=http://localhost:8000

EXPOSE 80
# 沿用 nginx 官方 image 的 entrypoint (會執行 /docker-entrypoint.d/*.sh 後啟動 nginx)
