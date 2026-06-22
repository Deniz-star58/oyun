const myLobbyId = Math.random().toString(36).substring(2, 6).toUpperCase();

window.addEventListener("DOMContentLoaded", () => {
    const display = document.getElementById("my-id-display");
    if(display) display.innerText = myLobbyId;
    updateProfileUI();
});

let currentLobby = myLobbyId;
let isMultiplayer = false;
let gameActive = false;
let animationFrameId;

// PROFİL VE SEVİYE DEĞİŞKENLERİ
let username = "Oyuncu_1";
let playerLevel = 1;
let playerXP = 0;
let currentWave = 1; 

// OYUN ALANI VE DİNAMİK BOYUTLAR
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 40;

let cols = 30;
let rows = 20;
let map = [];

// OYUNCU DURUMLARI
let player = { x: 0, y: 0, size: 20, color: "#00ffcc", baseSpeed: 4, speed: 4, isDead: false, hasShield: false, hasSpeedBoost: false, effectTimer: 0 };
let teammate = { x: -100, y: -100, size: 20, color: "#ff007f", isDead: false, username: "Arkadaşın" };
let monsters = [];
let items = []; 
let finishLine = { x: 0, y: 0, size: 30 };

let joystickX = 0, joystickY = 0;

// %35 DİNAMİK ARTIŞ FORMÜLÜ
function getRequiredXP(lvl) {
    let baseXP = 1000;
    for (let i = 1; i < lvl; i++) {
        baseXP = baseXP * 1.35;
    }
    return Math.floor(baseXP);
}

function addXP(amount) {
    playerXP += amount;
    let req = getRequiredXP(playerLevel);
    while (playerXP >= req) {
        playerXP -= req;
        playerLevel++;
        req = getRequiredXP(playerLevel);
    }
    updateProfileUI();
}

function updateProfileUI() {
    const menuLvl = document.getElementById("menu-level");
    const menuXp = document.getElementById("menu-xp");
    const uiLvl = document.getElementById("ui-level");
    
    if(menuLvl) menuLvl.innerText = playerLevel;
    if(menuXp) menuXp.innerText = playerXP + " / " + getRequiredXP(playerLevel);
    if(uiLvl) uiLvl.innerText = playerLevel;
}

// 1. DİNAMİK HARİTA ÜRETİCİ
function generateRandomMap() {
    cols = Math.min(30 + (currentWave - 1) * 3, 45);
    rows = Math.min(20 + (currentWave - 1) * 2, 30);
    
    canvas.width = cols * tileSize;
    canvas.height = rows * tileSize;

    map = [];
    for (let r = 0; r < rows; r++) {
        map[r] = [];
        for (let c = 0; c < cols; c++) {
            if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) {
                map[r][c] = 1; 
            } else {
                let wallChance = Math.max(0.18 - (currentWave * 0.01), 0.12);
                map[r][c] = Math.random() < wallChance ? 1 : 0; 
            }
        }
    }
}

// 2. RASTGELE OYUNCU DOĞURMA
function spawnPlayerRandomly() {
    let rx, ry;
    do {
        rx = Math.floor(Math.random() * (cols - 2)) + 1;
        ry = Math.floor(Math.random() * (rows - 2)) + 1;
    } while (map[ry][rx] === 1);

    player.x = rx * tileSize + 10;
    player.y = ry * tileSize + 10;

    for(let i = -1; i <= 1; i++) {
        for(let j = -1; j <= 1; j++) {
            if(map[ry + i] && map[ry + i][rx + j] !== undefined) {
                if(ry + i !== 0 && rx + j !== 0 && ry + i !== rows - 1 && rx + j !== cols - 1) {
                    map[ry + i][rx + j] = 0;
                }
            }
        }
    }
}

// 3. RASTGELE SARI NOKTA DOĞURMA
function spawnFinishLineRandomly() {
    let rx, ry, distance, safetyCounter = 0;
    let pTileX = Math.floor(player.x / tileSize);
    let pTileY = Math.floor(player.y / tileSize);

    do {
        rx = Math.floor(Math.random() * (cols - 2)) + 1;
        ry = Math.floor(Math.random() * (rows - 2)) + 1;
        distance = Math.abs(rx - pTileX) + Math.abs(ry - pTileY);
        safetyCounter++;
        if(safetyCounter > 150) break;
    } while (map[ry][rx] === 1 || distance < 6);

    finishLine.x = rx * tileSize + 5;
    finishLine.y = ry * tileSize + 5;
    map[ry][rx] = 0; 
}

// 4. CANAVAR DOĞURMA
function spawnMonsters() {
    monsters = [];
    let count = currentWave; 
    let pTileX = Math.floor(player.x / tileSize);
    let pTileY = Math.floor(player.y / tileSize);

    for (let i = 0; i < count; i++) {
        let rx, ry, distance, safetyCounter = 0;
        do {
            rx = Math.floor(Math.random() * (cols - 2)) + 1;
            ry = Math.floor(Math.random() * (rows - 2)) + 1;
            distance = Math.abs(rx - pTileX) + Math.abs(ry - pTileY);
            safetyCounter++;
            if(safetyCounter > 100) break; 
        } while (map[ry][rx] === 1 || distance < 5);

        monsters.push({
            x: rx * tileSize + 10,
            y: ry * tileSize + 10,
            size: 22,
            color: "#ff3333",
            speed: 1.5 + (Math.random() * 0.4),
            offsetX: (i % 3 - 1) * 15,
            offsetY: (Math.floor(i / 3) - 1) * 15
        });
        map[ry][rx] = 0;
    }
}

// 5. GÜVENLİ KUTU OLUŞTURMA
function spawnItems() {
    items = [];
    let itemCount = 2 + currentWave; 
    for (let i = 0; i < itemCount; i++) {
        let rx, ry, safetyCounter = 0;
        do {
            rx = Math.floor(Math.random() * (cols - 2)) + 1;
            ry = Math.floor(Math.random() * (rows - 2)) + 1;
            safetyCounter++;
            if(safetyCounter > 100) break;
        } while (map[ry][rx] === 1);

        items.push({
            x: rx * tileSize + 10,
            y: ry * tileSize + 10,
            size: 20,
            type: Math.random() < 0.6 ? "speed" : "shield"
        });
    }
}

// KONTROLLER
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function checkWallCollision(x, y, size) {
    let left = Math.floor(x / tileSize);
    let right = Math.floor((x + size) / tileSize);
    let top = Math.floor(y / tileSize);
    let bottom = Math.floor((y + size) / tileSize);
    
    if (left < 0 || right >= cols || top < 0 || bottom >= rows) return true;
    if (map[top] && (map[top][left] === 1 || map[top][right] === 1)) return true;
    if (map[bottom] && (map[bottom][left] === 1 || map[bottom][right] === 1)) return true;
    return false;
}

// LABİRENT EN KISA YOL BULMA ALGORİTMASI (BFS)
function getNextStepBFS(startGridX, startGridY, targetGridX, targetGridY) {
    if (startGridX === targetGridX && startGridY === targetGridY) return { x: startGridX, y: startGridY };

    let queue = [[startGridX, startGridY]];
    let visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    let parent = {};

    visited[startGridY][startGridX] = true;

    const dirs = [
        { dx: 0, dy: -1 }, 
        { dx: 0, dy: 1 },  
        { dx: -1, dy: 0 }, 
        { dx: 1, dy: 0 }   
    ];

    let found = false;

    while (queue.length > 0) {
        let [cx, cy] = queue.shift();

        if (cx === targetGridX && cy === targetGridY) {
            found = true;
            break;
        }

        for (let d of dirs) {
            let nx = cx + d.dx;
            let ny = cy + d.dy;

            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                if (!visited[ny][nx] && map[ny][nx] === 0) {
                    visited[ny][nx] = true;
                    parent[`${nx},${ny}`] = { x: cx, y: cy };
                    queue.push([nx, ny]);
                }
            }
        }
    }

    if (!found) return null; 

    let curr = { x: targetGridX, y: targetGridY };
    let path = [];
    while (curr && (curr.x !== startGridX || curr.y !== startGridY)) {
        path.push(curr);
        curr = parent[`${curr.x},${curr.y}`];
    }

    return path.length > 0 ? path[path.length - 1] : { x: startGridX, y: startGridY };
}

// OYUN GÜNCELLEMELERİ
function updateGameElements() {
    if (!player.isDead) {
        let nextX = player.x;
        let nextY = player.y;

        if (keys["ArrowUp"] || keys["w"] || joystickY < -0.2) nextY -= player.speed;
        if (keys["ArrowDown"] || keys["s"] || joystickY > 0.2) nextY += player.speed;
        if (keys["ArrowLeft"] || keys["a"] || joystickX < -0.2) nextX -= player.speed;
        if (keys["ArrowRight"] || keys["d"] || joystickX > 0.2) nextX += player.speed;

        if (!checkWallCollision(nextX, player.y, player.size)) player.x = nextX;
        if (!checkWallCollision(player.x, nextY, player.size)) player.y = nextY;

        if (player.hasSpeedBoost || player.hasShield) {
            player.effectTimer--;
            if (player.effectTimer <= 0) {
                player.speed = player.baseSpeed;
                player.hasSpeedBoost = false;
                player.hasShield = false;
                document.getElementById("ui-effect").innerText = "Yok";
            }
        }

        items.forEach((item, index) => {
            let dist = Math.hypot(player.x - item.x, player.y - item.y);
            if (dist < player.size + 10) {
                if (item.type === "speed") {
                    player.hasSpeedBoost = true;
                    player.speed = player.baseSpeed * 1.4;
                    player.effectTimer = 300;
                    document.getElementById("ui-effect").innerText = "HIZ (%40)";
                } else if (item.type === "shield") {
                    player.hasShield = true;
                    player.effectTimer = 600;
                    document.getElementById("ui-effect").innerText = "KALKAN";
                }
                items.splice(index, 1);
            }
        });

        let distToFinish = Math.hypot((player.x + player.size/2) - (finishLine.x + finishLine.size/2), (player.y + player.size/2) - (finishLine.y + finishLine.size/2));
        if (distToFinish < player.size) {
            endGame(true);
        }
    }

    // BFS AKILLI CANAVAR NAVİGASYONU
    monsters.forEach((m, idx) => {
        let target = null;
        if (!player.isDead) target = player;
        if (isMultiplayer && !teammate.isDead) {
            if (!target) target = teammate;
            else {
                let distToMe = Math.hypot(player.x - m.x, player.y - m.y);
                let distToFriend = Math.hypot(teammate.x - m.x, teammate.y - m.y);
                if (distToFriend < distToMe) target = teammate;
            }
        }

        if (!target) return;

        let mGridX = Math.floor((m.x + m.size/2) / tileSize);
        let mGridY = Math.floor((m.y + m.size/2) / tileSize);
        
        let tGridX = Math.floor((target.x + target.size/2 + m.offsetX) / tileSize);
        let tGridY = Math.floor((target.y + target.size/2 + m.offsetY) / tileSize);

        tGridX = Math.max(1, Math.min(cols - 2, tGridX));
        tGridY = Math.max(1, Math.min(rows - 2, tGridY));

        let nextStep = getNextStepBFS(mGridX, mGridY, tGridX, tGridY);

        if (nextStep) {
            let targetWorldX = nextStep.x * tileSize + 10;
            let targetWorldY = nextStep.y * tileSize + 10;

            if (m.x < targetWorldX) m.x += m.speed;
            if (m.x > targetWorldX) m.x -= m.speed;
            if (m.y < targetWorldY) m.y += m.speed;
            if (m.y > targetWorldY) m.y -= m.speed;
        }

        // Canavarların üst üste binmesini engelleme
        monsters.forEach((otherM, otherIdx) => {
            if (idx !== otherIdx) {
                let distToMonster = Math.hypot(m.x - otherM.x, m.y - otherM.y);
                if (distToMonster < m.size) {
                    if (m.x < otherM.x) { m.x -= 0.5; } else { m.x += 0.5; }
                    if (m.y < otherM.y) { m.y -= 0.5; } else { m.y += 0.5; }
                }
            }
        });

        if (!player.isDead) {
            let dist = Math.hypot(player.x - m.x, player.y - m.y);
            if (dist < player.size) {
                if (player.hasShield) {
                    player.hasShield = false;
                    player.effectTimer = 0;
                    document.getElementById("ui-effect").innerText = "Yok";
                    m.x -= 60; 
                } else {
                    player.isDead = true;
                    if (!isMultiplayer || teammate.isDead) {
                        endGame(false);
                    } else {
                        document.getElementById("player-status").innerText = "Öldün! Arkadaşın izleniyor...";
                    }
                }
            }
        }
    });
}

// ÇİZİM
function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05070a";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (map[r] && map[r][c] === 1) {
                ctx.fillStyle = "#1e293b";
                ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize);
            }
        }
    }

    items.forEach(item => {
        ctx.fillStyle = item.type === "speed" ? "#00ff00" : "#00bfff";
        ctx.fillRect(item.x, item.y, item.size, item.size);
    });

    ctx.fillStyle = "#ffd700";
    ctx.fillRect(finishLine.x, finishLine.y, finishLine.size, finishLine.size);

    if (!player.isDead) {
        ctx.fillStyle = player.hasShield ? "#00bfff" : player.color;
        ctx.fillRect(player.x, player.y, player.size, player.size);
    }

    monsters.forEach(m => {
        ctx.fillStyle = m.color;
        ctx.fillRect(m.x, m.y, m.size, m.size);
    });
}

function gameLoop() {
    if (!gameActive) return;
    updateGameElements();
    draw();
    animationFrameId = requestAnimationFrame(gameLoop);
}

function endGame(isWin) {
    gameActive = false;
    cancelAnimationFrame(animationFrameId);
    
    const screen = document.getElementById("game-over-screen");
    const title = document.getElementById("game-over-title");
    const xpText = document.getElementById("xp-gain-text");

    if(screen) screen.classList.remove("hidden");

    if (isWin) {
        if(title) { title.innerText = "MAÇI KAZANDIN!"; title.style.color = "#00ffcc"; }
        let earnedXP = currentWave * 150; 
        addXP(earnedXP);
        if(xpText) xpText.innerText = `+${earnedXP} TP Kazandın!`;
        currentWave++;
    } else {
        if(title) { title.innerText = "KAYBETTİNİZ!"; title.style.color = "#ff007f"; }
        if(xpText) xpText.innerText = "Mevcut seviyeniz korundu! Maç dalgası sıfırlandı.";
        currentWave = 1; 
        updateProfileUI();
    }
}

// LISTENERS
document.getElementById("btn-start-solo").addEventListener("click", () => {
    username = document.getElementById("username-input").value.trim() || "Oyuncu_1";
    document.getElementById("ui-username").innerText = username;
    
    const selectedColor = document.getElementById("color-picker").value;
    player.color = selectedColor;

    startNewMatch();
});

document.getElementById("btn-next-game").addEventListener("click", () => {
    document.getElementById("game-over-screen").classList.add("hidden");
    startNewMatch();
});

document.getElementById("btn-go-menu").addEventListener("click", () => {
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("lobby-menu").classList.remove("hidden");
});

function startNewMatch() {
    document.getElementById("lobby-menu").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    document.getElementById("current-lobby-text").innerText = currentLobby;
    
    player.isDead = false; player.hasShield = false; player.hasSpeedBoost = false;
    player.speed = player.baseSpeed;
    
    if('ontouchstart' in window) {
        document.getElementById("mobile-controls").style.display = "block";
    }

    generateRandomMap();
    spawnPlayerRandomly();      
    spawnFinishLineRandomly();  
    spawnMonsters();            
    spawnItems();
    updateProfileUI();
    
    gameActive = true;
    gameLoop();
}

// MOBİL JOYSTICK
const joystickZone = document.getElementById("joystick-zone");
const joystickStick = document.getElementById("joystick-stick");

if(joystickZone) {
    joystickZone.addEventListener("touchstart", handleTouch);
    joystickZone.addEventListener("touchmove", handleTouch);
    joystickZone.addEventListener("touchend", () => {
        joystickX = 0; joystickY = 0;
        if(joystickStick) {
            joystickStick.style.top = "35px"; 
            joystickStick.style.left = "35px";
        }
    });
}

function handleTouch(e) {
    e.preventDefault();
    let touch = e.touches[0];
    let rect = joystickZone.getBoundingClientRect();
    let centerX = rect.left + rect.width / 2;
    let centerY = rect.top + rect.height / 2;
    
    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;
    let distance = Math.hypot(deltaX, deltaY);
    let maxDistance = 35;

    if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
    }

    if(joystickStick) {
        joystickStick.style.left = (35 + deltaX) + "px";
        joystickStick.style.top = (35 + deltaY) + "px";
    }

    joystickX = deltaX / maxDistance;
    joystickY = deltaY / maxDistance;
}