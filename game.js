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

let selectedCarType = 'sedan';

const carTypes = {
    sports: {
        name: '跑车',
        color: '#ff4444',
        secondaryColor: '#cc0000',
        width: 40,
        height: 70,
        maxSpeed: 40,
        acceleration: 1.5,
        deceleration: 0.4
    },
    sedan: {
        name: '轿车',
        color: '#00d4ff',
        secondaryColor: '#0099cc',
        width: 45,
        height: 80,
        maxSpeed: 35,
        acceleration: 1.2,
        deceleration: 0.3
    },
    truck: {
        name: '卡车',
        color: '#ffd93d',
        secondaryColor: '#ff9500',
        width: 55,
        height: 90,
        maxSpeed: 25,
        acceleration: 0.8,
        deceleration: 0.5
    },
    suv: {
        name: 'SUV',
        color: '#6c5ce7',
        secondaryColor: '#4834d4',
        width: 50,
        height: 85,
        maxSpeed: 30,
        acceleration: 1.0,
        deceleration: 0.35
    }
};

const obstacleTypes = [
    { type: 'pedestrian', color: '#ff6b6b', emoji: '🚶' },
    { type: 'animal', color: '#ffd93d', emoji: '🐕' },
    { type: 'barrier', color: '#ff8c00', emoji: '🚧' },
    { type: 'cone', color: '#ff4444', emoji: '🔺' },
    { type: 'zebra', color: '#ffffff', emoji: '🦓' }
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
        ctx.moveTo(50 + i * LANE_WIDTH, -roadOffset);
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
    ctx.fillStyle = car.color;
    ctx.fillRect(car.x, car.y, car.width, car.height);
    
    ctx.fillStyle = car.secondaryColor;
    ctx.fillRect(car.x + 5, car.y + 10, car.width - 10, 20);
    ctx.fillRect(car.x + 5, car.y + car.height - 25, car.width - 10, 15);
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(car.x + 8, car.y + 15, 15, 10);
    ctx.fillRect(car.x + car.width - 23, car.y + 15, 15, 10);
    
    ctx.fillStyle = '#ff0000';
    ctx.fillRect(car.x + 5, car.y + car.height - 10, 12, 8);
    ctx.fillRect(car.x + car.width - 17, car.y + car.height - 10, 12, 8);
    
    ctx.fillStyle = '#ffff00';
    ctx.fillRect(car.x + 5, car.y + 2, 12, 6);
    ctx.fillRect(car.x + car.width - 17, car.y + 2, 12, 6);
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
    
    let obstacleWidth = OBSTACLE_WIDTH;
    let obstacleHeight = OBSTACLE_HEIGHT;
    let horizontalSpeed = 0;
    let direction = 1;
    let isZebraCrossing = false;
    
    if (type.type === 'pedestrian' || type.type === 'animal') {
        obstacleWidth = 50;
        obstacleHeight = 50;
        horizontalSpeed = 1.5;
        direction = Math.random() > 0.5 ? 1 : -1;
    } else if (type.type === 'zebra') {
        isZebraCrossing = true;
        obstacleWidth = LANE_WIDTH * 4;
        obstacleHeight = 100;
    }
    
    const obstacle = {
        x: 50 + lane * LANE_WIDTH + (LANE_WIDTH - obstacleWidth) / 2,
        y: -obstacleHeight,
        width: obstacleWidth,
        height: obstacleHeight,
        type: type.type,
        color: type.color,
        emoji: type.emoji,
        speed: Math.random() * 2 + 1,
        horizontalSpeed: horizontalSpeed,
        direction: direction,
        lane: lane,
        isZebraCrossing: isZebraCrossing
    };
    
    obstacles.push(obstacle);
}

function drawObstacles() {
    obstacles.forEach(obstacle => {
        if (obstacle.type === 'pedestrian') {
            drawPedestrian(obstacle);
        } else if (obstacle.type === 'animal') {
            drawAnimal(obstacle);
        } else if (obstacle.type === 'barrier') {
            drawBarrier(obstacle);
        } else if (obstacle.type === 'cone') {
            drawCone(obstacle);
        }
    });
}

function drawPedestrian(obstacle) {
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;
    
    ctx.save();
    
    const shadowGradient = ctx.createRadialGradient(centerX, obstacle.y + 48, 0, centerX, obstacle.y + 48, 18);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, obstacle.y + 48, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#ffeaa7';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 10, 9, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(centerX - 3, centerY - 11, 1.5, 0, Math.PI * 2);
    ctx.arc(centerX + 3, centerY - 11, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e17055';
    ctx.beginPath();
    ctx.arc(centerX, centerY - 7, 4, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.arc(centerX - 2, centerY - 7, 1.5, 0, Math.PI * 2);
    ctx.arc(centerX + 2, centerY - 7, 1.5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#3498db';
    ctx.fillRect(centerX - 6, centerY + 2, 12, 18);
    
    ctx.fillStyle = '#2980b9';
    ctx.fillRect(centerX - 6, centerY + 2, 12, 4);
    
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(centerX - 7, centerY + 20, 5, 14);
    ctx.fillRect(centerX + 2, centerY + 20, 5, 14);
    
    ctx.fillStyle = '#34495e';
    ctx.fillRect(centerX - 7, centerY + 32, 5, 4);
    ctx.fillRect(centerX + 2, centerY + 32, 5, 4);
    
    ctx.restore();
}

function drawAnimal(obstacle) {
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;
    
    ctx.save();
    
    const shadowGradient = ctx.createRadialGradient(centerX, obstacle.y + 48, 0, centerX, obstacle.y + 48, 18);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, obstacle.y + 48, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 5, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.ellipse(centerX, centerY + 5, 14, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.arc(centerX - 12, centerY - 2, 8, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.arc(centerX - 12, centerY - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#2d3436';
    ctx.beginPath();
    ctx.ellipse(centerX - 14, centerY - 3, 3, 2, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#f39c12';
    ctx.beginPath();
    ctx.moveTo(centerX - 18, centerY - 8);
    ctx.lineTo(centerX - 22, centerY - 15);
    ctx.lineTo(centerX - 14, centerY - 8);
    ctx.fill();
    
    ctx.fillStyle = '#e67e22';
    ctx.beginPath();
    ctx.moveTo(centerX - 17, centerY - 9);
    ctx.lineTo(centerX - 20, centerY - 14);
    ctx.lineTo(centerX - 15, centerY - 9);
    ctx.fill();
    
    ctx.fillStyle = '#2d3436';
    ctx.fillRect(centerX - 8, centerY + 10, 4, 14);
    ctx.fillRect(centerX + 4, centerY + 10, 4, 14);
    
    ctx.fillStyle = '#34495e';
    ctx.fillRect(centerX - 8, centerY + 20, 4, 5);
    ctx.fillRect(centerX + 4, centerY + 20, 4, 5);
    
    ctx.fillStyle = '#f39c12';
    ctx.fillRect(centerX - 6, centerY - 8, 12, 8);
    
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(centerX - 6, centerY - 8, 12, 3);
    
    ctx.restore();
}

function drawBarrier(obstacle) {
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;
    
    ctx.save();
    
    const shadowGradient = ctx.createRadialGradient(centerX, obstacle.y + 65, 0, centerX, obstacle.y + 65, 35);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, obstacle.y + 65, 30, 10, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#e67e22';
    ctx.fillRect(obstacle.x + 15, obstacle.y + 10, 130, 30);
    
    ctx.fillStyle = '#d35400';
    ctx.fillRect(obstacle.x + 15, obstacle.y + 10, 130, 4);
    ctx.fillRect(obstacle.x + 15, obstacle.y + 36, 130, 4);
    
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(obstacle.x + 20 + i * 35, obstacle.y + 14, 25, 22);
    }
    
    ctx.fillStyle = '#e67e22';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(obstacle.x + 25 + i * 35, obstacle.y + 18, 15, 14);
    }
    
    ctx.fillStyle = '#d35400';
    for (let i = 0; i < 4; i++) {
        ctx.fillRect(obstacle.x + 25 + i * 35, obstacle.y + 18, 15, 2);
        ctx.fillRect(obstacle.x + 25 + i * 35, obstacle.y + 30, 15, 2);
    }
    
    ctx.fillStyle = '#bdc3c7';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(obstacle.x + 10 + i * 35, obstacle.y + 40, 8, 8);
    }
    
    ctx.fillStyle = '#7f8c8d';
    for (let i = 0; i < 5; i++) {
        ctx.fillRect(obstacle.x + 12 + i * 35, obstacle.y + 42, 4, 4);
    }
    
    ctx.restore();
}

function drawCone(obstacle) {
    const centerX = obstacle.x + obstacle.width / 2;
    const centerY = obstacle.y + obstacle.height / 2;
    
    ctx.save();
    
    const shadowGradient = ctx.createRadialGradient(centerX, obstacle.y + 65, 0, centerX, obstacle.y + 65, 30);
    shadowGradient.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
    shadowGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = shadowGradient;
    ctx.beginPath();
    ctx.ellipse(centerX, obstacle.y + 65, 25, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    const coneGradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y + obstacle.height);
    coneGradient.addColorStop(0, '#e74c3c');
    coneGradient.addColorStop(0.5, '#c0392b');
    coneGradient.addColorStop(1, '#e74c3c');
    
    ctx.fillStyle = coneGradient;
    ctx.beginPath();
    ctx.moveTo(centerX, obstacle.y + 10);
    ctx.lineTo(obstacle.x + 25, obstacle.y + 55);
    ctx.lineTo(obstacle.x + obstacle.width - 25, obstacle.y + 55);
    ctx.closePath();
    ctx.fill();
    
    ctx.fillStyle = '#fff';
    ctx.fillRect(obstacle.x + 30, obstacle.y + 30, obstacle.width - 60, 10);
    
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(obstacle.x + 35, obstacle.y + 33, obstacle.width - 70, 4);
    
    ctx.fillStyle = '#e74c3c';
    ctx.beginPath();
    ctx.ellipse(centerX, obstacle.y + 55, 35, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.fillStyle = '#c0392b';
    ctx.beginPath();
    ctx.ellipse(centerX, obstacle.y + 55, 30, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.restore();
}

function updateObstacles() {
    obstacles.forEach(obstacle => {
        obstacle.y += obstacle.speed + car.speed * 0.5;
        
        if (obstacle.horizontalSpeed > 0) {
            obstacle.x += obstacle.horizontalSpeed * obstacle.direction;
            
            const minX = 50 + obstacle.lane * LANE_WIDTH + 10;
            const maxX = 50 + obstacle.lane * LANE_WIDTH + LANE_WIDTH - obstacle.width - 10;
            
            if (obstacle.x <= minX || obstacle.x >= maxX) {
                obstacle.direction *= -1;
                obstacle.x = Math.max(minX, Math.min(maxX, obstacle.x));
            }
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
    document.getElementById('score').textContent = '分数: ' + score;
    document.getElementById('speed').textContent = '速度: ' + Math.floor(car.speed * 10);
}

function gameOver() {
    gameRunning = false;
    stopBackgroundMusic();
    document.getElementById('final-score').textContent = score;
    document.getElementById('game-over-screen').style.display = 'flex';
}

function gameLoop() {
    if (!gameRunning) return;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    roadOffset += car.speed;
    if (roadOffset > 70) roadOffset = 0;
    
    drawRoad();
    
    updateCar();
    drawCar();
    
    obstacleTimer++;
    if (obstacleTimer >= obstacleInterval) {
        createObstacle();
        obstacleTimer = 0;
        obstacleInterval = Math.max(60, 100 - Math.floor(score / 1000));
    }
    
    updateObstacles();
    drawObstacles();
    
    updateScore();
    
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    requestAnimationFrame(gameLoop);
}

function startGame() {
    gameRunning = true;
    score = 0;
    
    const carType = carTypes[selectedCarType];
    car.width = carType.width;
    car.height = carType.height;
    car.maxSpeed = carType.maxSpeed;
    car.acceleration = carType.acceleration;
    car.deceleration = carType.deceleration;
    car.color = carType.color;
    car.secondaryColor = carType.secondaryColor;
    
    car.x = canvas.width / 2 - car.width / 2;
    car.y = canvas.height - car.height - 50;
    car.speed = 0;
    
    obstacles = [];
    obstacleTimer = 0;
    obstacleInterval = 100;
    
    document.getElementById('start-screen').style.display = 'none';
    document.getElementById('game-over-screen').style.display = 'none';
    
    startBackgroundMusic();
    gameLoop();
}

document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', startGame);

document.querySelectorAll('.car-option').forEach(option => {
    option.addEventListener('click', function() {
        document.querySelectorAll('.car-option').forEach(opt => opt.classList.remove('selected'));
        this.classList.add('selected');
        selectedCarType = this.getAttribute('data-car');
    });
});

document.querySelector('.car-option[data-car="sedan"]').classList.add('selected');
