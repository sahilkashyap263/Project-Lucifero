/**
 * ═══════════════════════════════════════
 * WLDS-9 WILDLIFE DETECTION SYSTEM
 * Main Application JavaScript
 * ═══════════════════════════════════════
 */

'use strict';

// ────────────────────────────────────────
// STATE MANAGEMENT
// ────────────────────────────────────────
const appState = {
    mode: 'audio',
    recordedAudioBlob: null,
    capturedImageBlob: null,
    cameraStream: null,
    isRecording: false,
    isScanning: false,
    startTime: Date.now(),
    scanCount: 0
};

// ────────────────────────────────────────
// DOM CACHE - Performance optimization
// ────────────────────────────────────────
const dom = (() => {
    const $ = id => document.getElementById(id);
    
    return {
        // File inputs
        audioFile: $('audioFile'),
        imageFile: $('imageFile'),
        
        // Media elements
        audioPreview: $('audioPreview'),
        cameraPreview: $('cameraPreview'),
        photoCanvas: $('photoCanvas'),
        waveformCanvas: $('waveformCanvas'),
        
        // Controls
        recordBtn: $('recordBtn'),
        recordProgress: $('recordProgress'),
        recordFill: $('recordFill'),
        recordIcon: $('recordIcon'),
        recordText: $('recordText'),
        openCameraBtn: $('openCameraBtn'),
        captureBtn: $('captureBtn'),
        analyzeBtn: $('analyzeBtn'),
        analyzeBtnText: $('analyzeBtnText'),
        
        // Display elements
        species: $('species'),
        speciesType: $('speciesType'),
        confidence: $('confidence'),
        confFill: $('confFill'),
        distance: $('distance'),
        modeDisplay: $('modeDisplay'),
        threatLevel: $('threatLevel'),
        scanStatus: $('scanStatus'),
        
        // Logs & output
        logFeed: $('logFeed'),
        jsonOutput: $('jsonOutput'),
        historyList: $('historyList'),
        clearLogs: $('clearLogs'),
        
        // Stats
        uptime: $('uptime'),
        scanCount: $('scanCount'),
        
        // Sections
        audioSection: $('audioSection'),
        imageSection: $('imageSection'),
        cameraIdle: $('cameraIdle'),
        
        // Model bars
        audioFill: $('audioFill'),
        imageFill: $('imageFill'),
        distFill: $('distFill'),
        fusionFill: $('fusionFill'),
        audioPct: $('audioPct'),
        imagePct: $('imagePct'),
        distPct: $('distPct'),
        fusionPct: $('fusionPct'),
        
        // Theme
        themeToggle: $('themeToggle'),
        themeIcon: $('themeIcon')
    };
})();

// ────────────────────────────────────────
// THEME MANAGEMENT
// ────────────────────────────────────────
const ThemeManager = {
    init() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        this.setTheme(savedTheme);
        dom.themeToggle.addEventListener('click', () => this.toggle());
    },
    
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
        dom.themeIcon.textContent = theme === 'dark' ? '☀️' : '🌙';
    },
    
    toggle() {
        const current = document.documentElement.getAttribute('data-theme');
        this.setTheme(current === 'dark' ? 'light' : 'dark');
    }
};

// ────────────────────────────────────────
// UPTIME COUNTER
// ────────────────────────────────────────
const UptimeCounter = {
    init() {
        this.update();
        setInterval(() => this.update(), 1000);
    },
    
    update() {
        const elapsed = Math.floor((Date.now() - appState.startTime) / 1000);
        const hours = String(Math.floor(elapsed / 3600)).padStart(2, '0');
        const minutes = String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0');
        const seconds = String(elapsed % 60).padStart(2, '0');
        dom.uptime.textContent = `${hours}:${minutes}:${seconds}`;
    }
};

// ────────────────────────────────────────
// WAVEFORM VISUALIZATION
// ────────────────────────────────────────
const WaveformVisualizer = {
    ctx: null,
    points: Array(60).fill(0),
    active: false,
    animationId: null,
    
    init() {
        this.ctx = dom.waveformCanvas.getContext('2d', { alpha: false });
        this.draw();
    },
    
    setActive(active) {
        this.active = active;
    },
    
    draw() {
        const { width, height } = dom.waveformCanvas;
        const mid = height / 2;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, width, height);
        
        // Draw grid
        this.ctx.strokeStyle = 'rgba(209,213,219,0.5)';
        this.ctx.lineWidth = 0.5;
        for (let y = 0; y <= height; y += height / 4) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(width, y);
            this.ctx.stroke();
        }
        
        // Update points
        this.points.shift();
        const amplitude = this.active 
            ? (Math.random() * 0.7 + 0.1) * mid * 0.9 
            : Math.random() * 2;
        this.points.push(amplitude);
        
        // Draw wave
        const step = width / (this.points.length - 1);
        this.ctx.beginPath();
        this.ctx.moveTo(0, mid);
        
        this.points.forEach((point, i) => {
            const x = i * step;
            const y = mid + (i % 2 === 0 ? point : -point);
            this.ctx.lineTo(x, y);
        });
        
        this.ctx.strokeStyle = this.active ? '#06b6d4' : '#d1d5db';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();
        
        // Continue animation loop
        this.animationId = requestAnimationFrame(() => this.draw());
    }
};

// ────────────────────────────────────────
// MODE MANAGER
// ────────────────────────────────────────
const ModeManager = {
    init() {
        document.querySelectorAll('.mode-card').forEach(card => {
            card.addEventListener('click', (e) => this.switchMode(e.currentTarget));
        });
    },
    
    switchMode(card) {
        // Update UI
        document.querySelectorAll('.mode-card').forEach(c => {
            c.classList.remove('active');
            c.setAttribute('aria-pressed', 'false');
        });
        card.classList.add('active');
        card.setAttribute('aria-pressed', 'true');
        
        // Update state
        appState.mode = card.dataset.mode;
        dom.modeDisplay.textContent = appState.mode.toUpperCase();
        
        // Toggle sections
        if (appState.mode === 'image') {
            dom.audioSection.style.display = 'none';
            dom.imageSection.style.display = 'block';
        } else if (appState.mode === 'audio') {
            dom.audioSection.style.display = 'block';
            dom.imageSection.style.display = 'none';
        } else {
            dom.audioSection.style.display = 'block';
            dom.imageSection.style.display = 'block';
        }
        
        Logger.add(`Mode switched to ${appState.mode.toUpperCase()}`);
    }
};

// ────────────────────────────────────────
// AUDIO RECORDER
// ────────────────────────────────────────
const AudioRecorder = {
    mediaRecorder: null,
    audioChunks: [],
    
    init() {
        dom.recordBtn.addEventListener('click', () => this.toggleRecording());
    },
    
    async toggleRecording() {
        if (appState.isRecording) return;
        
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            this.mediaRecorder = new MediaRecorder(stream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = e => this.audioChunks.push(e.data);
            this.mediaRecorder.onstop = () => this.handleStop(stream);
            
            this.mediaRecorder.start();
            this.startRecording();
            
        } catch (error) {
            Logger.add('Microphone access denied', 'error');
        }
    },
    
    startRecording() {
        appState.isRecording = true;
        WaveformVisualizer.setActive(true);
        
        dom.recordBtn.classList.add('recording');
        dom.recordIcon.textContent = '⏺️';
        dom.recordText.textContent = 'Recording...';
        dom.recordProgress.style.display = 'block';
        
        Logger.add('Recording acoustic sample...', 'warn');
        
        // Progress animation
        let elapsed = 0;
        const interval = setInterval(() => {
            elapsed += 100;
            dom.recordFill.style.width = `${(elapsed / 5000) * 100}%`;
            if (elapsed >= 5000) clearInterval(interval);
        }, 100);
        
        setTimeout(() => this.mediaRecorder.stop(), 5000);
    },
    
    handleStop(stream) {
        appState.recordedAudioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
        dom.audioPreview.src = URL.createObjectURL(appState.recordedAudioBlob);
        
        stream.getTracks().forEach(track => track.stop());
        
        appState.isRecording = false;
        WaveformVisualizer.setActive(false);
        
        dom.recordBtn.classList.remove('recording');
        dom.recordIcon.textContent = '🎤';
        dom.recordText.textContent = 'Record 5s Sample';
        dom.recordProgress.style.display = 'none';
        
        Logger.add('Audio sample captured (5s)', 'success');
    }
};

// ────────────────────────────────────────
// FILE HANDLERS
// ────────────────────────────────────────
const FileHandlers = {
    init() {
        dom.audioFile.addEventListener('change', () => this.handleAudioFile());
        dom.imageFile.addEventListener('change', () => this.handleImageFile());
    },
    
    handleAudioFile() {
        const file = dom.audioFile.files[0];
        if (!file) return;
        
        dom.audioPreview.src = URL.createObjectURL(file);
        WaveformVisualizer.setActive(true);
        setTimeout(() => WaveformVisualizer.setActive(false), 2000);
        
        Logger.add(`Audio file loaded: ${file.name}`, 'success');
    },
    
    handleImageFile() {
        const file = dom.imageFile.files[0];
        if (!file) return;
        
        const img = new Image();
        img.onload = () => {
            dom.photoCanvas.width = img.width;
            dom.photoCanvas.height = img.height;
            dom.photoCanvas.getContext('2d').drawImage(img, 0, 0);
        };
        img.src = URL.createObjectURL(file);
        
        dom.photoCanvas.style.display = 'block';
        dom.cameraPreview.style.display = 'none';
        dom.cameraIdle.style.display = 'none';
        
        appState.capturedImageBlob = file;
        Logger.add(`Image file loaded: ${file.name}`, 'success');
    }
};

// ────────────────────────────────────────
// CAMERA HANDLER
// ────────────────────────────────────────
const CameraHandler = {
    init() {
        dom.openCameraBtn.addEventListener('click', () => this.openCamera());
        dom.captureBtn.addEventListener('click', () => this.capturePhoto());
    },
    
    async openCamera() {
        try {
            appState.cameraStream = await navigator.mediaDevices.getUserMedia({ video: true });
            dom.cameraPreview.srcObject = appState.cameraStream;
            dom.cameraPreview.style.display = 'block';
            dom.cameraIdle.style.display = 'none';
            
            Logger.add('Camera activated', 'success');
        } catch (error) {
            Logger.add('Camera access denied', 'error');
        }
    },
    
    capturePhoto() {
        if (!appState.cameraStream) {
            Logger.add('Open camera first', 'warn');
            return;
        }
        
        const video = dom.cameraPreview;
        const canvas = dom.photoCanvas;
        
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        canvas.getContext('2d').drawImage(video, 0, 0);
        canvas.style.display = 'block';
        
        canvas.toBlob(blob => {
            appState.capturedImageBlob = blob;
        }, 'image/jpeg');
        
        Logger.add('Photo captured', 'success');
    }
};

// ────────────────────────────────────────
// ANALYZER
// ────────────────────────────────────────
const Analyzer = {
    init() {
        dom.analyzeBtn.addEventListener('click', () => this.runScan());
    },
    
    async runScan() {
        if (appState.isScanning) return;
        
        this.startScan();
        
        const formData = this.buildFormData();
        
        try {
            const response = await fetch(`/analyze/${appState.mode}`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            ResultsHandler.display(data);
            
        } catch (error) {
            // Fallback to demo data if server is offline
            Logger.add('Demo mode - Server offline', 'warn');
            ResultsHandler.display(this.getDemoData());
        }
        
        this.endScan();
    },
    
    startScan() {
        appState.isScanning = true;
        appState.scanCount++;
        
        dom.scanCount.textContent = appState.scanCount;
        dom.analyzeBtn.classList.add('scanning');
        dom.analyzeBtnText.textContent = 'Scanning...';
        dom.scanStatus.textContent = 'SCANNING';
        
        WaveformVisualizer.setActive(true);
        
        Logger.add(`Scan #${appState.scanCount} initiated - Mode: ${appState.mode.toUpperCase()}`, 'warn');
    },
    
    endScan() {
        appState.isScanning = false;
        
        dom.analyzeBtn.classList.remove('scanning');
        dom.analyzeBtnText.textContent = 'Initiate Scan';
        dom.scanStatus.textContent = 'COMPLETE';
        
        WaveformVisualizer.setActive(false);
    },
    
    buildFormData() {
        const formData = new FormData();
        
        const audioFile = dom.audioFile.files[0];
        const imageFile = dom.imageFile.files[0];
        
        if (audioFile) {
            formData.append('audio', audioFile);
        } else if (appState.recordedAudioBlob) {
            formData.append('audio', appState.recordedAudioBlob);
        }
        
        if (imageFile) {
            formData.append('image', imageFile);
        } else if (appState.capturedImageBlob) {
            formData.append('image', appState.capturedImageBlob);
        }
        
        return formData;
    },
    
    getDemoData() {
        const demoResponses = {
            audio: { species: 'Indian Sparrow', type: 'BIRD', confidence: 0.87, distance: 18.4 },
            image: { species: 'Common Myna', type: 'BIRD', confidence: 0.91, distance: 22.0 },
            fusion: { species: 'Indian Peacock', type: 'BIRD', confidence: 0.95, distance: 35.6 }
        };
        return demoResponses[appState.mode];
    }
};

// ────────────────────────────────────────
// RESULTS HANDLER
// ────────────────────────────────────────
const ResultsHandler = {
    display(data) {
        const { species = 'UNKNOWN', type = '—', confidence = 0, distance = null } = data;
        
        // Update main display
        dom.species.textContent = species.toUpperCase();
        dom.speciesType.textContent = `Class: ${type}`;
        dom.confidence.textContent = `${(confidence * 100).toFixed(1)}%`;
        dom.confFill.style.width = `${confidence * 100}%`;
        dom.distance.textContent = distance ? distance.toFixed(1) : '—';
        dom.modeDisplay.textContent = appState.mode.toUpperCase();
        
        // Threat level
        dom.threatLevel.textContent = confidence > 0.9 ? 'VERIFIED' 
            : confidence > 0.7 ? 'PROBABLE' 
            : 'UNCERTAIN';
        
        // Update model bars
        this.updateModelBars(confidence);
        
        // Logs
        Logger.add(`Species identified: ${species.toUpperCase()}`, 'success');
        Logger.add(`Confidence: ${(confidence * 100).toFixed(1)}%  Distance: ${distance ? distance.toFixed(1) + 'm' : 'N/A'}`, 'success');
        
        // Raw JSON
        dom.jsonOutput.textContent = JSON.stringify(data, null, 2);
        
        // History
        HistoryManager.add(species, confidence);
    },
    
    updateModelBars(confidence) {
        const setBar = (model, pct) => {
            const percentage = Math.min(100, pct * 100);
            dom[`${model}Fill`].style.width = `${percentage}%`;
            dom[`${model}Pct`].textContent = `${percentage.toFixed(0)}%`;
        };
        
        if (appState.mode === 'audio') {
            setBar('audio', confidence);
            setBar('image', 0);
            setBar('dist', confidence * 0.76);
            setBar('fusion', 0);
        } else if (appState.mode === 'image') {
            setBar('audio', 0);
            setBar('image', confidence);
            setBar('dist', confidence * 0.7);
            setBar('fusion', 0);
        } else {
            setBar('audio', confidence * 0.87);
            setBar('image', confidence * 0.91);
            setBar('dist', confidence * 0.76);
            setBar('fusion', confidence);
        }
    }
};

// ────────────────────────────────────────
// LOGGER
// ────────────────────────────────────────
const Logger = {
    add(message, type = 'info') {
        const time = new Date().toTimeString().slice(0, 8);
        const entry = document.createElement('div');
        entry.className = `log-entry ${type}`;
        entry.innerHTML = `
            <span class="log-time">${time}</span>
            <span class="log-msg">${message}</span>
        `;
        
        dom.logFeed.appendChild(entry);
        dom.logFeed.scrollTop = dom.logFeed.scrollHeight;
    },
    
    clear() {
        dom.logFeed.innerHTML = '';
        dom.jsonOutput.textContent = '// Cleared';
        this.add('Logs cleared');
    }
};

// ────────────────────────────────────────
// HISTORY MANAGER
// ────────────────────────────────────────
const HistoryManager = {
    maxItems: 8,
    
    add(species, confidence) {
        // Remove empty state
        const empty = dom.historyList.querySelector('.history-empty');
        if (empty) empty.remove();
        
        // Create new item
        const time = new Date().toTimeString().slice(0, 5);
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <span class="history-species">${species.toUpperCase()}</span>
            <div class="history-meta">
                <span class="history-conf">${(confidence * 100).toFixed(0)}%</span>
                <span class="history-time">${time}</span>
            </div>
        `;
        
        dom.historyList.prepend(item);
        
        // Limit to max items
        const items = dom.historyList.querySelectorAll('.history-item');
        if (items.length > this.maxItems) {
            items[items.length - 1].remove();
        }
    }
};

// ────────────────────────────────────────
// INITIALIZATION
// ────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
    ThemeManager.init();
    UptimeCounter.init();
    WaveformVisualizer.init();
    ModeManager.init();
    AudioRecorder.init();
    FileHandlers.init();
    CameraHandler.init();
    Analyzer.init();
    
    dom.clearLogs.addEventListener('click', () => Logger.clear());
    
    console.log('%c🦜 WLDS-9 System Online', 'color: #06b6d4; font-size: 16px; font-weight: bold;');
});