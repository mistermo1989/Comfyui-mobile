# ComfyUI Mobile — Android prototype

This is an Android Studio project containing a native Android WebView shell and a mobile-first Thai UI prototype. It is an early UI prototype, not a finished ComfyUI client.

## Build an APK

The current ChatGPT build environment did not have the Android SDK and could not reach Google's SDK download host, so no compiled APK is included in this ZIP.

### Option A — Android Studio
1. Install Android Studio (with Android SDK Platform 35 and Build Tools 35.0.0).
2. Extract this ZIP.
3. Open the `android/` folder in Android Studio.
4. Allow Gradle sync to download Android Gradle Plugin dependencies.
5. Select **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
6. The debug APK will be at `android/app/build/outputs/apk/debug/app-debug.apk`.

### Option B — GitHub Actions
1. Create a GitHub repository and upload the contents of this ZIP.
2. Push the files to the `main` branch.
3. Open **Actions → Build Android APK**. You can also run it manually with **Run workflow**.
4. Download the `ComfyUI-Mobile-debug-apk` artifact from the completed workflow.

## Connect to the backend

The app is a client. It does not contain your RunPod API key and cannot manage Pods until a backend is deployed.

1. Deploy the `comfyui-mobile-starter/server` Node.js folder to a server with HTTPS.
2. Configure its `.env` using `server/.env.example` and set `RUNPOD_API_KEY` on the server only.
3. In the app, open **Settings**, enter the HTTPS Backend URL and `APP_API_SECRET`, then save and test.

Do not put the RunPod API key in the Android app. The app's App API Secret is only a prototype access gate; for public/production deployment, replace it with proper user authentication and rate limiting. The backend scaffold permits the Android WebView file origin (`null`) and an optional `APP_ORIGIN`; set `APP_ORIGIN` for any separately hosted web frontend.

## Current prototype scope

- Android app shell and dark, mobile-first UI.
- Home dashboard, navigation tabs, backend URL and app-secret settings.
- Calls the existing backend's Pod list/start/stop/terminate endpoints when connected.
- Terminate uses HTTP DELETE to match the current backend route and asks for confirmation.
- No Network Volume. The agreed design uses ephemeral Container Disk only and permanently terminates the Pod after use.
- Generate, Model Manager, and Queue screens are placeholders for the next development iteration.
- Pod creation/provisioning, ComfyUI readiness checks, generation workflows, model downloads, persistent history/export, cost monitoring, and safe auto-termination are not implemented yet.

## Important data-loss warning

Terminating a Pod permanently removes its Pod and files on its ephemeral disk. Models, LoRAs, custom nodes, and unexported outputs must be downloaded again or will be lost. Export images before terminating.
