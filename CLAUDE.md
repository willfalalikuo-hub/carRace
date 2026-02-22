# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Arcade-style car racing game built with vanilla JavaScript and HTML5 Canvas. Players select a vehicle type and dodge obstacles on a multi-lane road.

## Running the Game

```bash
# Serve the game (any static file server)
python -m http.server 8000
# or
npx serve .
```

Then open http://localhost:8000 in a browser.

The game can also be opened directly in a browser (`file://` protocol), but some browsers restrict Web Audio API in this mode.

## Architecture

### Game Loop Pattern
The game uses a standard requestAnimationFrame loop in `gameLoop()`:
1. Clear canvas
2. Update road animation offset
3. Draw road
4. Update and draw player car
5. Spawn/update/draw obstacles
6. Check collisions
7. Update score
8. Schedule next frame

### Key Systems

**Car Physics** (`car` object, `updateCar()`):
- Speed-based movement with acceleration/deceleration
- Max speed varies by vehicle type
- Lateral movement (left/right) is position-based, not speed-based

**Obstacle System** (`createObstacle()`, `obstacles` array):
- Spawns in 4 lanes (700px total road width)
- Lane collision avoidance: obstacles won't spawn in lanes with nearby obstacles
- Spawning rate increases as score progresses (`obstacleInterval` decreases)

**Audio System** (Web Audio API):
- Three independent tracks: melody (square wave), bass (triangle wave), drums (noise + oscillator)
- All tracks loop independently using index counters
- Must resume AudioContext on user interaction (browser requirement)

**Vehicle Selection** (`carTypes` object):
- 4 types: sports, sedan, truck, SUV
- Each has unique dimensions, maxSpeed, acceleration, deceleration, and colors

### Constants
- Canvas: 800x600px
- Road: 50px offset, 4 lanes of 175px each (700px total)
- Car dimensions vary by type (40-55px wide, 70-90px tall)
- LANE_WIDTH = 175 is used throughout for calculations

## Development Notes

- The entire game logic is in a single `game.js` file (~525 lines)
- No build process or dependencies required
- Chinese language UI (index.html, game score display)
- Emoji characters are used in UI but rendered as text, not graphics
