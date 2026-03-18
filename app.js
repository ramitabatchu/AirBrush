// ====== AirBrush App ======

// State
const state = {
  isDrawing: false,
  color: '#000000',
  brushSize: 10,
  isEraser: false,
  history: [],
  historyIndex: -1,
  maxHistory: 50,
  pointerHistory: [], // For smoothing
  smoothedPoint: null,
  gestureState: 'Initializing...', // 'Drawing', 'Paused', 'No hand detected'
  gestureStateHistory: [], // For debouncing
};

// UI Elements
const ui = {
  colorPalette: document.getElementById('color-palette'),
  brushSizes: document.querySelectorAll('.size-btn'),
  eraserBtn: document.getElementById('eraser-btn'),
  undoBtn: document.getElementById('undo-btn'),
  redoBtn: document.getElementById('redo-btn'),
  clearBtn: document.getElementById('clear-btn'),
  saveBtn: document.getElementById('save-btn'),
  videoElement: document.getElementById('input_video'),
  canvasElement: document.getElementById('output_canvas'),
  canvasCtx: null,
  drawingCanvas: document.getElementById('drawing-canvas'),
  drawingCtx: null,
  gestureStateLabel: document.getElementById('gesture-state'),
  canvasContainer: document.getElementById('canvas-container'),
};

if (ui.canvasElement) ui.canvasCtx = ui.canvasElement.getContext('2d');
if (ui.drawingCanvas) ui.drawingCtx = ui.drawingCanvas.getContext('2d', { willReadFrequently: true });

const PALETTE = [
  '#000000', '#FFFFFF', '#ef4444', '#f97316', '#eab308',
  '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#94a3b8'
];

function init() {
  setupUI();
  initCameraAndMediaPipe();

  // Need to wait for rendering to resize properly
  setTimeout(() => {
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    saveHistoryState(); // Save initial blank canvas
  }, 100);
}

function setupUI() {
  // Populate color palette
  PALETTE.forEach(color => {
    const btn = document.createElement('div');
    btn.className = 'color-swatch';
    btn.style.backgroundColor = color;
    btn.dataset.color = color;
    if (color === state.color) btn.classList.add('active');
    btn.onclick = () => setColor(color);
    ui.colorPalette.appendChild(btn);
  });

  // Brush sizes
  ui.brushSizes.forEach(btn => {
    btn.onclick = () => setBrushSize(parseInt(btn.dataset.size));
  });

  // Actions
  ui.eraserBtn.onclick = toggleEraser;
  ui.undoBtn.onclick = undo;
  ui.redoBtn.onclick = redo;
  ui.clearBtn.onclick = clearCanvas;
  ui.saveBtn.onclick = saveCanvas;

  // Keyboard shortcuts
  window.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
      if (e.shiftKey) {
        redo();
      } else {
        undo();
      }
      e.preventDefault();
    }
  });
}

function setColor(color) {
  state.color = color;
  state.isEraser = false;
  ui.eraserBtn.classList.remove('active');
  updatePaletteUI();
}

function setBrushSize(size) {
  state.brushSize = size;
  ui.brushSizes.forEach(btn => {
    btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
  });
}

function toggleEraser() {
  state.isEraser = !state.isEraser;
  ui.eraserBtn.classList.toggle('active', state.isEraser);
  if (state.isEraser) updatePaletteUI(true);
}

function updatePaletteUI(clearActive = false) {
  Array.from(ui.colorPalette.children).forEach(btn => {
    btn.classList.toggle('active', !clearActive && btn.dataset.color === state.color);
  });
}

function resizeCanvas() {
  if (!ui.canvasContainer || !ui.drawingCanvas) return;
  const container = ui.canvasContainer;
  const rect = container.getBoundingClientRect();

  if (rect.width === 0 || rect.height === 0) return;

  const width = rect.width - 48; // 24px padding on each side
  const height = rect.height - 48;

  // Setup display size
  ui.drawingCanvas.style.width = width + 'px';
  ui.drawingCanvas.style.height = height + 'px';

  // Actual DOM element size (double for retina displays)
  const scale = window.devicePixelRatio || 1;
  ui.drawingCanvas.width = width * scale;
  ui.drawingCanvas.height = height * scale;

  // Normalize coordinate system to use css pixels
  ui.drawingCtx.scale(scale, scale);

  // Fill white by default
  ui.drawingCtx.fillStyle = '#ffffff';
  ui.drawingCtx.fillRect(0, 0, width, height);
}

function clearCanvas() {
  if (!ui.drawingCanvas) return;
  const width = ui.drawingCanvas.width / (window.devicePixelRatio || 1);
  const height = ui.drawingCanvas.height / (window.devicePixelRatio || 1);
  ui.drawingCtx.fillStyle = '#ffffff';
  ui.drawingCtx.fillRect(0, 0, width, height);
  saveHistoryState();
}

function saveCanvas() {
  if (!ui.drawingCanvas) return;
  const link = document.createElement('a');
  link.download = 'gesturecanvas-drawing.png';
  link.href = ui.drawingCanvas.toDataURL('image/png');
  link.click();
}

// ====== MediaPipe Integration ======

async function initCameraAndMediaPipe() {
  try {
    const hands = new Hands({
      locateFile: (file) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    hands.onResults(onResults);

    const camera = new Camera(ui.videoElement, {
      onFrame: async () => {
        await hands.send({ image: ui.videoElement });
      },
      width: 640,
      height: 480
    });

    await camera.start();
    ui.gestureStateLabel.textContent = "Camera active. Waiting for hand...";
    ui.gestureStateLabel.className = 'gesture-state';

    // Fit output canvas to match video element size
    const checkVideoReady = setInterval(() => {
      if (ui.videoElement.videoWidth && ui.videoElement.videoHeight) {
        ui.canvasElement.width = ui.videoElement.videoWidth;
        ui.canvasElement.height = ui.videoElement.videoHeight;
        clearInterval(checkVideoReady);
      }
    }, 100);

  } catch (error) {
    console.error("Camera/MediaPipe Error:", error);
    ui.gestureStateLabel.textContent = "Error accessing camera. Please allow permissions.";
    ui.gestureStateLabel.className = 'gesture-state error';
  }
}

function onResults(results) {
  // Clear the camera overlay canvas
  ui.canvasCtx.save();
  ui.canvasCtx.clearRect(0, 0, ui.canvasElement.width, ui.canvasElement.height);

  // Draw the video frame to the canvas
  ui.canvasCtx.drawImage(results.image, 0, 0, ui.canvasElement.width, ui.canvasElement.height);

  if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
    const landmarks = results.multiHandLandmarks[0];

    // Determine state before drawing skeleton
    processGesture(landmarks);

    let skeletonColor = '#ffec60ff'; // Yellow
    if (state.gestureState === 'Drawing') skeletonColor = '#4ade80'; // Green
    else if (state.gestureState === 'Erasing') skeletonColor = '#326be4ff'; // Purple

    // Draw skeleton on the camera panel
    drawConnectors(ui.canvasCtx, landmarks, HAND_CONNECTIONS, { color: '#ffffff', lineWidth: 2 });
    drawLandmarks(ui.canvasCtx, landmarks, { color: skeletonColor, lineWidth: 1, radius: 4 });
  } else {
    setGestureState('No hand detected', 'gesture-state');
    updateDrawing(null, false);
  }

  ui.canvasCtx.restore();
}

// ====== Gesture & Drawing Engine ======

function processGesture(landmarks) {
  // Landmarks for gesture detection
  const indexTip = landmarks[8];
  const indexDip = landmarks[7];
  const middleTip = landmarks[12];
  const middleDip = landmarks[11];
  const ringTip = landmarks[16];
  const ringDip = landmarks[15];
  const pinkyTip = landmarks[20];
  const pinkyDip = landmarks[19];

  // Heuristic for open vs closed fingers (tip y < dip y means finger is extended UP)
  const isIndexOpen = indexTip.y < indexDip.y;
  const isMiddleOpen = middleTip.y < middleDip.y;
  const isRingOpen = ringTip.y < ringDip.y;
  const isPinkyOpen = pinkyTip.y < pinkyDip.y;

  const isFist = !isIndexOpen && !isMiddleOpen && !isRingOpen && !isPinkyOpen;
  const isOpenPalm = isIndexOpen && isMiddleOpen && isRingOpen && isPinkyOpen;

  let detectedState = 'Paused'; // Default is paused

  if (isOpenPalm) {
    detectedState = 'Erasing';
  } else if (isFist) {
    detectedState = 'Paused';
  } else if (isIndexOpen) {
    detectedState = 'Drawing';
  }

  // Debounce state changes (require 3 consecutive frames)
  state.gestureStateHistory.push(detectedState);
  if (state.gestureStateHistory.length > 3) {
    state.gestureStateHistory.shift();
  }

  const allSame = state.gestureStateHistory.every(s => s === state.gestureStateHistory[0]);
  if (allSame && state.gestureStateHistory.length === 3) {
    state.gestureState = state.gestureStateHistory[0];
  }

  // Map coordinates
  // X is inverted because the camera is mirrored
  const canvasWidth = ui.drawingCanvas.width / (window.devicePixelRatio || 1);
  const canvasHeight = ui.drawingCanvas.height / (window.devicePixelRatio || 1);
  const rawX = (1 - indexTip.x) * canvasWidth;
  const rawY = indexTip.y * canvasHeight;

  // Smoothing (Rolling average of 5 frames)
  state.pointerHistory.push({ x: rawX, y: rawY });
  if (state.pointerHistory.length > 5) {
    state.pointerHistory.shift();
  }

  const smoothedX = state.pointerHistory.reduce((sum, p) => sum + p.x, 0) / state.pointerHistory.length;
  const smoothedY = state.pointerHistory.reduce((sum, p) => sum + p.y, 0) / state.pointerHistory.length;

  const smoothedPoint = { x: smoothedX, y: smoothedY };

  // Apply eraser mode if gesture is Erasing
  if (state.gestureState === 'Erasing' && !state.isEraser) {
    toggleEraser();
  } else if (state.gestureState === 'Drawing' && state.isEraser) {
    toggleEraser(); // toggle back
  }

  // Apply visual state
  if (state.gestureState === 'Drawing') {
    setGestureState('Drawing', 'gesture-state drawing');
    updateDrawing(smoothedPoint, true);
  } else if (state.gestureState === 'Erasing') {
    setGestureState('Erasing', 'gesture-state eraser');
    updateDrawing(smoothedPoint, true);
  } else {
    setGestureState('Paused', 'gesture-state paused');
    updateDrawing(smoothedPoint, false);
  }
}

function getStrokeSize() {
  if (state.gestureState === 'Erasing' && state.isEraser) {
    const canvasWidth = ui.drawingCanvas.width / (window.devicePixelRatio || 1);
    return canvasWidth * 0.2; // 20% of canvas width
  }
  return state.brushSize;
}

function setGestureState(text, className) {
  if (ui.gestureStateLabel.textContent !== text) {
    ui.gestureStateLabel.textContent = text;
    ui.gestureStateLabel.className = className;
  }
}

let points = [];

function updateDrawing(point, isDrawing) {
  // We need the CSS bounds to scale drawing correctly if canvas is scaled
  if (!point) {
    if (state.isDrawing) endStroke();
    return;
  }

  if (isDrawing) {
    if (!state.isDrawing) {
      // Just started drawing a new stroke
      state.isDrawing = true;
      saveHistoryState();
      points = [point, point];
      drawDot(point);
    } else {
      // Continue stroke
      points.push(point);
      const len = points.length;
      if (len >= 3) {
        const p1 = points[len - 3];
        const p2 = points[len - 2];
        const p3 = points[len - 1];

        const mid1 = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

        ui.drawingCtx.beginPath();
        ui.drawingCtx.moveTo(mid1.x, mid1.y);
        ui.drawingCtx.quadraticCurveTo(p2.x, p2.y, mid2.x, mid2.y);

        ui.drawingCtx.strokeStyle = state.isEraser ? '#ffffff' : state.color;
        ui.drawingCtx.lineWidth = getStrokeSize();
        ui.drawingCtx.lineCap = 'round';
        ui.drawingCtx.lineJoin = 'round';
        ui.drawingCtx.stroke();
      }
    }
  } else {
    // Stopped drawing
    if (state.isDrawing) {
      endStroke();
    }
  }
}

function endStroke() {
  if (!state.isDrawing) return;

  if (points.length >= 3) {
    const len = points.length;
    const p2 = points[len - 2];
    const p3 = points[len - 1];
    const mid2 = { x: (p2.x + p3.x) / 2, y: (p2.y + p3.y) / 2 };

    ui.drawingCtx.beginPath();
    ui.drawingCtx.moveTo(mid2.x, mid2.y);
    ui.drawingCtx.lineTo(p3.x, p3.y);

    ui.drawingCtx.strokeStyle = state.isEraser ? '#ffffff' : state.color;
    ui.drawingCtx.lineWidth = getStrokeSize();
    ui.drawingCtx.lineCap = 'round';
    ui.drawingCtx.lineJoin = 'round';
    ui.drawingCtx.stroke();
  }

  state.isDrawing = false;
  points = [];
  saveHistoryState();
}

function drawDot(point) {
  ui.drawingCtx.beginPath();
  ui.drawingCtx.fillStyle = state.isEraser ? '#ffffff' : state.color;
  ui.drawingCtx.arc(point.x, point.y, getStrokeSize() / 2, 0, Math.PI * 2);
  ui.drawingCtx.fill();
}

function saveHistoryState() {
  if (!ui.drawingCanvas) return;

  // Trim redo history if we made a new change after undoing
  if (state.historyIndex < state.history.length - 1) {
    state.history = state.history.slice(0, state.historyIndex + 1);
  }

  state.history.push(ui.drawingCanvas.toDataURL('image/png'));
  if (state.history.length > state.maxHistory) {
    state.history.shift();
  } else {
    state.historyIndex++;
  }
  updateUndoRedoUI();
}

function undo() {
  if (state.historyIndex > 0) {
    state.historyIndex--;
    restoreHistoryState();
  }
}

function redo() {
  if (state.historyIndex < state.history.length - 1) {
    state.historyIndex++;
    restoreHistoryState();
  }
}

function restoreHistoryState() {
  const img = new Image();
  img.onload = () => {
    ui.drawingCtx.clearRect(0, 0, ui.drawingCanvas.width, ui.drawingCanvas.height);
    ui.drawingCtx.drawImage(img, 0, 0);
  };
  img.src = state.history[state.historyIndex];
  updateUndoRedoUI();
}

function updateUndoRedoUI() {
  ui.undoBtn.disabled = state.historyIndex <= 0;
  ui.redoBtn.disabled = state.historyIndex >= state.history.length - 1;
}

window.addEventListener('DOMContentLoaded', init);
