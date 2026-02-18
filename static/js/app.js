/* ═══════════════════════════════════════
   WLDS-9 — FRONTEND DEVICE CONTROLLER
═══════════════════════════════════════ */

'use strict';

// ─── STATE ───────────────────────────────────
const state = {
    mode: 'audio',
    recordedAudioBlob: null,
    capturedImageBlob: null,
    cameraStream: null,
    isRecording: false,
    isScanning: false,
    startTime: Date.now(),
    scanCount: 0
};

// ─── DOM REFS ─────────────────────────────────
const $ = id => document.getElementById(id);

const dom = {
    mode:          $('mode'),
    audioFile:     $('audioFile'),
    imageFile:     $('imageFile'),
    audioPreview:  $('audioPreview'),
    cameraPreview: $('cameraPreview'),
    photoCanvas:   $('photoCanvas'),
    waveformCanvas:$('waveformCanvas'),
    radarCanvas:   $('radarCanvas'),
    recordBtn:     $('recordAudioBtn'),
    recordProgress:$('recordProgress'),
    recordFill:    $('recordFill'),
    recordLabel:   $('recordLabel'),
    openCameraBtn: $('openCameraBtn'),
    captureBtn:    $('capturePhotoBtn'),
    analyzeBtn:    $('analyzeBtn'),
    species:       $('species'),
    speciesType:   $('speciesType'),
    confidence:    $('confidence'),
    confFill:      $('confFill'),
    distance:      $('distance'),
    modeDisplay:   $('modeDisplay'),
    threatLevel:   $('threatLevel'),
    scanStatus:    $('scanStatus'),
    logFeed:       $('logFeed'),
    jsonOutput:    $('jsonOutput'),
    historyList:   $('historyList'),
    clock:         $('clock'),
    uptime:        $('uptime'),
    footerStatus:  $('footerStatus'),
    recLed:        $('recLed'),
    audioBlock:    $('audioBlock'),
    imageBlock:    $('imageBlock'),
    viewportIdle:  $('viewportIdle'),
    clearLogs:     $('clearLogs'),
    audioFill:     $('audioFill'),
    imageFill:     $('imageFill'),
    distFill:      $('distFill'),
    fusionFill:    $('fusionFill'),
    audioPct:      $('audioPct'),
    imagePct:      $('imagePct'),
    distPct:       $('distPct'),
    fusionPct:     $('fusionPct'),
};

// ─── CLOCK & UPTIME ───────────────────────────
function updateClock() {
    const now = new Date();
    dom.clock.textContent = now.toTimeString().slice(0, 8);

    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    const h = String(Math.floor(elapsed / 3600)).padStart(2, '0');
    const m = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
    const s = String(elapsed % 60).padStart(2, '0');
    dom.uptime.textContent = `UP: ${h}:${m}:${s}`;
}

setInterval(updateClock, 1000);
updateClock();

// ─── WAVEFORM ANIMATION ───────────────────────
const wCtx = dom.waveformCanvas.getContext('2d');
let wavePoints = Array(60).fill(0);
let waveAnimId = null;
let waveActive = false;

function drawWaveform(active) {
    const w = dom.waveformCanvas.width;
    const h = dom.waveformCanvas.height;
    const mid = h / 2;

    wCtx.clearRect(0, 0, w, h);

    // Grid lines
    wCtx.strokeStyle = 'rgba(30,58,90,0.5)';
    wCtx.lineWidth = 0.5;
    for (let y = 0; y <= h; y += h / 4) {
        wCtx.beginPath();
        wCtx.moveTo(0, y);
        wCtx.lineTo(w, y);
        wCtx.stroke();
    }

    // Center line
    wCtx.strokeStyle = 'rgba(0,255,136,0.15)';
    wCtx.lineWidth = 0.5;
    wCtx.beginPath();
    wCtx.moveTo(0, mid);
    wCtx.lineTo(w, mid);
    wCtx.stroke();

    // Shift wave
    wavePoints.shift();
    const amp = active
        ? (Math.random() * 0.7 + 0.1) * mid * 0.85
        : Math.random() * 2;
    wavePoints.push(amp);

    // Draw wave
    const step = w / (wavePoints.length - 1);
    wCtx.beginPath();
    wCtx.moveTo(0, mid);
    wavePoints.forEach((p, i) => {
        const x = i * step;
        const y = mid + (i % 2 === 0 ? p : -p);
        wCtx.lineTo(x, y);
    });

    wCtx.strokeStyle = active ? '#00ff88' : '#1a3a55';
    wCtx.lineWidth = 1.5;
    wCtx.shadowColor = active ? '#00ff88' : 'transparent';
    wCtx.shadowBlur = active ? 4 : 0;
    wCtx.stroke();
    wCtx.shadowBlur = 0;

    waveAnimId = requestAnimationFrame(() => drawWaveform(waveActive));
}

drawWaveform(false);

// ─── RADAR ANIMATION ──────────────────────────
const rCtx = dom.radarCanvas.getContext('2d');
let radarAngle = 0;
let radarDots = [];
let radarScan = false;

function drawRadar() {
    const size = dom.radarCanvas.width;
    const cx = size / 2, cy = size / 2, r = size / 2 - 8;

    rCtx.clearRect(0, 0, size, size);

    // Background
    rCtx.fillStyle = '#040a0f';
    rCtx.beginPath();
    rCtx.arc(cx, cy, r, 0, Math.PI * 2);
    rCtx.fill();

    // Rings
    [0.25, 0.5, 0.75, 1].forEach(scale => {
        rCtx.beginPath();
        rCtx.arc(cx, cy, r * scale, 0, Math.PI * 2);
        rCtx.strokeStyle = 'rgba(26,58,85,0.7)';
        rCtx.lineWidth = 0.5;
        rCtx.stroke();
    });

    // Cross hairs
    rCtx.strokeStyle = 'rgba(26,58,85,0.5)';
    rCtx.lineWidth = 0.5;
    rCtx.beginPath(); rCtx.moveTo(cx, cy - r); rCtx.lineTo(cx, cy + r); rCtx.stroke();
    rCtx.beginPath(); rCtx.moveTo(cx - r, cy); rCtx.lineTo(cx + r, cy); rCtx.stroke();

    // Sweep gradient
    const sweepGrad = rCtx.createConicalGradient
        ? null : null; // fallback below

    const rad = radarAngle * (Math.PI / 180);
    for (let a = 0; a < 60; a++) {
        const angle = (rad - (a * Math.PI / 180) + Math.PI * 2) % (Math.PI * 2);
        const opacity = Math.max(0, (60 - a) / 60) * 0.35;
        rCtx.beginPath();
        rCtx.moveTo(cx, cy);
        rCtx.arc(cx, cy, r - 1, angle, angle + 0.02);
        rCtx.strokeStyle = `rgba(0,255,136,${opacity})`;
        rCtx.lineWidth = 1;
        rCtx.stroke();
    }

    // Sweep line
    rCtx.beginPath();
    rCtx.moveTo(cx, cy);
    rCtx.lineTo(
        cx + (r - 1) * Math.cos(rad),
        cy + (r - 1) * Math.sin(rad)
    );
    rCtx.strokeStyle = '#00ff88';
    rCtx.lineWidth = 1.5;
    rCtx.shadowColor = '#00ff88';
    rCtx.shadowBlur = 8;
    rCtx.stroke();
    rCtx.shadowBlur = 0;

    // Dots (detections)
    radarDots = radarDots.filter(d => d.life > 0);
    radarDots.forEach(d => {
        const alpha = d.life / d.maxLife;
        rCtx.beginPath();
        rCtx.arc(d.x, d.y, d.size, 0, Math.PI * 2);
        rCtx.fillStyle = `rgba(0,255,136,${alpha})`;
        rCtx.shadowColor = '#00ff88';
        rCtx.shadowBlur = 8;
        rCtx.fill();
        rCtx.shadowBlur = 0;
        d.life -= radarScan ? 0.5 : 1;
    });

    // Border
    rCtx.beginPath();
    rCtx.arc(cx, cy, r, 0, Math.PI * 2);
    rCtx.strokeStyle = 'rgba(26,58,85,0.8)';
    rCtx.lineWidth = 1;
    rCtx.stroke();

    radarAngle = (radarAngle + (radarScan ? 3 : 1.5)) % 360;
    requestAnimationFrame(drawRadar);
}

drawRadar();

function spawnRadarDot() {
    const size = dom.radarCanvas.width;
    const cx = size / 2, cy = size / 2, r = size / 2 - 20;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * r * 0.8 + 10;
    radarDots.push({
        x: cx + dist * Math.cos(angle),
        y: cy + dist * Math.sin(angle),
        size: Math.random() * 3 + 2,
        life: 120,
        maxLife: 120
    });
}

// ─── MODE SWITCHING ───────────────────────────
document.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.mode = btn.dataset.mode;
        dom.modeDisplay.textContent = state.mode.toUpperCase();

        if (state.mode === 'image') {
            dom.audioBlock.style.display = 'none';
            dom.imageBlock.style.display = 'block';
        } else if (state.mode === 'audio') {
            dom.audioBlock.style.display = 'block';
            dom.imageBlock.style.display = 'none';
        } else {
            // fusion — show both
            dom.audioBlock.style.display = 'block';
            dom.imageBlock.style.display = 'block';
        }

        addLog(`MODE SWITCHED → ${state.mode.toUpperCase()}`, 'info');
    });
});

// ─── AUDIO RECORDING ──────────────────────────
let mediaRecorder, audioChunks = [];

dom.recordBtn.addEventListener('click', async () => {
    if (state.isRecording) return;

    try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorder = new MediaRecorder(stream);
        audioChunks = [];

        mediaRecorder.ondataavailable = e => audioChunks.push(e.data);

        mediaRecorder.onstop = () => {
            state.recordedAudioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            dom.audioPreview.src = URL.createObjectURL(state.recordedAudioBlob);
            stream.getTracks().forEach(t => t.stop());
            state.isRecording = false;
            waveActive = false;
            dom.recordBtn.classList.remove('recording');
            dom.recLed.style.opacity = '0.2';
            dom.recordProgress.style.display = 'none';
            dom.recordFill.style.width = '0%';
            addLog('AUDIO SAMPLE CAPTURED — 5s BUFFER', 'success');
        };

        mediaRecorder.start();
        state.isRecording = true;
        waveActive = true;
        dom.recordBtn.classList.add('recording');
        dom.recLed.style.opacity = '1';
        dom.recordProgress.style.display = 'block';

        addLog('RECORDING ACOUSTIC SAMPLE...', 'warn');

        // Progress
        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 100;
            const pct = (elapsed / 5000) * 100;
            dom.recordFill.style.width = pct + '%';
            dom.recordLabel.textContent = `RECORDING... ${((5000 - elapsed) / 1000).toFixed(1)}s`;
            if (elapsed >= 5000) clearInterval(interval);
        }, 100);

        setTimeout(() => mediaRecorder.stop(), 5000);

    } catch {
        addLog('MICROPHONE ACCESS DENIED', 'error');
    }
});

// ─── FILE UPLOADS ────────────────────────────
dom.audioFile.addEventListener('change', () => {
    if (dom.audioFile.files[0]) {
        dom.audioPreview.src = URL.createObjectURL(dom.audioFile.files[0]);
        waveActive = true;
        setTimeout(() => { waveActive = false; }, 2000);
        addLog(`AUDIO FILE LOADED: ${dom.audioFile.files[0].name}`, 'success');
    }
});

dom.imageFile.addEventListener('change', () => {
    if (dom.imageFile.files[0]) {
        const url = URL.createObjectURL(dom.imageFile.files[0]);
        dom.photoCanvas.style.display = 'block';
        dom.cameraPreview.style.display = 'none';
        dom.viewportIdle.style.display = 'none';
        const img = new Image();
        img.onload = () => {
            dom.photoCanvas.width = img.width;
            dom.photoCanvas.height = img.height;
            dom.photoCanvas.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = url;
        state.capturedImageBlob = dom.imageFile.files[0];
        addLog(`IMAGE FILE LOADED: ${dom.imageFile.files[0].name}`, 'success');
    }
});

// ─── CAMERA ───────────────────────────────────
dom.openCameraBtn.addEventListener('click', async () => {
    try {
        state.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
        dom.cameraPreview.srcObject = state.cameraStream;
        dom.cameraPreview.style.display = 'block';
        dom.viewportIdle.style.display = 'none';
        addLog('OPTICAL SENSOR ONLINE', 'success');
    } catch {
        addLog('CAMERA ACCESS DENIED', 'error');
    }
});

dom.captureBtn.addEventListener('click', () => {
    if (!state.cameraStream) {
        addLog('OPEN CAMERA FIRST', 'warn');
        return;
    }
    const video = dom.cameraPreview;
    const canvas = dom.photoCanvas;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.style.display = 'block';
    canvas.toBlob(blob => { state.capturedImageBlob = blob; }, 'image/jpeg');
    addLog('PHOTO CAPTURED — OPTICAL BUFFER SAVED', 'success');
});

// ─── ANALYZE ──────────────────────────────────
dom.analyzeBtn.addEventListener('click', runAnalysis);

async function runAnalysis() {
    if (state.isScanning) return;
    state.isScanning = true;
    state.scanCount++;

    dom.analyzeBtn.classList.add('scanning');
    dom.analyzeBtn.querySelector('.analyze-text').textContent = '⟳ SCANNING...';
    dom.scanStatus.textContent = 'SCANNING';
    dom.footerStatus.textContent = 'STATUS: SCANNING';
    radarScan = true;
    waveActive = true;

    addLog(`SCAN #${state.scanCount} INITIATED — MODE: ${state.mode.toUpperCase()}`, 'warn');
    addLog('LOADING AUDIO CNN...', 'info');

    const formData = new FormData();
    const audioFile = dom.audioFile.files[0];
    const imageFile = dom.imageFile.files[0];

    if (audioFile) formData.append('audio', audioFile);
    else if (state.recordedAudioBlob) formData.append('audio', state.recordedAudioBlob);

    if (imageFile) formData.append('image', imageFile);
    else if (state.capturedImageBlob) formData.append('image', state.capturedImageBlob);

    try {
        const res = await fetch('/analyze/' + state.mode, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();
        handleResult(data);
    } catch {
        // Demo fallback
        const demos = {
            audio:  { species: 'Indian Sparrow',  type: 'BIRD',   confidence: 0.87, distance: 18.4 },
            image:  { species: 'Common Myna',      type: 'BIRD',   confidence: 0.91, distance: 22.0 },
            fusion: { species: 'Indian Peacock',   type: 'BIRD',   confidence: 0.95, distance: 35.6 }
        };
        addLog('DEMO MODE — SERVER OFFLINE', 'warn');
        handleResult(demos[state.mode]);
    }

    dom.analyzeBtn.classList.remove('scanning');
    dom.analyzeBtn.querySelector('.analyze-text').textContent = '⟫ INITIATE SCAN';
    dom.scanStatus.textContent = 'COMPLETE';
    dom.footerStatus.textContent = 'STATUS: STANDBY';
    radarScan = false;
    waveActive = false;
    state.isScanning = false;

    // Spawn radar blips
    for (let i = 0; i < 3; i++) setTimeout(spawnRadarDot, i * 200);
}

// ─── HANDLE RESULT ────────────────────────────
function handleResult(data) {
    const conf = data.confidence || 0;
    const dist = data.distance || null;
    const species = data.species || 'UNKNOWN';
    const type = data.type || '—';

    dom.species.textContent = species.toUpperCase();
    dom.speciesType.textContent = `CLASS: ${type}`;
    dom.confidence.textContent = (conf * 100).toFixed(1) + '%';
    dom.confFill.style.width = (conf * 100) + '%';
    dom.distance.textContent = dist ? dist.toFixed(1) + ' m' : '— m';
    dom.modeDisplay.textContent = state.mode.toUpperCase();
    dom.threatLevel.textContent = conf > 0.9 ? 'VERIFIED' : conf > 0.7 ? 'PROBABLE' : 'UNCERTAIN';

    // Model bars
    if (state.mode === 'audio') {
        setModelBar('audio', conf);
        setModelBar('image', 0);
        setModelBar('dist', conf * 0.76);
        setModelBar('fusion', 0);
    } else if (state.mode === 'image') {
        setModelBar('audio', 0);
        setModelBar('image', conf);
        setModelBar('dist', conf * 0.7);
        setModelBar('fusion', 0);
    } else {
        setModelBar('audio', conf * 0.87);
        setModelBar('image', conf * 0.91);
        setModelBar('dist', conf * 0.76);
        setModelBar('fusion', conf);
    }

    // Signal bars
    animateSignalBars(conf);

    // Logs
    addLog(`SPECIES IDENTIFIED: ${species.toUpperCase()}`, 'success');
    addLog(`CONFIDENCE: ${(conf * 100).toFixed(1)}%  DISTANCE: ${dist ? dist.toFixed(1) + 'm' : 'N/A'}`, 'success');

    // JSON
    dom.jsonOutput.textContent = JSON.stringify(data, null, 2);

    // History
    addHistory(species, conf);
}

function setModelBar(model, pct) {
    const p = Math.min(100, pct * 100);
    dom[model + 'Fill'].style.width = p + '%';
    dom[model + 'Pct'].textContent = p.toFixed(0) + '%';
}

function animateSignalBars(conf) {
    const bars = document.querySelectorAll('.sig-bar');
    bars.forEach((bar, i) => {
        setTimeout(() => {
            const h = Math.random() * conf * 80 + 10;
            bar.style.height = h + '%';
            bar.style.background = conf > 0.8
                ? 'var(--green-dim)'
                : conf > 0.6
                    ? 'var(--amber-dim)'
                    : 'var(--red-dim)';
            bar.style.borderColor = conf > 0.8
                ? 'var(--green)'
                : conf > 0.6
                    ? 'var(--amber)'
                    : 'var(--red)';
        }, i * 50);
    });
}

// ─── LOG FEED ─────────────────────────────────
function addLog(msg, type = 'info') {
    const now = new Date().toTimeString().slice(0, 8);
    const entry = document.createElement('div');
    entry.className = `log-entry ${type}`;
    entry.innerHTML = `<span class="log-time">${now}</span><span class="log-msg">» ${msg}</span>`;
    dom.logFeed.appendChild(entry);
    dom.logFeed.scrollTop = dom.logFeed.scrollHeight;
}

dom.clearLogs.addEventListener('click', () => {
    dom.logFeed.innerHTML = '';
    dom.jsonOutput.textContent = '// Cleared.';
    addLog('LOG CLEARED', 'info');
});

// ─── DETECTION HISTORY ────────────────────────
function addHistory(species, conf) {
    const empty = dom.historyList.querySelector('.history-empty');
    if (empty) empty.remove();

    const now = new Date().toTimeString().slice(0, 5);
    const item = document.createElement('div');
    item.className = 'history-item';
    item.innerHTML = `
        <span class="history-species">${species.toUpperCase()}</span>
        <span class="history-conf">${(conf * 100).toFixed(0)}%</span>
        <span class="history-time">${now}</span>
    `;
    dom.historyList.prepend(item);

    // Max 10
    const items = dom.historyList.querySelectorAll('.history-item');
    if (items.length > 10) items[items.length - 1].remove();
}