# Multi-Modal Species Identification System

> ✅ **Audio inference engine is now live** — the system runs a real trained CNN on mel-spectrogram features.
> Image and fusion engines are still in simulation mode. Field testing and threshold calibration are ongoing.

---

A multi-modal AI system for wildlife species identification using acoustic and visual sensor fusion. Built around a real CNN audio classifier trained on 35 species, with image and fusion pipelines under active development.

---

## Project Identity

| Property | Value |
|---|---|
| **System Name** | Multi-Modal Species Identification System |
| **Short Code** | MMSIS |
| **Audio Classes** | 35 species (birds, mammals, amphibians) |
| **Stage** | Audio — Live CNN inference / Image & Fusion — Simulation |
| **Goal** | Multi-modal species identification using audio + visual sensor fusion |

---

## Architecture

```
Frontend (Browser)
    ↓
Flask REST API  (app.py)
    ↓
Core Inference Engine  (core/inference.py)
    ├── audio_engine.py    → Real CNN on Mel-spectrogram (LIVE)
    ├── image_engine.py    → MobileNet/ResNet transfer learning (simulation)
    ├── distance_engine.py → Acoustic regression model (simulation)
    └── fusion_engine.py   → Weighted confidence fusion (simulation)
    ↓
SQLite Database  (wlds9.db)
    ↓
Detection History Page  (/history)
```

**Golden Rule:** Flask never contains ML logic. All intelligence lives in `core/`.

---

## Project Structure

```
project/
├── app.py                    ← Flask API layer (routes only)
├── auth.py                   ← Auth — register, login, decorators
├── wlds9.db                  ← SQLite detection log database
├── requirements.txt
│
├── core/
│   ├── __init__.py
│   ├── inference.py          ← Main pipeline orchestrator
│   ├── audio_engine.py       ← Real CNN audio classifier (LIVE)
│   ├── image_engine.py       ← Visual species classification (simulation)
│   ├── distance_engine.py    ← Distance estimation (simulation)
│   ├── fusion_engine.py      ← Multi-modal fusion logic (simulation)
│   └── logger.py             ← SQLite logging
│
├── models/
│   ├── AnimalSounds.keras/   ← Trained CNN model (SavedModel format)
│   │   ├── config.json
│   │   ├── metadata.json
│   │   └── model.weights.h5
│   └── labels.json           ← 35 class label names
│
├── templates/
│   ├── index.html            ← Main scanner UI
│   ├── history.html          ← Detection history page
│   └── auth.html             ← Login / Register page
│
├── static/
│   ├── css/
│   │   ├── style.css         ← Main stylesheet
│   │   └── history.css       ← History page styles
│   └── js/
│       ├── app.js            ← Main UI logic + SPECIES_DB
│       └── history.js        ← History page logic
```

---

## Setup & Run

### 1. Create virtual environment
```bash
python3 -m venv venv
source venv/bin/activate        # Linux/Mac
venv\Scripts\activate           # Windows
```

### 2. Install dependencies
```bash
pip install -r requirements.txt
```

### 3. Add model files
Place the trained model inside the `models/` folder:
```
models/
├── AnimalSounds.keras/     ← trained CNN (folder, not single file)
│   ├── config.json
│   ├── metadata.json
│   └── model.weights.h5
└── labels.json             ← 35 class names in training order
```

### 4. Start Flask server
```bash
python app.py
```

```
  WLDS-9 Online
  Scanner  →  http://127.0.0.1:5000
  History  →  http://127.0.0.1:5000/history
  Press CTRL+C to quit
```

---

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `GET` | `/` | Main scanner UI |
| `GET` | `/history` | Detection history page |
| `POST` | `/analyze/audio` | Audio-only species scan |
| `POST` | `/analyze/image` | Image-only species scan |
| `POST` | `/analyze/fusion` | Full multi-modal scan |
| `GET` | `/logs` | Query SQLite logs (`?limit=`, `?mode=`) |
| `GET` | `/logs/stats` | Aggregate stats (top species, avg confidence) |
| `POST` | `/logs/clear` | Wipe all detection logs (admin only) |

---

## Analysis Modes

### Audio Mode ✅ Live CNN
- Input: WAV / MP3 / M4A file or 15-second live recording
- Processing: Audio split into overlapping 4s chunks → mel-spectrogram (128 mel bins × 128 frames) → CNN inference → softmax scores averaged across all chunks
- Output: Species, confidence, estimated distance, animal type

### Image / Visual Mode ⚠️ Simulation
- Input: JPG / PNG / WebP or live camera capture
- Output: Species, confidence, habitat zone, activity level, size class, frame coverage, time of day

### Fusion Mode ⚠️ Simulation
- Input: Audio + Image together
- Output: Fused species prediction with agreement/conflict detection
- Formula: `D = (c₁·d₁ + c₂·d₂ + c₃·d₃) / (c₁ + c₂ + c₃)`
- Agreement boosts confidence by 10%; conflict applies 5% penalty

---

## Audio Model Details

| Property | Value |
|---|---|
| **Architecture** | 5-block CNN (Conv2D → MaxPool → BatchNorm) × 5 |
| **Input shape** | `(128, 128, 1)` mel-spectrogram |
| **Output** | 35-class softmax |
| **Training** | Kaggle — `ashutoshsharma091/animals-and-birds-dataset` |
| **Framework** | TensorFlow / Keras 3.x |
| **Inference** | CPU (chunked — overlapping 4s windows, scores averaged) |
| **Accuracy** | ~53% (baseline — retraining in progress) |

---

## Species Coverage (35 Audio Classes)

### Birds (24)
American Pipit, Northern Cardinal, European Goldfinch, Black-billed Cuckoo, Pacific-slope Flycatcher, Fish Crow, Bobolink, Gray Catbird, Rusty Blackbird, Brewer's Blackbird, Chicken, Purple Finch, Yellow-breasted Chat, Orchard Oriole, California Gull, Gray-crowned Rosy-Finch, Great Crested Flycatcher, House Sparrow, Painted Bunting, Indigo Bunting, Eastern Towhee, Bank Swallow, Ovenbird, Rufous Hummingbird

### Mammals (10)
Cow, Wolf / Dog, Monkey, Asian Elephant, Donkey, Horse, Cat, Sheep, Lion, Bear

### Amphibians (1)
Frog

---

## Authentication

The system includes a full user authentication layer:

- Register with email → username auto-generated from email prefix
- Login with username or email
- Role-based access: `user` and `admin`
- Admin features: view all users' detections, filter by user, clear all logs
- Default admin credentials: `admin` / `admin123` ← **change after first login**

---

## Database

All detections are stored in `wlds9.db` (SQLite).

```bash
# Query latest detections
sqlite3 wlds9.db "SELECT id, species, confidence, distance, mode FROM detection_logs ORDER BY id DESC LIMIT 10;"

# Open interactive shell
sqlite3 wlds9.db
.mode column
.headers on
SELECT * FROM detection_logs ORDER BY id DESC LIMIT 20;
```

**Recommended GUI:** Install the **SQLite Viewer** extension in VS Code and click `wlds9.db`.

---

## Development Roadmap

| Stage | Status | Description |
|---|---|---|
| **Stage 1** | ✅ Complete | Dataset engineering — species list, folder structure |
| **Stage 2** | ✅ Complete | Audio CNN trained on Kaggle (35 classes, ~53% accuracy) |
| **Stage 3** | ✅ Complete | Core inference engine built and CLI-testable |
| **Stage 4** | ✅ Complete | Flask API layer + user authentication |
| **Stage 5** | ✅ Complete | Frontend — all UI modes, species info panel, history page |
| **Stage 6** | ✅ Complete | SQLite logging + Detection History page |
| **Stage 7** | ✅ Complete | Real audio CNN integrated — chunked inference pipeline live |
| **Stage 8** | 🔄 In Progress | Retrain audio model with more epochs for higher accuracy |
| **Stage 9** | 🔲 Pending | Train and integrate image classification model |
| **Stage 10** | 🔲 Pending | Real-world field testing and threshold calibration |

---

## Current Limitations

| Component | Current State | Target State |
|---|---|---|
| `audio_engine.py` | Real CNN — 35 classes, ~53% accuracy | Retrain with more epochs / better augmentation |
| `image_engine.py` | Returns simulated species + visual metadata | Train MobileNet/ResNet on real labelled images |
| `distance_engine.py` | Simulates distance using confidence heuristic | Trained regression model on loudness + spectral features |
| `fusion_engine.py` | Weighted confidence fusion logic works — fed by simulation | Same logic, fed by real model outputs |
| Species info panel | Hardcoded lookup table in `app.js` | Should be served from DB / species API |
| Conservation data | Static, manually curated | Should pull from IUCN Red List API |

---

## Performance

| Resource | Spec |
|---|---|
| Training | Kaggle (cloud GPU) |
| Inference | CPU only (no CUDA on current machine) |
| First scan | ~5–10 seconds (model loading + inference) |
| Subsequent scans | ~2–4 seconds (model already loaded) |
| Audio chunking | 15s recording → ~14 overlapping 4s chunks |

---

## Core Intellectual Property

- **Chunked audio inference** — overlapping 4s window sliding over full recording, scores averaged for better accuracy
- **Fusion strategy** — weighted confidence fusion across audio, image, and distance modalities
- **Hybrid distance model** — acoustic inverse-square-law + visual frame coverage + simulated TDOA
- **Execution pipeline** — framework-independent core, swappable transport layer

---

## Future Transition (Post-Funding)

| Current | Replace With |
|---|---|
| Flask | FastAPI or embedded service |
| TensorFlow Keras | TensorFlow Lite (edge deployment) |
| File uploads | Live sensor streams (microphone array + camera module) |
| SQLite | PostgreSQL or time-series DB |
| CPU inference | Dedicated NPU / edge accelerator |

Core fusion logic remains unchanged — that is the key asset.

---

*Multi-Modal Species Identification System — Wildlife AI*