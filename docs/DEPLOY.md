# Deployment guide — AutoDeploy

Step-by-step guide to bring up AutoDeploy locally or on a VPS from scratch.

## Prerequisites

| Software | Minimum version | Verification command |
|----------|-----------------|----------------------|
| Docker Engine | 24.0 | `docker --version` |
| Docker Compose | v2.20 | `docker compose version` |
| Git | 2.30 | `git --version` |
| 2 GB free RAM | — | `free -h` |
| 3 GB free disk | — | `df -h /` |

No Java, Node, or Maven is required on the host machine: everything builds inside the containers.

## Environment variables

| Variable | Required | Description | How to generate it |
|----------|----------|-------------|--------------------|
| `AUTODEPLOY_JWT_SECRET` | Yes | HMAC key for signing JWT tokens (min. 256 bits) | `openssl rand -base64 48` |
| `AUTODEPLOY_CIFRADO_CLAVE` | Yes | AES-256 key used to encrypt SSH credentials in MongoDB | `openssl rand -base64 32` |
| `OPENROUTER_API_KEY` | No | API key for the AI assistant (https://openrouter.ai/keys) | Create an OpenRouter account |
| `OPENROUTER_MODEL` | No | Default AI model. Defaults to `google/gemini-2.5-pro` | Slug from https://openrouter.ai/models |
| `IMAGE_TAG` | No | Docker image tag to deploy. Defaults to `latest` | Any SHA or tag from GHCR |

Variables are read from a `.env` file at the project root. A `.env.example` file with default values is provided.

## Local deployment (from scratch)

### 1. Clone the repository

```bash
git clone https://github.com/Kruhale/AutoDeploy.git
cd AutoDeploy
```

### 2. Configure environment variables

```bash
cp .env.example .env
# Edit .env with real values (the ones in .env.example are placeholders)
nano .env
```

Example of a valid `.env` for development:

```env
AUTODEPLOY_JWT_SECRET=8K7QzVMpL+EvW9rH4tYbF3aXcN6dP1iR2sU0jK5mLxA=
AUTODEPLOY_CIFRADO_CLAVE=YXV0b2RlcGxveS1zZWNyZXQta2V5LTMyYg==
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxx
OPENROUTER_MODEL=google/gemini-2.5-pro
```

### 3. Bring up the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The first startup takes 2-4 min (image builds). Subsequent startups take 15-20 s.

### 4. Wait until everything is `healthy`

```bash
docker compose -f docker-compose.prod.yml ps
```

You should see all services in `running` and `(healthy)` state. Only the **frontend** publishes a port to the host (`HOST_PORT`, `8082` by default); backend, mongodb, and sandbox-ssh are only reachable inside the internal Docker network:

```
NAME                   IMAGE                                            STATUS                   PORTS
autodeploy-mongodb     mongo:8                                          Up 30s (healthy)
autodeploy-backend     ghcr.io/kruhale/autodeploy-backend:latest        Up 25s (healthy)
autodeploy-sandbox     linuxserver/openssh-server:latest                Up 20s                   0.0.0.0:2223->2222/tcp
autodeploy-frontend    ghcr.io/kruhale/autodeploy-frontend:latest       Up 10s (healthy)         0.0.0.0:8082->80/tcp
```

If any service stays in `(unhealthy)` or `starting`, see the **Troubleshooting** section.

> **Note on TLS**: the frontend container serves HTTP only on port `8082`. TLS is terminated by the VPS `nginx-host` (centralized Let's Encrypt) when deployed to production behind a domain. There is no HTTPS in local development: access it directly at `http://localhost:8082/`.

### 5. Verify access (local, without nginx-host in front)

```bash
# Angular frontend (SPA served by the nginx container)
curl -I http://localhost:8082/
# Expected: HTTP/1.1 200 OK, server: nginx, content-type: text/html

# Public backend (via nginx reverse proxy → backend:8080)
curl -s http://localhost:8082/api/estado | jq
# Expected: {"success":true,"data":{"estadoGeneral":"UP",...}}

# Spring Actuator healthcheck
curl -s http://localhost:8082/actuator/health
# Expected: {"status":"UP","groups":["liveness","readiness"]}

# Protected endpoint without JWT → 403 (confirms the filter works)
curl -sI http://localhost:8082/api/servidores
# Expected: HTTP/1.1 403 Forbidden
```

Open your browser at `http://localhost:8082/`.

### 5 bis. Verify access (real production)

Once behind `nginx-host` + Let's Encrypt on a public VPS:

```bash
curl -I https://autodeploy.kruhale.com/                  # HTTP/2 200
curl -s https://autodeploy.kruhale.com/api/estado | jq   # estadoGeneral: UP
curl -s https://autodeploy.kruhale.com/actuator/health   # {"status":"UP",...}
```

## Deployment to a shared VPS (with nginx-host)

This is the typical scenario when the VPS already has an nginx on ports 80/443 serving other applications. AutoDeploy is published on an **internal host port** (`8082` by default) and the VPS `nginx-host` does `proxy_pass` from the public domain.

```
Internet ─► VPS nginx-host :443 (TLS, Let's Encrypt) ─► localhost:8082 ─► nginx-container (HTTP) ─► backend / mongo
```

### Full steps (first time)

#### 1. Check that the internal port is free

```bash
sudo ss -tlnp | grep 8082
```

If it returns nothing, the port is free. If it is taken, change `HOST_PORT` in `.env` to another available port.

#### 2. Clone and configure `.env`

```bash
cd /opt
sudo git clone https://github.com/Kruhale/AutoDeploy.git
sudo chown -R $USER:$USER AutoDeploy
cd AutoDeploy
cp .env.example .env
# Edit and fill in AUTODEPLOY_JWT_SECRET, AUTODEPLOY_CIFRADO_CLAVE, OPENROUTER_API_KEY, HOST_PORT
nano .env
```

#### 3. Bring up the stack

```bash
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
```

Verify that the `autodeploy-frontend` container is publishing `8082:80`. Internal test:

```bash
curl -fsS http://localhost:8082/api/estado | jq
```

If it responds with the JSON `{"success":true,...}`, it is OK.

#### 4. Configure the VPS nginx-host

Copy the prepared snippet:

```bash
sudo cp docs/snippets/nginx-host-autodeploy.conf /etc/nginx/sites-available/autodeploy
# Replace TU-DOMINIO.com with the real domain
sudo sed -i 's/TU-DOMINIO\.com/mydomain.com/g' /etc/nginx/sites-available/autodeploy
sudo ln -s /etc/nginx/sites-available/autodeploy /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

#### 5. Make sure the domain's A record points to the VPS IP

In the registrar's panel:

| Type | Name | Value |
|------|------|-------|
| A | `@` (or the subdomain) | `<public-VPS-IP>` |

Wait a few minutes for propagation:

```bash
dig +short mydomain.com
# Must return the VPS IP
```

#### 6. Issue the Let's Encrypt certificate

```bash
sudo certbot --nginx -d mydomain.com
```

Certbot:
- Detects `server_name mydomain.com` in `/etc/nginx/sites-available/autodeploy`.
- Performs the HTTP-01 challenge on port 80.
- Automatically fills in `ssl_certificate` and `ssl_certificate_key`.
- Adds the 301 HTTP→HTTPS redirect (option 2 when prompted).
- Schedules automatic renewal every 60 days (`/etc/cron.d/certbot`).

#### 7. Final verification

```bash
# Valid cert
curl -I https://mydomain.com/
# HTTP/2 200, server: nginx, no warnings

# Working API
curl https://mydomain.com/api/estado | jq
```

Open `https://mydomain.com` in the browser — it must show the dashboard with the green padlock.

### When pushing to main (automatic CD)

The `cd.yml` workflow:

1. Builds the images and publishes them to GHCR.
2. Connects to the VPS over SSH and runs:

   ```bash
   cd /opt/AutoDeploy
   git pull origin main
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   ```

3. Runs a smoke test against `https://mydomain.com/api/estado`.

The VPS `nginx-host` is **not touched** on each deploy: it is only reconfigured when routes or the domain change.

## Automated deployment with GitHub Actions

### Option A — automatic with GitHub Actions

Any push to `main` triggers the `cd.yml` workflow, which:

1. Builds the `autodeploy-backend` and `autodeploy-frontend` images.
2. Publishes them to GHCR as `:latest` and `:<short-sha>`.
3. SSHes into the VPS and runs:

   ```bash
   cd /opt/autodeploy
   git pull origin main
   docker compose -f docker-compose.prod.yml pull
   docker compose -f docker-compose.prod.yml up -d --remove-orphans
   docker image prune -f
   ```

4. Runs `curl -ksf https://<domain>/api/estado` as a smoke test. If it fails, the workflow fails red.

Required GitHub Secrets (Settings → Secrets and variables → Actions → New repository secret):

| Secret | Example value | Purpose |
|--------|---------------|---------|
| `SSH_HOST` | `autodeploy.kruhale.com` or `203.0.113.42` | domain or public IP of the VPS the deploy job connects to |
| `SSH_USER` | `deploy` or `ubuntu` | SSH user on the VPS with permissions over `DEPLOY_PATH` |
| `SSH_PORT` | `22` | VPS SSH port (optional, default 22) |
| `SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...END...-----` block | full SSH private key in OpenSSH format (do not use an old RSA-PEM `id_rsa`). Generate with `ssh-keygen -t ed25519 -f deploy-key -C "github-actions"` and add the **public** key (`deploy-key.pub`) to `~/.ssh/authorized_keys` of the `SSH_USER` user |
| `DEPLOY_PATH` | `/opt/AutoDeploy` | absolute path of the repo clone on the VPS where the job runs `git reset --hard` and starts compose |
| `SMOKE_URL` | `https://autodeploy.kruhale.com` | public URL the job checks with `curl /api/estado` after deploying (no trailing slash). If it fails, automatic rollback is triggered |
| `AUTODEPLOY_JWT_SECRET` | 48-byte base64 | same as in the VPS `.env`, in case the job regenerates it (optional) |
| `AUTODEPLOY_CIFRADO_CLAVE` | 32-byte base64 | same as in the VPS `.env` (optional) |
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | AI assistant API key (optional, users can configure it from the UI) |

**Important:** the secrets are created **once** and subsequent deploys read them automatically. If you rotate `SSH_PRIVATE_KEY` you must also update `authorized_keys` on the VPS. If you change `DEPLOY_PATH` you must move the repo clone on the VPS.

**Quick verification** (that the runner's SSH connects to the VPS):

```bash
# From your machine, simulate what the runner does
ssh -i deploy-key -p 22 deploy@autodeploy.kruhale.com "cd /opt/AutoDeploy && git status"
# Must respond without a password with the repo's git status
```

### Option B — manual from your local machine

If you need to deploy without waiting for CI/CD:

```bash
# 1. Build and publish images
docker buildx build -t ghcr.io/kruhale/autodeploy-backend:latest ./backend --push
docker buildx build -t ghcr.io/kruhale/autodeploy-frontend:latest ./autodeploy --push

# 2. Connect to the VPS and update
ssh deploy@<vps-domain>
cd /opt/autodeploy
git pull origin main
docker compose -f docker-compose.prod.yml pull
docker compose -f docker-compose.prod.yml up -d
```

### Initial VPS setup (one time)

```bash
# As root on the VPS
apt-get update && apt-get install -y docker.io docker-compose-v2 git
usermod -aG docker deploy

# As the deploy user
mkdir -p /opt/autodeploy
cd /opt/autodeploy
git clone https://github.com/Kruhale/AutoDeploy.git .
cp .env.example .env
# Edit .env with the real values
nano .env

# Log in to GHCR to pull private images (if they are private)
echo $GITHUB_TOKEN | docker login ghcr.io -u Kruhale --password-stdin

# First run
docker compose -f docker-compose.prod.yml up -d
```

## Post-deployment verification

```bash
# 1. Container status
docker compose -f docker-compose.prod.yml ps

# 2. Live logs from the last 50 lines
docker compose -f docker-compose.prod.yml logs --tail 50 --timestamps

# 3. Explicit backend healthcheck
curl -sf https://autodeploy.kruhale.com/actuator/health | jq
# Expected: {"status":"UP","groups":["liveness","readiness"]}

# 4. Prometheus metrics (optional)
curl -s https://autodeploy.kruhale.com/actuator/prometheus | head -20

# 5. Real login (replace EMAIL and PWD with valid credentials)
LOGIN_BODY=$(jq -n --arg e "demo@test.com" --arg p "example-not-real" '{email:$e, password:$p}')
curl -s -X POST https://autodeploy.kruhale.com/api/usuarios/login \
  -H "Content-Type: application/json" \
  -d "$LOGIN_BODY" | jq
```

## Troubleshooting

### `413 Request Entity Too Large` when uploading a large ZIP

**Cause:** nginx `client_max_body_size` is too low.
**Fix:** it is already set to 60 MB in `autodeploy/nginx.conf`. If you upload larger files, raise the value and rebuild the frontend.

### Backend stays `(unhealthy)` indefinitely

**Most common cause:** MongoDB did not start correctly or `AUTODEPLOY_JWT_SECRET` is empty.

```bash
docker compose -f docker-compose.prod.yml logs mongodb --tail 20
docker compose -f docker-compose.prod.yml logs backend --tail 50
```

If you see `IllegalArgumentException: The signing key's size is X bits which is less than the 256 bits`, the JWT secret is too short. Regenerate it with `openssl rand -base64 48`.

### Locally I access http://localhost:8082 without HTTPS

This is by design: the frontend container listens on HTTP/80 only (mapped to `HOST_PORT=8082` on the host). TLS is terminated by the VPS `nginx-host` in production with centralized Let's Encrypt, not by the container.

If you want HTTPS locally for testing, options:

- Run your own nginx on the host with a self-signed cert and `proxy_pass http://localhost:8082`.
- Use `mkcert` to generate a valid cert for `localhost` plus a host nginx.
- For Lighthouse/WAVE/TAW audits: run them directly against `https://autodeploy.kruhale.com` (valid Let's Encrypt cert, same code).

### `403 Forbidden` on any protected endpoint

The JWT interceptor is working: the `Authorization: Bearer <token>` header is missing. Log in first (`POST /api/usuarios/login`) and use the returned token.

### The AI assistant responds "You have not configured your OpenRouter API key"

Each user configures their own API key from the UI (`/app/asistente-ia` → "Settings"). The API key in `.env` is not used: it is legacy.

### `docker compose up` hangs in an endless build

```bash
# Clear the Docker cache
docker builder prune -af
docker system prune -af --volumes  # CAUTION: deletes ALL volumes
docker compose -f docker-compose.prod.yml up -d --build --no-cache
```

### CD from GitHub Actions fails with `Permission denied (publickey)`

Check the `SSH_PRIVATE_KEY` secret: it must be the **complete** private key including the `BEGIN/END OPENSSH PRIVATE KEY` headers (OpenSSH format, generated with `ssh-keygen -t ed25519`). The corresponding public key must be in `~/.ssh/authorized_keys` of the `SSH_USER` user on the VPS.

### `mongodb-datos` volume corrupted / I want to start over

```bash
docker compose -f docker-compose.prod.yml down -v   # ⚠️ deletes the ENTIRE database
docker compose -f docker-compose.prod.yml up -d
```

### SSH terminal WebSocket drops every minute

Check that the WS proxy does not have a short timeout. In `autodeploy/nginx.conf` the `/ws/` block already has `proxy_read_timeout 3600s`. If you change it, rebuild the frontend.

### I want to see which version is running on the VPS

```bash
# On the VPS
cd /opt/autodeploy && git log --oneline -1
docker compose -f docker-compose.prod.yml images
```

## Quick rollback

If the last deploy broke something:

```bash
# On the VPS
docker compose -f docker-compose.prod.yml down
IMAGE_TAG=<previous-sha> docker compose -f docker-compose.prod.yml up -d
```

Where `<previous-sha>` is the short SHA of the previous stable commit (visible in `docker compose images` or in GHCR).
