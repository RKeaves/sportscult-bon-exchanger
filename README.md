# Sportscult Bonus Exchanger

![Version](https://img.shields.io/badge/Version-1.0-blue) ![License](https://img.shields.io/badge/License-GPL--3.0-green)

<p align="center">
  <img src="https://ptpimg.me/3e452n.png" alt="Control Panel Preview" style="width: 52%;">
</p>

_Auto-exchange bonus points for 5 GB Upload on sportscult.org with a customizable control panel._

This userscript automatically exchanges bonus points when they exceed a configured threshold, features a draggable/resizable UI, and maintains statistics across sessions. Perfect for maintaining upload buffers with minimal interaction.

---

<div style="border: 2px solid #e74c3c; background-color: #f9e6e6; padding: 10px; border-radius: 5px; margin: 15px 0;">
  <strong>📌 Compatibility:</strong> Designed for <code>https://sportscult.org/</code>
</div>

---

## Features

- 🎛️ Draggable & resizable control panel with persistent positioning
- ⚡ Automatic bonus exchange when threshold is exceeded
- 🔄 Real-time bonus updates via AJAX (no page reload)
- 💾 Persistent state storage using localStorage
- 📊 Track exchange history and upload statistics
- ✏️ Custom notes with manual input/copy functionality
- ⏱️ Configurable check intervals (10-60 seconds)

---

## Installation

1. Install a userscript manager:
   - [Tampermonkey](https://www.tampermonkey.net/) (Chrome/Edge)
   - [Greasemonkey](https://www.greasespot.net/) (Firefox)

2. Click the raw installation link:  
   [Install Script](https://github.com/rkeaves/sportscult-bon-exchanger/raw/main/sportscult-bon-exchanger.js)

---

## Configuration

Edit these constants at the top of the script for customization:

```javascript
const EXCHANGE_COST = 290.0;      // Points required per 5GB exchange
const BONUS_THRESHOLD = 1000.0;   // Minimum points to maintain
const ACTION_INTERVAL = 60;       // Seconds between exchange attempts
const BONUS_REFRESH_INTERVAL = 10;// Seconds between bonus updates
```

---

## Control Panel Guide

<p align="center">
  <img src="https://ptpimg.me/100691.png" alt="Panel Interface">
</p>

### Core Controls
- **Power Button**: Toggle automation (Green=Active/Red=Inactive)
- **Reset Button**: Clear all statistics and notes
- **Countdown Timer**: Shows seconds until next exchange attempt

### Statistics Panel
- Real-time bonus point tracking
- Historical exchange data
- Upload tracking (TB)
- Threshold/cost displays

### Note Features
1. **Upload at Start**:
   - Manually input starting upload value
   - Copy current upload to note
   - Reset/Copy functionality

2. **Bonus at Start**:
   - Track initial bonus points
   - Same copy/reset functionality

---

<div style="border: 2px solid #3498db; background-color: #e6f4ff; padding: 10px; border-radius: 5px; margin: 15px 0;">
  <strong>💡 Tip:</strong> Right-click the panel to resize/move it without triggering clicks. Double-click notes for quick editing.
</div>

---

## Persistent State

The script maintains these between sessions via localStorage:
- Panel position/size
- Exchange statistics
- Manual notes
- Last known upload value
- Current automation state

---

## Troubleshooting

| Issue                          | Solution                                  |
|--------------------------------|-------------------------------------------|
| Panel not appearing            | Refresh page after script installation    |
| Statistics not updating        | Check AJAX requests in browser console    |
| Position reset                 | Clear localStorage or click Reset button  |
| Exchange not triggering        | Verify threshold < current bonus points   |

---
