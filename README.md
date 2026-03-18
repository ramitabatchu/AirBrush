# AirBrush
 
**Draw on a canvas with nothing but your hand.**
 
AirBrush is a browser-based drawing app that uses your webcam and real-time hand tracking to let you paint and sketch using just your hand — no mouse, no stylus, no touchscreen required. Point your index finger to draw, open your full palm to erase, and close your fist to pause. It runs entirely in your browser, nothing leaves your device.
 
---

 
## How It Works
 
AirBrush uses [MediaPipe Hands](https://google.github.io/mediapipe/solutions/hands) to detect your hand through your webcam at 30+ frames per second. It tracks 21 landmarks on your hand and uses the position of your index finger tip to control the drawing cursor in real time.
 
- **Index finger extended (pointer)** → drawing mode — the tip of your index finger paints on the canvas
- **Open palm (all fingers extended)** → eraser mode — your hand erases whatever it moves over
- **Closed fist** → paused — nothing happens, use this to reposition your hand freely
 
Move your index finger around the canvas to paint. Switch between modes naturally just by changing your hand shape.
 
All processing happens locally in your browser via WebAssembly. No camera data is ever sent to a server.
 
---
 
## Features
 
- 🖐️ Real-time hand tracking via MediaPipe Hands (browser, no server)
- ☝️ **Pointer finger** (index extended) → draw mode
- 🖐️ **Open palm** (all fingers extended) → erase mode
- ✊ **Closed fist** → pause and reposition freely
- 🎨 Color palette with 10 colors
- ↩️ Undo / Redo (up to 50 steps) — `Cmd/Ctrl+Z`
- 🗑️ Clear canvas button
- 💾 Export your drawing as a PNG
 
---
 
## Requirements
 
- A laptop or desktop with a webcam
- A modern browser: Chrome 100+, Safari 16+, or Firefox 110+
- Camera permission granted when prompted
- Decent indoor lighting (the hand tracker works best when your hand is well-lit and contrasts against the background)
 
---
 
## Usage Tips
 
- **Keep your hand in the camera frame.** The camera panel on the left shows your live feed with a skeleton overlay — use it to make sure your hand is visible.
- **Point with just your index finger to draw.** Keep the other fingers curled so the app clearly recognizes the pointer gesture.
- **Spread all five fingers to erase.** An open palm activates erase mode — move it over any area you want to clear.
- **Close your fist to reposition.** This pauses all activity so you can move your hand anywhere without drawing or erasing.
- **Move at a natural pace.** Fast erratic movements can cause jitter. Smooth, deliberate strokes look best.
- **Use a plain background** behind your hand if possible for more reliable tracking.
- **Undo is your friend.** `Cmd+Z` works just like any drawing app.
 
---
 
## Project Structure
 
```
airbrush/
├── index.html        # App entry point (single file, no build required)
├── style.css         # Layout and UI styles
├── app.js            # Core app logic, gesture detection, drawing engine
└── README.md
```
 
---
 
## Tech Stack
 
| Technology | Purpose |
|------------|---------|
| MediaPipe Hands | Hand landmark detection (21 points, browser WASM) |
| HTML Canvas API | Drawing surface and skeleton overlay |
| WebRTC / getUserMedia | Webcam access and video stream |
| Vanilla JavaScript (ES2022) | Gesture logic, coordinate mapping, stroke rendering |
| HTML + CSS | Layout, toolbar, color palette |
 
No frameworks. No backend. No build tools required.
 
---
 
## Privacy
 
AirBrush processes everything locally on your device. Your camera feed is never transmitted anywhere. No analytics, no tracking, no data collection of any kind. You can verify this yourself by opening DevTools and checking the Network tab — there are zero external requests after the initial page load.
 
---
 
## Browser Support
 
| Browser | Supported |
|---------|-----------|
| Chrome 100+ | ✅ Recommended |
| Safari 16+ | ✅ |
| Firefox 110+ | ✅ |
| Mobile browsers | ❌ Not supported in v1.0 |
 
---
 
## Roadmap
 
- [ ] Mobile / tablet support
- [ ] Multiple brush styles (pen, marker, watercolor)
- [ ] Pinch gesture for color/size switching
- [ ] Canvas background color picker
- [ ] Layer support
