# Environments & Git workflow

| Branch    | Environment | Deploys                                      | URL (example)          |
|-----------|-------------|----------------------------------------------|------------------------|
| `feature/*` | –         | CI only (on PR)                              | –                      |
| `develop` | dev         | auto on push (`deploy-dev.yml`)              | dev-api.kilf.in        |
| `main`    | production  | on push, after manual approval (`deploy-prod.yml`) | api.kilf.in      |

Flow: `feature/x` → PR into `develop` → test on dev → PR `develop` → `main` → approve prod deploy.
Hotfix: `hotfix/x` from `main` → PR into `main`, then merge `main` back into `develop`.

Both stacks run on the same Hostinger VPS:
- **prod**: existing checkout at `PROD_DEPLOY_DIR`, rebuilt from source with its own compose/.env (untouched).
- **dev**: `/opt/kilf-dev`, compose project `kilf-dev`, own Postgres DB + volumes,
  ports `127.0.0.1:4100` (API) and `127.0.0.1:5273` (admin), images pulled from GHCR.

## One-time setup

### 1. Branches
```bash
git checkout -b develop && git push -u origin develop
```
GitHub → Settings → Branches: protect `main` and `develop` (require PR + "CI" checks).

### 2. VPS
- Create a deploy user with Docker access and add its public SSH key to `~/.ssh/authorized_keys`.
- Make sure the prod checkout can `git fetch` (deploy key or HTTPS) and works with `docker compose up -d --build`.
- DNS: `dev-api.kilf.in` and `dev-admin.kilf.in` → VPS IP.
- Reverse proxy (nginx example):
  ```nginx
  server { server_name dev-api.kilf.in;   location / { proxy_pass http://127.0.0.1:4100; proxy_set_header Host $host; proxy_set_header X-Forwarded-Proto $scheme; } }
  server { server_name dev-admin.kilf.in; location / { proxy_pass http://127.0.0.1:5273; } }
  ```
  then `certbot --nginx -d dev-api.kilf.in -d dev-admin.kilf.in`.

### 3. GitHub Environments (Settings → Environments)
**dev** — secrets: `DEV_HOST`, `DEV_USER`, `DEV_SSH_KEY`, `DEV_SSH_PORT` (opt), `DEV_POSTGRES_PASSWORD`,
`DEV_JWT_SECRET`, `DEV_JWT_REFRESH_SECRET`, `DEV_PAYMENT_SECRET`, Razorpay test keys (opt).
Variables: `DEV_API_URL`, `DEV_FRONTEND_URL`, `DEV_DEPLOY_DIR` (opt), `DEV_PAYMENT_PROVIDER` (opt, default `mock`).
Restrict deployment branch to `develop`.

**production** — secrets: `PROD_HOST`, `PROD_USER`, `PROD_SSH_KEY`, `PROD_SSH_PORT` (opt).
Variables: `PROD_DEPLOY_DIR`, `PROD_API_URL`. Turn on **Required reviewers** and restrict to `main`.

Use different JWT secrets and Razorpay **test** keys for dev — never reuse prod values.
