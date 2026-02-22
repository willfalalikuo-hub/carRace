const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');

canvas.width = 800;
canvas.height = 600;

const CAR_WIDTH = 45;
const CAR_HEIGHT = 80;
const LANE_WIDTH = 175;
const OBSTACLE_WIDTH = 160;
const OBSTACLE_HEIGHT = 70;

let gameRunning = false;
let score = 0;
let roadOffset = 0;

let audioContext = null;
let backgroundMusicInterval = null;
let currentNoteIndex = 0;
let bassNoteIndex = 0;
let drumBeatIndex = 0;

const arcadeMelody = [
    { freq: 523.25, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 1046.50, duration: 0.2 },
    { freq: 783.99, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 523.25, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 880.00, duration: 0.1 },
    { freq: 1046.50, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 523.25, duration: 0.1 },
    { freq: 440.00, duration: 0.1 },
    { freq: 523.25, duration: 0.2 },
    { freq: 392.00, duration: 0.1 },
    { freq: 523.25, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 1046.50, duration: 0.1 },
    { freq: 880.00, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 523.25, duration: 0.1 },
    { freq: 659.25, duration: 0.1 },
    { freq: 783.99, duration: 0.1 },
    { freq: 880.00, duration: 0.1 },
    { freq: 1046.50, duration: 0.2 },
    { freq: 783.99, duration: 0.1 },
    { freq: 659.25, duration: 0.1 }
];

const bassLine = [
    { freq: 130.81, duration: 0.2 },
    { freq: 130.81, duration: 0.2 },
    { freq: 164.81, duration: 0.2 },
    { freq: 164.81, duration: 0.2 },
    { freq: 196.00, duration: 0.2 },
    { freq: 196.00, duration: 0.2 },
    { freq: 130.81, duration: 0.2 },
    { freq: 130.81, duration: 0.2 }
];

const drumPattern = [
    { type: 'kick', duration: 0.1 },
    { type: 'rest', duration: 0.1 },
    { type: 'snare', duration: 0.1 },
    { type: 'rest', duration: 0.1 },
    { type: 'kick', duration: 0.1 },
    { type: 'rest', duration: 0.1 },
    { type: 'snare', duration: 0.1 },
    { type: 'rest', duration: 0.1 }
];

function playNote(frequency, duration, type = 'square', volume = 0.08) {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, audioContext.currentTime);
    
    gainNode.gain.setValueAtTime(volume, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + duration);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration);
}

function playBass(frequency, duration) {
    playNote(frequency, duration, 'triangle', 0.12);
}

function playDrum(type) {
    if (!audioContext) return;
    
    const gainNode = audioContext.createGain();
    gainNode.connect(audioContext.destination);
    
    if (type === 'kick') {
        const oscillator = audioContext.createOscillator();
        oscillator.connect(gainNode);
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(150, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.1);
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.1);
    } else if (type === 'snare') {
        const noiseBuffer = audioContext.createBuffer(1, audioContext.sampleRate * 0.1, audioContext.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < noiseBuffer.length; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noiseSource = audioContext.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        
        const noiseFilter = audioContext.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.value = 1000;
        
        noiseSource.connect(noiseFilter);
        noiseFilter.connect(gainNode);
        
        gainNode.gain.setValueAtTime(0.15, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.1);
        
        noiseSource.start(audioContext.currentTime);
        noiseSource.stop(audioContext.currentTime + 0.1);
    }
}

function playCollisionSound() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.3);
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.3);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
}

function startBackgroundMusic() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    if (audioContext.state === 'suspended') {
        audioContext.resume();
    }
    
    currentNoteIndex = 0;
    bassNoteIndex = 0;
    drumBeatIndex = 0;
    
    backgroundMusicInterval = setInterval(() => {
        const note = arcadeMelody[currentNoteIndex];
        playNote(note.freq, note.duration);
        currentNoteIndex = (currentNoteIndex + 1) % arcadeMelody.length;
        
        const bassNote = bassLine[bassNoteIndex];
        playBass(bassNote.freq, bassNote.duration);
        bassNoteIndex = (bassNoteIndex + 1) % bassLine.length;
        
        const drum = drumPattern[drumBeatIndex];
        if (drum.type !== 'rest') {
            playDrum(drum.type);
        }
        drumBeatIndex = (drumBeatIndex + 1) % drumPattern.length;
    }, 100);
}

function stopBackgroundMusic() {
    if (backgroundMusicInterval) {
        clearInterval(backgroundMusicInterval);
        backgroundMusicInterval = null;
    }
}

const car = {
    x: canvas.width / 2 - CAR_WIDTH / 2,
    y: canvas.height - CAR_HEIGHT - 50,
    width: CAR_WIDTH,
    height: CAR_HEIGHT,
    speed: 0,
    maxSpeed: 35,
    minSpeed: 0,
    acceleration: 1.2,
    deceleration: 0.3,
    color: '#00d4ff',
    secondaryColor: '#0099cc'
};

const keys = {
    up: false,
    down: false,
    left: false,
    right: false
};

let obstacles = [];
let obstacleTimer = 0;
let obstacleInterval = 60;
let barrierTimer = 0;
let barrierType = 'full';
let collisionResistance = 0;
let screenShake = 0;
let collisionFlash = 0;
let isGameOver = false;
let isPaused = false;
let currentLang = 'zh';

let selectedCarType = 'sedan';

const translations = {
    zh: {
        'title': '汽车跑酷',
        'controls': '使用方向键控制汽车移动',
        'controls-detail': '↑ 加速 | ↓ 减速 | ← 左移 | → 右移',
        'avoid': '避开其他车辆！',
        'select-car': '选择你的车辆：',
        'sports': '跑车',
        'sedan': '轿车',
        'truck': '卡车',
        'suv': 'SUV',
        'start': '开始游戏',
        'score': '分数: 0',
        'speed': '速度: 0',
        'shield': '护盾: 0',
        'pause': '暂停 (P)',
        'game-over': '游戏结束',
        'final-score': '最终分数: 0',
        'restart': '重新开始',
        'back-to-select': '返回选择车辆'
    },
    en: {
        'title': 'Car Racing',
        'controls': 'Use arrow keys to control',
        'controls-detail': '↑ Speed up | ↓ Slow down | ← Left | → Right',
        'avoid': 'Avoid other cars!',
        'select-car': 'Select your car:',
        'sports': 'Sports Car',
        'sedan': 'Sedan',
        'truck': 'Truck',
        'suv': 'SUV',
        'start': 'Start Game',
        'score': 'Score: 0',
        'speed': 'Speed: 0',
        'shield': 'Shield: 0',
        'pause': 'Pause (P)',
        'game-over': 'Game Over',
        'final-score': 'Final Score: 0',
        'restart': 'Restart',
        'back-to-select': 'Back to Select'
    }
};

const carTypes = {
    sports: {
        name: '跑车',
        color: '#ff4444',
        secondaryColor: '#cc0000',
        width: 35,
        height: 65,
        maxSpeed: 45,
        acceleration: 1.8,
        deceleration: 0.35,
        collisionResistance: 0
    },
    sedan: {
        name: '轿车',
        color: '#00d4ff',
        secondaryColor: '#0099cc',
        width: 45,
        height: 80,
        maxSpeed: 35,
        acceleration: 1.2,
        deceleration: 0.3,
        collisionResistance: 0
    },
    truck: {
        name: '卡车',
        color: '#ffd93d',
        secondaryColor: '#ff9500',
        width: 70,
        height: 120,
        maxSpeed: 25,
        acceleration: 0.8,
        deceleration: 0.5,
        collisionResistance: 2
    },
    suv: {
        name: 'SUV',
        color: '#6c5ce7',
        secondaryColor: '#4834d4',
        width: 55,
        height: 90,
        maxSpeed: 30,
        acceleration: 1.0,
        deceleration: 0.35,
        collisionResistance: 1
    }
};

const obstacleTypes = [
    { type: 'car', color: '#ff6b6b', emoji: '🚗' },
    { type: 'car', color: '#ffd93d', emoji: '🚗' },
    { type: 'car', color: '#ff8c00', emoji: '🚗' },
    { type: 'car', color: '#ff4444', emoji: '🚗' }
];

const barrierTypes = [
    { type: 'barrier', color: '#ff6b6b' },
    { type: 'barrier', color: '#ffd93d' },
    { type: 'barrier', color: '#ff8c00' },
    { type: 'barrier', color: '#ff4444' }
];

document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = true;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = true;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = true;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = true;
});

document.addEventListener('keyup', (e) => {
    if (e.key === 'ArrowUp' || e.key === 'w') keys.up = false;
    if (e.key === 'ArrowDown' || e.key === 's') keys.down = false;
    if (e.key === 'ArrowLeft' || e.key === 'a') keys.left = false;
    if (e.key === 'ArrowRight' || e.key === 'd') keys.right = false;
});

function drawRoad() {
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = '#636e72';
    ctx.fillRect(50, 0, LANE_WIDTH * 4, canvas.height);
    
    ctx.setLineDash([40, 30]);
    ctx.strokeStyle = '#dfe6e9';
    ctx.lineWidth = 4;
    
    for (let i = 1; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(50 + i * LANE_WIDTH, roadOffset);
        ctx.lineTo(50 + i * LANE_WIDTH, canvas.height);
        ctx.stroke();
    }
    
    ctx.setLineDash([]);
    
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(50, 0);
    ctx.lineTo(50, canvas.height);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(50 + LANE_WIDTH * 4, 0);
    ctx.lineTo(50 + LANE_WIDTH * 4, canvas.height);
    ctx.stroke();
}

function drawCar() {
    ctx.save();
    
    const centerX = car.x + car.width / 2;
    
    if (selectedCarType === 'sports') {
        drawSportsCar();
    } else if (selectedCarType === 'sedan') {
        drawSedanCar();
    } else if (selectedCarType === 'truck') {
        drawTruckCar();
    } else if (selectedCarType === 'suv') {
        drawSUVCar();
    }
    
    ctx.restore();
}

function drawSportsCar() {
    const centerX = car.x + car.width / 2;
    
    ctx.fillStyle = car.color;
    ctx.beginPath();
    ctx.moveTo(car.x + 5, car.y + car.height);
    ctx.lineTo(car.x + 5, car.y + 20);
    ctx.lineTo(car.x + 10, car.y + 10);
    ctx.lineTo(car.x + car.width - 10, car.y + 10);
    ctx.lineTo(car.x + car.width - 5, car.y + 20);
    ctx.lineTo(car.x + car.width - 5, car.y + car.height);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = car.secondaryColor;
    ctx.fillRect(car.x + 8, car.y + 25, car.width - 16, 15);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(car.x + 10, car.y + 28, 12, 8);
    ctx.fillRect(car.x + car.width - 22, car.y + 28, 12, 8);
    
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(car.x + 5, car.y + 12, 8, 4);
    ctx.fillRect(car.x + car.width - 13, car.y + 12, 8, 4);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(car.x + 3, car.y + car.height - 8, 10, 5);
    ctx.fillRect(car.x + car.width - 13, car.y + car.height - 8, 10, 5);
}

function drawSedanCar() {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
    
    ctx.fillStyle = car.secondaryColor;
    ctx.fillRect(car.x + 5, car.y + 12, car.width - 10, 18);
    ctx.fillRect(car.x + 5, car.y + car.height - 22, car.width - 10, 12);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(car.x + 8, car.y + 16, 14, 10);
    ctx.fillRect(car.x + car.width - 22, car.y + 16, 14, 10);
    
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(car.x + 4, car.y + 3, 10, 5);
    ctx.fillRect(car.x + car.width - 14, car.y + 3, 10, 5);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(car.x + 4, car.y + car.height - 8, 10, 5);
    ctx.fillRect(car.x + car.width - 14, car.y + car.height - 8, 10, 5);
    
    ctx.fillStyle = '#3498db';
    ctx.fillRect(car.x + 5, car.y + car.height - 22, car.width - 10, 3);
}

function drawTruckCar() {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
    
    ctx.fillStyle = car.secondaryColor;
    ctx.fillRect(car.x + 8, car.y + 15, car.width - 16, 25);
    ctx.fillRect(car.x + 8, car.y + car.height - 30, car.width - 16, 15);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(car.x + 10, car.y + 20, 16, 12);
    ctx.fillRect(car.x + car.width - 26, car.y + 20, 16, 12);
    
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(car.x + 5, car.y + 3, 12, 6);
    ctx.fillRect(car.x + car.width - 17, car.y + 3, 12, 6);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(car.x + 5, car.y + car.height - 10, 12, 6);
    ctx.fillRect(car.x + car.width - 17, car.y + car.height - 10, 12, 6);
    
    ctx.fillStyle = '#3498db';
    ctx.fillRect(car.x + 8, car.y + car.height - 30, car.width - 16, 4);
    
    ctx.fillStyle = '#95a5a6';
    ctx.fillRect(car.x + 10, car.y + 50, car.width - 20, 8);
    ctx.fillRect(car.x + 10, car.y + 70, car.width - 20, 8);
}

function drawSUVCar() {
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
    
    ctx.fillStyle = car.secondaryColor;
    ctx.fillRect(car.x + 6, car.y + 14, car.width - 12, 20);
    ctx.fillRect(car.x + 6, car.y + car.height - 24, car.width - 12, 14);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(car.x + 9, car.y + 18, 13, 10);
    ctx.fillRect(car.x + car.width - 22, car.y + 18, 13, 10);
    
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(car.x + 4, car.y + 3, 10, 5);
    ctx.fillRect(car.x + car.width - 14, car.y + 3, 10, 5);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(car.x + 4, car.y + car.height - 8, 10, 5);
    ctx.fillRect(car.x + car.width - 14, car.y + car.height - 8, 10, 5);
    
    ctx.fillStyle = '#3498db';
    ctx.fillRect(car.x + 6, car.y + car.height - 24, car.width - 12, 3);
    
    ctx.fillStyle = '#7f8c8d';
    ctx.fillRect(car.x + 8, car.y + 45, car.width - 16, 6);
}

function createObstacle() {
    const lanes = [0, 1, 2, 3];
    const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
    
    const blockedLanes = new Set();
    obstacles.forEach(obstacle => {
        const lane = Math.floor((obstacle.x - 50) / LANE_WIDTH);
        if (obstacle.y < car.y + car.height + 100) {
            blockedLanes.add(lane);
        }
    });
    
    const availableLanes = lanes.filter(lane => !blockedLanes.has(lane));
    
    if (availableLanes.length === 0) {
        return;
    }
    
    const lane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
    
    const obstacleWidth = 45;
    const obstacleHeight = 75;
    const obstacleSpeed = 0.5 + Math.random() * 0.5;
    
    const obstacle = {
        x: 50 + lane * LANE_WIDTH + (LANE_WIDTH - obstacleWidth) / 2,
        y: -obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight,
        type: type.type,
        color: type.color,
        emoji: type.emoji,
        speed: obstacleSpeed,
        lane: lane,
        changeLaneTimer: Math.random() * 150 + 50,
        targetLane: lane,
        isChangingLane: false,
        turnSignalTimer: 0,
        willChangeLane: false
    };
    
    obstacles.push(obstacle);
}

function createBarrier() {
    const type = barrierTypes[Math.floor(Math.random() * barrierTypes.length)];
    
    const barrierWidth = 50;
    const barrierHeight = 50;
    const barrierSpeed = 0.5 + Math.random() * 0.5;
    
    let positions;
    
    if (barrierType === 'full') {
        positions = [
            50 - barrierWidth / 2,
            50 + LANE_WIDTH * 2 - barrierWidth / 2,
            50 + LANE_WIDTH * 4 - barrierWidth / 2
        ];
        barrierType = 'middle';
    } else {
        positions = [
            50 + LANE_WIDTH - barrierWidth / 2,
            50 + LANE_WIDTH * 3 - barrierWidth / 2
        ];
        barrierType = 'full';
    }
    
    positions.forEach(x => {
        const barrier = {
            x: x,
            y: -barrierHeight,
            width: barrierWidth,
            height: barrierHeight,
            type: type.type,
            color: type.color,
            speed: barrierSpeed
        };
        
        obstacles.push(barrier);
    });
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'car') {
            drawCarObstacle(obstacle);
        } else if (obstacle.type === 'barrier') {
            drawBarrierObstacle(obstacle);
        }
    });
}

function drawCarObstacle(obstacle) {
    ctx.save();
    
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    ctx.fillStyle = '#2c3e50';
    ctx.fillRect(obstacle.x + 5, obstacle.y + 15, obstacle.width - 10, 15);
    ctx.fillRect(obstacle.x + 5, obstacle.y + obstacle.height - 25, obstacle.width - 10, 10);
    
    ctx.fillStyle = '#f1c40f';
    ctx.fillRect(obstacle.x + 2, obstacle.y + 2, 8, 4);
    ctx.fillRect(obstacle.x + obstacle.width - 10, obstacle.y + 2, 8, 4);
    
    ctx.fillStyle = '#e74c3c';
    ctx.fillRect(obstacle.x + 2, obstacle.y + obstacle.height - 8, 8, 4);
    ctx.fillRect(obstacle.x + obstacle.width - 10, obstacle.y + obstacle.height - 8, 8, 4);
    
    if (obstacle.willChangeLane) {
        ctx.fillStyle = '#ff0000';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('!', obstacle.x + obstacle.width / 2, obstacle.y - 10);
    }
    
    ctx.restore();
}

function drawBarrierObstacle(obstacle) {
    ctx.save();
    
    ctx.fillStyle = obstacle.color;
    ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(obstacle.x + 5, obstacle.y + 5, obstacle.width - 10, obstacle.height - 10);
    
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('⚠', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 2 + 7);
    
    ctx.restore();
}

function updateObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'car') {
            obstacle.y += obstacle.speed + 2 + car.speed * 0.5;
            
            obstacle.changeLaneTimer--;
            obstacle.turnSignalTimer++;
            
            if (obstacle.changeLaneTimer <= 60 && obstacle.changeLaneTimer > 0 && !obstacle.willChangeLane && obstacle.y < car.y) {
                if (Math.random() < 0.5) {
                    const availableLanes = [0, 1, 2, 3].filter(lane => lane !== obstacle.lane);
                    obstacle.targetLane = availableLanes[Math.floor(Math.random() * availableLanes.length)];
                    obstacle.willChangeLane = true;
                }
            }
            
            if (obstacle.changeLaneTimer <= 0 && obstacle.willChangeLane) {
                obstacle.changeLaneTimer = Math.random() * 300 + 200;
                obstacle.isChangingLane = true;
                obstacle.turnSignalTimer = 0;
            } else if (obstacle.changeLaneTimer <= 0) {
                obstacle.changeLaneTimer = Math.random() * 300 + 200;
            }
            
            const targetX = 50 + obstacle.targetLane * LANE_WIDTH + (LANE_WIDTH - obstacle.width) / 2;
            const dx = targetX - obstacle.x;
            
            if (Math.abs(dx) > 1) {
                obstacle.x += dx * 0.005;
            } else {
                obstacle.lane = obstacle.targetLane;
                obstacle.isChangingLane = false;
                obstacle.willChangeLane = false;
            }
        } else if (obstacle.type === 'barrier') {
            obstacle.y += 5 + car.speed * 0.5;
        }
    });
    
    obstacles = obstacles.filter(obstacle => obstacle.y < canvas.height);
}

function checkCollision() {
    for (let obstacle of obstacles) {
        if (car.x < obstacle.x + obstacle.width &&
            car.x + car.width > obstacle.x &&
            car.y < obstacle.y + obstacle.height &&
            car.y + car.height > obstacle.y) {
            playCollisionSound();
            screenShake = 15;
            collisionFlash = 0.6;
            if (collisionResistance > 0) {
                collisionResistance--;
                obstacles.splice(obstacles.indexOf(obstacle), 1);
                return false;
            }
            return true;
        }
    }
    return false;
}

function updateCar() {
    if (keys.up) {
        car.speed = Math.min(car.speed + car.acceleration, car.maxSpeed);
    } else if (keys.down) {
        car.speed = Math.max(car.speed - car.deceleration, car.minSpeed);
    } else {
        car.speed = Math.max(car.speed - car.deceleration * 0.5, 0);
    }
    
    if (keys.left) {
        car.x = Math.max(car.x - 5, 50);
    }
    if (keys.right) {
        car.x = Math.min(car.x + 5, 50 + LANE_WIDTH * 4 - car.width);
    }
}

function updateScore() {
    score += Math.floor(car.speed * 0.2) + 1;
    const lang = translations[currentLang];
    document.getElementById('score').textContent = lang['score'].replace('0', score);
    document.getElementById('speed').textContent = lang['speed'].replace('0', Math.floor(car.speed * 10));
    document.getElementById('shield').textContent = lang['shield'].replace('0', collisionResistance);
}

function gameOver() {
    gameRunning = false;
    isPaused = false;
    stopBackgroundMusic();
    const lang = translations[currentLang];
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').style.display = 'flex';
}

function gameLoop() {
    if (!gameRunning) return;
    
    if (isPaused) {
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        drawRoad();
        drawCar();
        drawObstacles();
        
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        const lang = translations[currentLang];
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(lang['pause'].replace('(P)', ''), canvas.width / 2, canvas.height / 2);
        
        ctx.restore();
        requestAnimationFrame(gameLoop);
        return;
    }
    
    ctx.save();
    
    if (screenShake > 0) {
        const shakeX = (Math.random() - 0.5) * screenShake * 2;
        const shakeY = (Math.random() - 0.5) * screenShake * 2;
        ctx.translate(shakeX, shakeY);
        screenShake *= 0.9;
        if (screenShake < 0.5) screenShake = 0;
    }
    
    ctx.clearRect(-10, -10, canvas.width + 20, canvas.height + 20);
    
    roadOffset += 5 + car.speed * 0.5;
    if (roadOffset > 70) roadOffset = 0;
    
    drawRoad();
    
    updateCar();
    drawCar();
    
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
        createObstacle();
        obstacleTimer = 0;
        obstacleInterval = Math.max(50, 85 - Math.floor(score / 1000));
    }
    
    barrierTimer++;
    if (barrierTimer >= 360) {
        createBarrier();
        barrierTimer = 0;
    }
    
    updateObstacles();
    drawObstacles();
    
    updateScore();
    
    if (checkCollision()) {
        isGameOver = true;
    }
    
    if (collisionFlash > 0) {
        ctx.fillStyle = `rgba(255, 0, 0, ${collisionFlash})`;
        ctx.fillRect(-10, -10, canvas.width + 20, canvas.height + 20);
        collisionFlash *= 0.85;
        if (collisionFlash < 0.01) collisionFlash = 0;
    }
    
    if (isGameOver && collisionFlash === 0) {
        gameOver();
        ctx.restore();
        return;
    }
    
    ctx.restore();
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameRunning = true;
    score = 0;
    isGameOver = false;
    
    const carType = carTypes[selectedCarType];
    car.width = carType.width;
    car.height = carType.height;
    car.maxSpeed = carType.maxSpeed;
    car.acceleration = carType.acceleration;
    car.deceleration = carType.deceleration;
    car.color = carType.color;
    car.secondaryColor = carType.secondaryColor;
    collisionResistance = carType.collisionResistance;
    screenShake = 0;
    collisionFlash = 0;
    
    car.x = canvas.width / 2 - car.width / 2;
    car.y = canvas.height - car.height - 50;
    car.speed = 0;
    
    obstacles = [];
    obstacleTimer = 0;
    obstacleInterval = 85;
    barrierTimer = 0;
    barrierType = 'full';
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    
    startBackgroundMusic();
    gameLoop();
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);
document.getElementById('back-to-select-btn').addEventListener('click', function() {
    document.getElementById('game-over-screen').style.display = 'none';
    document.getElementById('start-screen').style.display = 'flex';
});

document.getElementById('lang-zh').addEventListener('click', function() {
    currentLang = 'zh';
    document.getElementById('lang-zh').classList.add('active');
    document.getElementById('lang-en').classList.remove('active');
    updateLanguage();
});

document.getElementById('lang-en').addEventListener('click', function() {
    currentLang = 'en';
    document.getElementById('lang-en').classList.add('active');
    document.getElementById('lang-zh').classList.remove('active');
    updateLanguage();
});

document.getElementById('pause-btn').addEventListener('click', togglePause);

document.querySelectorAll('.car-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.car-option').forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedCarType = this.getAttribute('data-car');
    });
});

document.querySelector('.car-option[data-car="sedan"]').classList.add('selected');

function updateLanguage() {
    const lang = translations[currentLang];
    document.querySelector('h1').textContent = '🚗 ' + lang['title'];
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (lang[key]) {
            if (key === 'final-score') {
                el.innerHTML = lang[key].replace('0', '<span id="final-score">0</span>');
            } else if (key === 'score' || key === 'speed' || key === 'shield') {
                updateScore();
            } else {
                el.textContent = lang[key];
            }
        }
    });
}

function togglePause() {
    if (!gameRunning || isGameOver) return;
    isPaused = !isPaused;
    const pauseBtn = document.getElementById('pause-btn');
    const lang = translations[currentLang];
    if (isPaused) {
        pauseBtn.textContent = lang['pause'].replace('(P)', '(▶)');
        stopBackgroundMusic();
    } else {
        pauseBtn.textContent = lang['pause'];
        startBackgroundMusic();
    }
}

document.addEventListener('keydown', (e) => {
    if (e.key === 'p' || e.key === 'P') {
        togglePause();
    }
});
