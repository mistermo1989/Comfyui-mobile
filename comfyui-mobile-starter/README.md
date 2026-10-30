# ComfyUI Mobile — Ephemeral Pod Starter

Mobile-first React frontend + Node.js API for managing RunPod Pods and ComfyUI with **no Network Volume**.

## Storage and billing model
- Do not create or attach a RunPod Network Volume.
- Configure a Pod with Container Disk only (`RUNPOD_VOLUME_GB=0`).
- Download models, LoRAs, custom nodes, and temporary outputs into the Pod's ephemeral filesystem.
- When the user is finished, the app must **Terminate** the Pod, not merely Stop it.
- Terminating permanently deletes the Pod and its Pod-local data. The next session starts fresh and must download models again.
- Export generated images to the user's phone or another external destination before termination.

Important: Stop and Terminate are different. Stop releases the GPU but retains the Pod and its Pod Volume Disk; storage may continue to incur charges. Terminate permanently deletes the Pod. Do not use Stop as the final cost-saving action for this design.

## Stack
- Frontend: React + Vite
- Backend: Node.js + Express
- RunPod control plane: RunPod REST API v2
- ComfyUI: HTTP + WebSocket API on port 8188
- Storage: ephemeral Pod Container Disk only

## Requirements
- Node.js 20+
- RunPod API key
- A ComfyUI-ready template or Docker image

## Run locally
### Backend
```bash
cd server
cp .env.example .env
npm install
npm run dev
```

### Frontend
```bash
cd client
npm install
npm run dev
```

## Configure `server/.env`
- `RUNPOD_API_KEY`: RunPod API key
- `APP_API_SECRET`: long random secret for protecting this app's backend
- `RUNPOD_POD_TEMPLATE_ID`: ComfyUI-ready template
- `RUNPOD_CONTAINER_DISK_GB`: ephemeral container disk size
- `RUNPOD_VOLUME_GB=0`: no Pod Volume Disk / no Network Volume

Never put RunPod API keys or provider tokens in frontend/Vite environment variables.

## Lifecycle the finished app must implement
1. User taps Start.
2. Backend checks for an existing active session Pod.
3. If none exists, create a Pod with the selected GPU, template, exposed ComfyUI port 8188, Container Disk, and `volumeInGb: 0`; do not send a Network Volume ID.
4. Wait for Pod readiness and ComfyUI health check.
5. Download required models and custom nodes to the Pod.
6. Generate images and let the user export results to their phone.
7. User taps **Terminate Pod**; show a clear destructive confirmation.
8. Backend terminates the Pod and verifies its terminal/deleted state.
9. Next session creates a new Pod and downloads models again.

## Cost and data safeguards
- Show a persistent running-cost indicator and elapsed session time.
- Add an optional auto-terminate timer and idle timeout.
- Warn before termination that all Pod-local models, custom nodes, and outputs will be lost.
- Never silently terminate while a generation or download is active.
- Offer download/export of generated images before termination.
- Do not claim that Stop eliminates all charges.

## Current scaffold
- Mobile-first dashboard shell
- Backend health endpoint
- RunPod v2 list Pods
- RunPod v2 start / stop / terminate actions
- Server-side app-secret protection
- Placeholder screens for Generate, Models, Queue, Settings

Pod creation, readiness polling, auto-terminate, ComfyUI workflow execution, model search/download, and secure production authentication are next implementation tasks. Test against a development RunPod account before enabling paid provisioning.
