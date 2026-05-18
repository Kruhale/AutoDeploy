# Stage 1 — compilar la SPA Angular
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json .

RUN npm ci

COPY . .

RUN npm run build


# Stage 2 — servir con nginx + reverse proxy + TLS
FROM nginx:alpine

# Generar certificado autofirmado para HTTPS (válido 10 años)
# CN = autodeploy.local; reemplazable con cert real en /etc/nginx/ssl si se desea
RUN apk add --no-cache openssl \
    && mkdir -p /etc/nginx/ssl \
    && openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/autodeploy.key \
        -out    /etc/nginx/ssl/autodeploy.crt \
        -subj "/C=ES/ST=Cadiz/L=Cadiz/O=AutoDeploy/CN=autodeploy.local" \
    && chmod 600 /etc/nginx/ssl/autodeploy.key \
    && mkdir -p /var/log/nginx

COPY --from=build /app/dist/autodeploy/browser /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443

# Healthcheck contra el redirect 301 del servidor HTTP
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget --quiet --tries=1 --spider --no-check-certificate https://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
