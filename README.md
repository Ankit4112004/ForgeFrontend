# Forge — AI Sandbox IDE

Forge is a browser-based IDE where you spin up isolated coding sandboxes and have an AI agent build and edit the code for you. Describe what you want ("build a snake game"), and the agent writes the files into a live React + Vite sandbox you can preview, edit, and run in real time.

## Features

- **AI code agent** — builds and modifies full, working apps/games from a prompt, with an automatic build-check that fixes broken edits.
- **Live preview** — see your project render instantly, auto-refreshed after each AI change.
- **In-browser editor & terminal** — Monaco editor and a real shell connected to the sandbox.
- **Project persistence** — each project's files are saved locally and restored when you reopen it.
- **Google sign-in** — accounts and projects via Google OAuth.

## Tech Stack

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Monaco, xterm.js
- **Backend:** Node.js microservices (auth, AI orchestration, sandbox manager, notifications)
- **AI:** LangChain agent (Mistral)
- **Infra:** Kubernetes on Minikube, orchestrated with Skaffold

## Structure

| Path | Service |
|------|---------|
| `frontend/` | React web app (the IDE) |
| `auth/` | Google OAuth + JWT auth |
| `ai-orchestration/` | LangChain AI code agent |
| `sandbox/` | Sandbox manager, per-pod agent, router, file-sync, template |
| `notification/` | Email notifications |
| `k8s/` | Kubernetes manifests |

## Running locally

Runs on a Minikube cluster via Skaffold (`skaffold dev`) with the frontend on Vite (`npm run dev`). Requires a `k8s/secrets.yml` with your own credentials (MongoDB, Redis, Google OAuth, Mistral API key).
