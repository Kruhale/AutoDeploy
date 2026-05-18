# Stage 1 — compilar la SPA Angular
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build


# Stage 2 — servir con nginx + reverse proxy interno al backend
# El TLS lo termina el nginx del HOST del VPS (Let's Encrypt centralizado).
FROM nginx:alpine

RUN mkdir -p /var/log/nginx

COPY --from=build /app/dist/autodeploy/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

# Healthcheck contra el propio nginx
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
