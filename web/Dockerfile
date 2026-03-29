FROM node:20-alpine AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_WS_URL
ARG VITE_PWA_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_PWA_URL=$VITE_PWA_URL

COPY web/package*.json ./
RUN npm install

COPY web/ .
RUN npm run build

# ---
FROM nginx:alpine
# React SPA dist
COPY --from=builder /app/dist /usr/share/nginx/html
# Rename SPA entry point so landing page can use index.html
RUN mv /usr/share/nginx/html/index.html /usr/share/nginx/html/app.html
# Copy landing page & site static files (index.html, contrato.html, logo, sitemaps, robots)
COPY site/ /usr/share/nginx/html/
COPY web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
