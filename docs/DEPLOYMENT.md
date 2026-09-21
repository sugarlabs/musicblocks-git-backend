# Deployment & CI/CD Guide

> For contributors and maintainers — everything needed to understand,
> operate, and troubleshoot the production deployment.

---

## Architecture Overview

```
GitHub (sugarlabs/musicblocks-git-backend)
        │
        │  push to main
        ▼
GitHub Actions (CI/CD)
        │
        ├─ Job 1: Build Docker image → push to GHCR
        │         ghcr.io/sugarlabs/musicblocks-git-backend:latest
        │
        └─ Job 2: SSH → VM → docker compose pull → docker compose up -d
                        │
                        ▼
              containers.sugarlabs.org
                        │
                    nginx :80
                        │  reverse proxy
                        ▼
              Docker container (mb-backend)
                   :5001 (localhost only)
                        │
                   ┌────┴────┐
                   │ Express  │  TypeScript + Node 20
                   │ API      │
                   └────┬────┘
                        │
              ┌─────────┴──────────┐
              │                    │
        projects.sqlite        GitHub API
        (SQLite via            (Octokit —
         better-sqlite3)        create/fork/edit)
```

---

## Server

| Detail | Value |
|---|---|
| Host | `containers.sugarlabs.org` |
| User | `<maintainer-user>` (contact Walter Bender for access) |
| OS | Ubuntu 24.04 LTS |
| Docker | v27+ |
| Nginx | v1.24 |
| App port | `127.0.0.1:5001` (localhost only, proxied by nginx) |
| Public URL | `http://git-planet.sugarlabs.org` |

SSH access requires a key authorised on the server.
Contact the project maintainer (Walter Bender) to be granted access.

---

## Secrets & Environment

### On the VM — `.env` file

Located at `~/musicblocks-git-backend/.env` on the server.
**Never commit this file.** See `.env.example` for the required variables.

| Variable | Purpose |
|---|---|
| `PORT` | Express server port (default: `5001`) |
| `GITHUB_PAT` | Personal Access Token for GitHub API |
| `GITHUB_USERNAME` | GitHub username for repo operations |
| `ORG_NAME` | GitHub org where project repos are created |
| `GITHUB_APP_ID` | GitHub App ID |
| `GITHUB_INSTALLATION_ID` | GitHub App installation ID |
| `GITHUB_APP_PRIVATE_KEY_PATH` | Path to the App private key PEM file |
| `SQLITE_PATH` | Path to `projects.sqlite` inside the container |
| `CORS_ORIGIN` | Allowed CORS origin (frontend URL) |
| `TRUST_PROXY` | Set to `1` when behind nginx |

### GitHub App Private Key

Mounted read-only into the container from the host:
```
Host path:      ~/secrets/private-key.pem
Container path: /etc/musicblocks/private-key.pem
Permissions:    600 (owner read-only)
```

The path is configured via `GITHUB_APP_PRIVATE_KEY_PATH` in `.env`.

### GitHub Actions Secrets

Set in `sugarlabs/musicblocks-git-backend` → **Settings → Secrets → Actions**:

| Secret | Purpose |
|---|---|
| `DEPLOY_HOST` | SSH hostname of the server |
| `DEPLOY_USER` | SSH username on the server |
| `DEPLOY_SSH_KEY` | Private key authorised on the server (full PEM contents) |

`GITHUB_TOKEN` is provided automatically by Actions — no setup needed for the GHCR push.

---

## Docker Setup

### Files

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage Alpine build — compiles TypeScript, runs as non-root user |
| `docker-compose.yml` | Production compose - pulls GHCR image, mounts SQLite volume + PEM key |
| `.dockerignore` | Excludes `node_modules`, `.env`, `dist`, secrets from build context |

### Named volume — SQLite persistence

```yaml
volumes:
  sqlite_data:   # managed by Docker — persists across container restarts and image upgrades
```

The SQLite database survives container recreation. To inspect or replace it:

```bash
# Copy a new database onto the running container
docker cp /path/to/projects.sqlite mb-backend:/var/lib/musicblocks/projects.sqlite

# Remove stale WAL files after replacing the database
docker exec mb-backend sh -c 'rm -f /var/lib/musicblocks/projects.sqlite-shm /var/lib/musicblocks/projects.sqlite-wal'

# Restart to reload cleanly
docker compose restart
```

---

## Nginx Configuration

Config file: `nginx/git-planet.conf`
Installed on the server at: `/etc/nginx/sites-available/git-planet`

```nginx
server {
    listen 80;
    server_name git-planet.sugarlabs.org;

    location / {
        proxy_pass http://127.0.0.1:5001;
        # ... headers
    }
}
```

Enabling it requires a maintainer with sudo access:

```bash
sudo ln -sf /etc/nginx/sites-available/git-planet /etc/nginx/sites-enabled/git-planet
sudo nginx -t && sudo systemctl reload nginx
```

---

## CI/CD Pipeline

Defined in `.github/workflows/deploy.yml`. Triggers on every push to `main`.

### Job 1 — Build & Push

Runs on: `ubuntu-latest`
Permissions: `packages: write`

1. Checks out the repo
2. Logs in to `ghcr.io` using the auto-provided `GITHUB_TOKEN`
3. Builds the Docker image (`Dockerfile`)
4. Pushes two tags to GHCR:
   - `ghcr.io/sugarlabs/musicblocks-git-backend:latest`
   - `ghcr.io/sugarlabs/musicblocks-git-backend:<git-sha>`

> **Note:** `provenance: false` is set to disable BuildKit attestation manifests,
> which cause permission errors on GHCR org repositories.

### Job 2 — Deploy

Runs after Job 1. Requires the three `DEPLOY_*` secrets.

1. SSHes into `containers.sugarlabs.org` as the deploy user
2. `cd ~/musicblocks-git-backend`
3. `docker compose pull` — fetches the new image from GHCR
4. `docker compose up -d --remove-orphans` — replaces the container (zero-downtime)
5. Health check: `curl http://127.0.0.1:5001/health` — fails the deploy if unhealthy

---

## Manual Redeploy

If CI/CD is unavailable or a hotfix is needed:

```bash
# SSH in with your authorised key
ssh <maintainer-user>@containers.sugarlabs.org

cd ~/musicblocks-git-backend

# Pull latest code and compose file
git pull https://github.com/sugarlabs/musicblocks-git-backend.git main

# Pull new image and restart
docker compose pull
docker compose up -d --remove-orphans

# Verify
curl http://127.0.0.1:5001/health
```

---

## Troubleshooting

### Container won't start — `SQLITE_CANTOPEN`
The SQLite directory doesn't exist inside the container. The app creates it automatically on boot. If it fails, check volume permissions:
```bash
docker exec mb-backend ls -la /var/lib/musicblocks/
```

### `Swagger file not found`
The build copies `src/openapi.yaml` → `dist/openapi.yaml`. If it's missing, rebuild:
```bash
docker compose up --build -d
```

### SSH host key warning (`REMOTE HOST IDENTIFICATION HAS CHANGED`)
`containers.sugarlabs.org` routes to different backend VMs. Add this to `~/.ssh/config` on your machine:
```
Host containers.sugarlabs.org
    StrictHostKeyChecking no
    UserKnownHostsFile /dev/null
    LogLevel ERROR
```

### GHCR push fails — `denied: permission_denied`
Symptom: build-and-push job fails on the push step.
Cause: BuildKit attestation manifests are attempting to write OCI index entries that require elevated package permissions.
Fix: Ensure `provenance: false` is set in the workflow and that **Settings → Actions → General → Workflow permissions** is set to "Read and write permissions".

### Container healthy but API returns empty data
The SQLite database is empty or missing. Copy the latest `projects.sqlite` onto the server:
```bash
# Run locally — copy database to the server
scp projects.sqlite <maintainer-user>@containers.sugarlabs.org:~/projects.sqlite

# Then on the server
ssh <maintainer-user>@containers.sugarlabs.org
docker cp ~/projects.sqlite mb-backend:/var/lib/musicblocks/projects.sqlite
docker exec mb-backend sh -c 'rm -f /var/lib/musicblocks/projects.sqlite-shm /var/lib/musicblocks/projects.sqlite-wal'
docker compose restart
rm ~/projects.sqlite
```

---

## Useful Commands

```bash
# Check container status
docker compose ps

# View live logs
docker compose logs -f

# Health check
curl http://127.0.0.1:5001/health

# Count projects in the database
docker exec mb-backend node -e "
  const db = require('better-sqlite3')('/var/lib/musicblocks/projects.sqlite');
  console.log('Projects:', db.prepare('SELECT COUNT(*) as n FROM projects').get().n);
"

# Restart without rebuilding
docker compose restart

# Full rebuild from source (use when GHCR is unavailable)
docker compose down
docker compose up --build -d
```
