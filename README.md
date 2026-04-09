# WLDS-9 — Multi-Modal Species Identification System

> ⚠️ **This project is currently under active development and is NOT production-ready.**
> Audio and distance models are fully trained and integrated. The image model is currently being retrained due to low accuracy. Docker and hosting are pending.

---

A software-first simulation of an AI-powered wildlife identification device using multi-modal sensor fusion. Built to validate the core intelligence pipeline — audio classification, image classification, distance estimation, and weighted fusion — before hardware integration.

---

## Project Identity

| Property | Value |
|---|---|
| **System Name** | Multi-Modal Species Identification System |
| **Short Code** | WLDS-9 |
| **Stage** | Models complete — Docker & hosting pending |
| **Goal** | Prove multi-modal fusion logic and edge AI execution pipeline |

---

## Architecture

```
Frontend (Browser)
    ↓
Flask REST API  (app.py)
    ↓
Core Inference Engine  (core/inference.py)
    ├── audio_engine.py    → CNN on Mel-spectrogram
    ├── image_engine.py    → CNN transfer learning
    ├── distance_engine.py → Acoustic regression model
    └── fusion_engine.py   → Weighted confidence fusion
    ↓
SQLite Database  (wlds9.db)
    ↓
Detection History Page  (/history)
```

**Golden Rule:** Flask never contains ML logic. All intelligence lives in `core/`.

---

## Project Structure

```
wlds9/
├── app.py                    ← Flask app factory and entry point
├── config.py                 ← Flask config (secret key, upload folder, etc.)
├── auth.py                   ← User auth: register, login, session management
├── routes.py                 ← Blueprint registration
├── wlds9.db                  ← SQLite database (auto-created on first run)
├── requirements.txt
│
├── core/
│   ├── __init__.py
│   ├── inference.py          ← Main pipeline orchestrator
│   ├── audio_engine.py       ← Audio species classification
│   ├── image_engine.py       ← Visual species classification
│   ├── distance_engine.py    ← Distance estimation (acoustic)
│   ├── fusion_engine.py      ← Multi-modal fusion logic
│   └── logger.py             ← SQLite logging
│
├── templates/
│   ├── base.html             ← Base layout template
│   ├── landing.html          ← Public landing page
│   ├── index.html            ← Main scanner dashboard (authenticated)
│   ├── auth.html             ← Standalone login / register page
│   └── history.html          ← Scan history page
│
├── static/
│   ├── css/
│   │   ├── style.css         ← Main app styles (glassmorphism design system)
│   │   ├── landing.css       ← Landing page styles
│   │   ├── auth.css          ← Standalone auth page styles
│   │   └── auth_modal.css    ← Inline modal auth styles
│   ├── js/
│   │   ├── app.js            ← Main scanner app logic
│   │   └── landing.js        ← Landing page animations + auth modal
│   └── images/
│       └── logo.png
│
├── dataset/                  ← Raw audio/image data
├── models/                   ← Trained .pt model files
└── logs/                     ← Legacy (replaced by SQLite)
```

---

## Setup & Run

### 1. Create virtual environment

```bash
python3 -m venv venv
source venv/bin/activate
```

### 2. Install dependencies

```bash
pip install -r requirements.txt
```

### 3. Test inference engine (CLI — no server needed)

```bash
python core/inference.py --mode audio
python core/inference.py --mode image
python core/inference.py --mode fusion
```

### 4. Start Flask server

```bash
python app.py
```

Open → **http://127.0.0.1:5000**

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Landing page |
| `GET` | `/scanner` | Main scanner UI (authenticated) |
| `GET` | `/history` | Detection history page |
| `POST` | `/analyze/audio` | Audio-only species scan |
| `POST` | `/analyze/image` | Image-only species scan |
| `POST` | `/analyze/fusion` | Full multi-modal scan |
| `GET` | `/logs` | Query SQLite logs (`?limit=`, `?mode=`) |
| `GET` | `/logs/stats` | Aggregate stats (top species, avg confidence) |
| `POST` | `/logs/clear` | Wipe all detection logs |

---

## Analysis Modes

### Audio Mode
- **Input:** WAV / MP3 / M4A / WebM file or live 15-second microphone recording
- **Output:** Species, confidence, estimated distance, distance label

### Visual Mode
- **Input:** JPG / PNG / WebP or live webcam capture
- **Output:** Species, confidence, habitat zone, activity level, size class, frame coverage

### Fusion Mode
- **Input:** Audio + Image simultaneously
- **Output:** Fused species prediction with agreement/conflict detection
- **Formula:** `D = (c₁·d₁ + c₂·d₂ + c₃·d₃) / (c₁ + c₂ + c₃)`
- **Weighting:** 58% image / 42% audio; agreement boosts confidence 10%, conflict applies 5% penalty

---

## Species Coverage (35 Total)

### Birds (23)
American Pipit, Bobolink, Bank Swallow, Black-billed Cuckoo, Brewer's Blackbird, California Gull, Eastern Towhee, European Goldfinch, Fish Crow, Gray Catbird, Gray-crowned Rosy-Finch, Great Crested Flycatcher, House Sparrow, Indigo Bunting, Northern Cardinal, Orchard Oriole, Ovenbird, Pacific-slope Flycatcher, Painted Bunting, Purple Finch, Rufous Hummingbird, Rusty Blackbird, Yellow-breasted Chat

### Mammals (11)
Asian Elephant, Bear, Cat, Chicken, Cow, Donkey, Horse, Lion, Monkey, Sheep, Wolf / Dog

### Amphibians (1)
Frog

---

## Auth System

- Register with email — username is derived from the email prefix automatically
- Passwords are hashed (bcrypt) before storage
- Admin role supported via `is_admin` flag in the `users` table
- An admin account is seeded automatically on first run — **change the default credentials immediately**
- Login/register available as a full-page view (`auth.html`) or inline modal on the landing page (`auth_modal.css`)
- Session-based authentication — scanner dashboard is inaccessible without login
- Welcome toast shown on first login after registration
- Admin badge displayed in the scanner header for admin accounts

---

## Database Reference

All detections are stored in `wlds9.db` (SQLite — no extra install needed).

### 1. Access the database in bash terminal

```bash
sqlite3 wlds9.db
```

### 2. List all tables

```bash
.tables
```

| Table | Description |
|---|---|
| `detection_logs` | Scan history — one row per detection |
| `users` | Auth table — registered user accounts |

### 3. SQLite Query to Fetch History Records

```sql
SELECT id, timestamp, mode, species, confidence, distance, distance_label, logged_by
FROM detection_logs
WHERE is_error = 0
ORDER BY id DESC
LIMIT 20;
```

### 4. Delete From a User Table

```sql
DELETE FROM detection_logs;
DELETE FROM sqlite_sequence WHERE name='detection_logs';
```

### 5. For more commands, type `.help`

---

### Other Useful Queries

**Count scans per user:**
```sql
SELECT logged_by, COUNT(*) as total_scans
FROM detection_logs
WHERE is_error = 0
GROUP BY logged_by
ORDER BY total_scans DESC;
```

**Delete a specific user:**
```sql
DELETE FROM users WHERE username = 'example_user';
```

> **Recommended GUI:** Install the **SQLite Viewer** extension in VS Code and click `wlds9.db` to browse all data visually.

---

## Development Roadmap

| Stage | Status | Description |
|---|---|---|
| **Stage 1** | ✅ Complete | Dataset engineering — species list, folder structure |
| **Stage 2** | ✅ Complete | Model training on Kaggle — audio CNN, image CNN, GBR distance regression |
| **Stage 3** | ✅ Complete | Core inference engine — CLI-testable, all three models integrated |
| **Stage 4** | ✅ Complete | Flask API layer wired to inference engines |
| **Stage 5** | ✅ Complete | Frontend — scanner UI, all modes, species info panel |
| **Stage 6** | ✅ Complete | Auth system — register, login, sessions, admin badge, welcome toast |
| **Stage 7** | ✅ Complete | SQLite logging + Detection History page |
| **Stage 8** | ✅ Complete | Landing page — animated hero, mode cards, species cloud, auth modal |
| **Stage 9** | 🔲 Pending | Dockerise application |
| **Stage 10** | 🔲 Pending | Cloud hosting and deployment |
| **Stage 11** | 🔲 Pending | Production optimisation and threshold calibration |

---

## Dataset Sources

| Purpose | Dataset | Link |
|---|---|---|
| Bird audio | xeno-canto | https://xeno-canto.org |
| Bird images | iNaturalist | https://www.inaturalist.org |
| Audio (Kaggle) | BirdCLEF 2024 | https://www.kaggle.com/competitions/birdclef-2024 |
| Animal images | Animals Detection Dataset | https://www.kaggle.com/datasets/antoreepjana/animals-detection-images-dataset |

---

## Current Limitations

| Component | Current State | Target State |
|---|---|---|
| `fusion_engine.py` | Weighted fusion logic complete | Fine-tune agreement/conflict thresholds with real-world data |
| Species info panel | Hardcoded lookup table in `app.js` | Serve from DB / species API |
| Conservation data | Static, manually curated | Pull from IUCN Red List API |
| Deployment | Local only | Docker + cloud hosted |

---

## Future Transition

| Current | Replace With |
|---|---|
| Flask | FastAPI or embedded service |
| PyTorch `.pt` | TensorFlow Lite (edge deployment) |
| File uploads | Live sensor streams (microphone array + camera module) |
| SQLite | PostgreSQL or time-series DB |

Core fusion logic remains unchanged — that is the key asset.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3, Flask |
| ML Models | Audio CNN, Image CNN (MobileNet/ResNet), GBR distance regression |
| Database | SQLite (`wlds9.db`) |
| Frontend | Vanilla JS, CSS3, Font Awesome 6, Google Fonts (Inter + JetBrains Mono) |
| Auth | Flask sessions, bcrypt password hashing |

---

*WLDS-9 — Multi-Modal Species Identification System · v2.4.1 · © 2026*
