# Home Server Budget

A household budgeting app built with Payload CMS, Next.js, and MongoDB.

This project is intended to run on a home server behind an existing reverse proxy. In your setup, the app is exposed at `https://${HOST}` from `.env`, for example `https://budget.samuelhilson.com`.

It depends on the separate home-server proxy stack here:

- https://github.com/valeryan/home-server

The app gives you:

- an admin UI for managing accounts, categories, payees, recurring items, budgets, and transactions
- a setup wizard for first-run configuration
- budget planning and ledger views
- optional Teller sync and optional Ollama-powered transaction insights

## Deployment Model

The primary deployment path for this repo is:

- Docker Compose on your home server
- attached to the proxy Docker network provided by `valeryan/home-server`
- publicly routed through the hostname in `HOST`

The proxy-related variables in `.env` are part of the normal setup for this project, not optional extras for a separate deployment mode.

## Requirements

- Node.js `24.x`
- `npm` `10+`
- MongoDB

## Environment

Copy the example file and fill in the values you need:

```bash
cp .env.example .env
```

Required for the app:

- `DATABASE_URI`
- `PAYLOAD_SECRET`

Required for your home-server proxy deployment:

- `HOST`
- `PROXY_HOST`
- `LE_EMAIL`

Optional integrations:

- `NEXT_PUBLIC_TELLER_APP_ID`
- `NEXT_PUBLIC_TELLER_ENV`
- `OLLAMA_URL`
- `OLLAMA_MODEL`

## Run On The Server

1. Copy the example env file:

```bash
cp .env.example .env
```

2. Set the public hostname and proxy values in `.env`.

3. Make sure the `valeryan/home-server` stack is running and its proxy network matches `PROXY_HOST`.

4. Start the stack:

```bash
docker compose up -d
```

5. Open the app at:

`https://${HOST}`

6. Open the admin at:

`https://${HOST}/admin`

7. Create your first admin user and complete the setup wizard.

## Local Development

Local development is supported, but it is not the primary workflow for this project.

1. Install dependencies:

```bash
npm install
```

2. Start the app:

```bash
npm run dev
```

3. Open the admin locally:

`http://localhost:3000/admin`

4. Create your first admin user.

5. Use the setup wizard in the admin dashboard to add or review:

- income categories
- expense categories
- payees
- accounts
- recurring items

The app seeds default income and expense categories on startup, so you can edit those instead of creating everything from scratch.

## Production Build

```bash
npm run build
npm start
```

## Docker Notes

`docker-compose.yml` assumes the app will join the external proxy network created by:

- https://github.com/valeryan/home-server

Make sure:

- `.env` contains the proxy-related values used by `docker-compose.yml`
- `DATABASE_URI` points at the `mongo` service
- the external Docker network referenced by `PROXY_HOST` exists because the home-server stack created it

Start the stack with:

```bash
docker compose up
```

## Optional Integrations

### Teller

Teller sync requires:

- `NEXT_PUBLIC_TELLER_APP_ID`
- optional `NEXT_PUBLIC_TELLER_ENV`
- client certificates at:
  - `certs/certificate.pem`
  - `certs/private_key.pem`

Without those, the rest of the app still works.

### Ollama

Ollama-backed transaction insights are optional.

Defaults used by the app:

- `OLLAMA_URL=http://ollama:11434`
- `OLLAMA_MODEL=qwen2.5:0.5b` in code
- `docker-compose.yml` defaults `OLLAMA_MODEL` to `gemma4:e2b`

If you want consistent behavior between local code and Docker, set `OLLAMA_MODEL` explicitly in `.env`.

## Docs

- [Getting Started](./docs/GETTING_STARTED.md)
- [Budget Model](./docs/BUDGET_MODEL.md)
