// ==========================================
// 1. ADIM: GENEL OYUN VE BAĞLANTI DEĞİŞKENLERİ
// ==========================================
let gameActive = false;
let animationFrameId;
let isSoloMode = true;
let isHost = false; // Lobiyi kuran kişi mi?

// WebRTC (PeerJS) Uzaktan Bağlantı Değişkenleri
let peer;
let peerConn = null;
let myID = "";

// Kalıcı Profil ve Dalga (Zorluk) Sistemleri
let playerLevel = 1;
let playerXP = 0;
let currentWave = 1; 

// Oyun Alanı (Canvas) Tanımlamaları
const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 40; // Haritadaki her bir kare bloğun boyutu (40x40 piksel)
let cols = 30;
let rows = 20;
let map = [];

// Oyuncu Nesneleri (Boyutları görsellere göre 24 piksele dengelendi)
let player1 = { x: 0, y: 0, size: 24, color: "#00ffcc", username: "Deniz", isDead: false, hasShield: false, hasSpeedBoost: false, effectTimer: 0, speed: 4, baseSpeed: 4 };
let player2 = { x: -100, y: -100, size: 24, color: "#ff007f", username: "Arkadaşın", isDead: false }; 

// Oyun İçi Dinamik Listeler
let monsters = [];
let items = []; 
let bombs = []; // TNT Bombaları
let finishLine = { x: 0, y: 0, size: 30 }; // Sarı Altın Kapı
let particles = []; // TNT patladığında saçılan alev parçacıkları
let joyLeftX = 0, joyLeftY = 0; // Mobil joystick yön verileri

// ==========================================
// 2. ADIM: GERÇEKÇİ ÇİZİM MOTORU (SVG DİJİTAL ÇİZİMLER)
// ==========================================
// Bu fonksiyonlar haritadaki o eski düz kareleri siler, yerine şık arcade görselleri çizer.

// Gelişmiş Astronot Çizimi (Gövde, kollar ve bacaklar tamamen seçilen renge boyanır)
function drawAstronaut(targetCtx, x, y, color, size, isUI = false) {
    let ox = isUI ? x : x + size/2;
    let oy = isUI ? y : y + size/2;
    targetCtx.save();
    targetCtx.translate(ox, oy);

    // Kollar ve Bacaklar
    targetCtx.fillStyle = color;
    targetCtx.fillRect(-size/2, 0, size, size/3); // Kollar
    targetCtx.fillRect(-size/3, size/4, size/5, size/3); // Sol bacak
    targetCtx.fillRect(size/8, size/4, size/5, size/3); // Sağ bacak

    // Gövde
    targetCtx.beginPath();
    targetCtx.roundRect(-size/3, -size/4, (size/3)*2, size/2, 5);
    targetCtx.fill();

    // Kask Kılıfı
    targetCtx.fillStyle = "#e2e8f0";
    targetCtx.beginPath(); targetCtx.arc(0, -size/3, size/2.5, 0, Math.PI*2); targetCtx.fill();

    // Vizör (Kask Camı)
    targetCtx.fillStyle = "#1e293b";
    targetCtx.beginPath(); targetCtx.roundRect(-size/4, -size/2, size/2, size/4, 3); targetCtx.fill();
    targetCtx.restore();
}

// Kızgın Kırmızı Canavar Çizimi (Gözler ve Dişler Entegreli)
function drawMonster(x, y, size) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.fillStyle = "#ef4444"; // Canavar gövde kırmızısı
    ctx.beginPath(); ctx.arc(0, 0, size/2, Math.PI, 0); ctx.fill();
    ctx.fillRect(-size/2, 0, size, size/2);
    // Beyaz Gözler ve Siyah Göz Bebekleri
    ctx.fillStyle = "#ffffff";
    ctx.beginPath(); ctx.arc(-size/4, -size/10, size/6, 0, Math.PI*2); ctx.arc(size/4, -size/10, size/6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#000000";
    ctx.beginPath(); ctx.arc(-size/4, -size/10, size/12, 0, Math.PI*2); ctx.arc(size/4, -size/10, size/12, 0, Math.PI*2); ctx.fill();
    // Diş Grubu
    ctx.fillStyle = "#ffffff"; ctx.fillRect(-size/4, size/5, size/2, size/10);
    ctx.restore();
}

// Fitili Yanan 3D Görünümlü TNT Çizimi
function drawTNT(x, y, size) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    ctx.fillStyle = "#b91c1c"; // TNT Kırmızısı
    ctx.beginPath(); ctx.roundRect(-size/2, -size/2, size, size, 4); ctx.fill();
    ctx.fillStyle = "#fde047"; ctx.fillRect(-size/2, -size/6, size, size/3); // Şerit alanı
    ctx.fillStyle = "#000000"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center"; ctx.fillText("TNT", 0, 3);
    // Yanan Turuncu Fitil Çizgisi
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.quadraticCurveTo(5, -size/2 - 5, 3, -size/2 - 8); ctx.stroke();
    ctx.fillStyle = "#eab308"; ctx.beginPath(); ctx.arc(3, -size/2 - 8, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

// Güçlendirme İkonları Çizimi (Yeşil Ayakkabı / Mavi Kalkan)
function drawPowerUp(x, y, type, size) {
    ctx.save();
    ctx.translate(x + size/2, y + size/2);
    if (type === "speed") {
        ctx.fillStyle = "#22c55e"; // Hız İkonu (Yeşil Ayakkabı)
        ctx.beginPath(); ctx.moveTo(-size/3, size/3); ctx.lineTo(size/3, size/3); ctx.lineTo(size/3, -size/4); ctx.lineTo(0, -size/4); ctx.lineTo(-size/3, size/8); ctx.closePath(); ctx.fill();
    } else {
        ctx.fillStyle = "#3b82f6"; // Kalkan İkonu (Mavi Şövalye Kalkanı)
        ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.lineTo(size/2, -size/4); ctx.lineTo(size/3, size/4); ctx.quadraticCurveTo(0, size/2, -size/3, size/4); ctx.lineTo(-size/2, -size/4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

// Lobi Bekleme Odasındaki Yuvarlak Önizleme Ekranlarının Çizimi
function updateLobbyPreviews() {
    const c1 = document.getElementById("preview-p1").getContext("2d");
    const c2 = document.getElementById("preview-p2").getContext("2d");
    c1.clearRect(0, 0, 100, 100); c2.clearRect(0, 0, 100, 100);
    drawAstronaut(c1, 50, 60, player1.color, 40, true);
    if (!isSoloMode) drawAstronaut(c2, 50, 60, player2.color, 40, true);
}

// ==========================================
// 3. ADIM: EFEKT MOTORU (TNT PATLAMA ANİMASYONU)
// ==========================================
function createExplosion(x, y) {
    for (let i = 0; i < 25; i++) {
        let angle = Math.random() * Math.PI * 2;
        let speed = 1 + Math.random() * 4;
        particles.push({
            x: x, y: y,
            vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
            size: 2 + Math.random() * 4, alpha: 1,
            color: Math.random() < 0.5 ? "#f97316" : "#eab308" // Turuncu-Sarı parçacıklar
        });
    }
}

function updateAndDrawParticles() {
    for (let i = particles.length - 1; i >= 0; i--) {
        let p = particles[i]; p.x += p.vx; p.y += p.vy; p.alpha -= 0.02;
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        ctx.save(); ctx.globalAlpha = p.alpha; ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill(); ctx.restore();
    }
}

// ==========================================
// 4. ADIM: KAYITSIZ ONLINE LOBİ VE BAĞLANTI SISTEMI
// ==========================================
function initOnlineConnection() {
    let randomID = Math.floor(10000 + Math.random() * 90000).toString();
    peer = new Peer(randomID);
    peer.on('open', id => { myID = id; document.getElementById("my-peer-id").innerText = myID; });

    // Birisi bizim odamıza bağlandığında tetiklenir (Biz Lobi Sahibiyiz)
    peer.on('connection', conn => {
        if (peerConn) return; 
        peerConn = conn; isHost = true; isSoloMode = false;
        document.getElementById("lobby-menu").classList.add("hidden");
        document.getElementById("pre-game-lobby").classList.remove("hidden");
        document.getElementById("btn-lobby-start").classList.remove("hidden"); // Maçı başlat butonunu aç
        document.getElementById("lobby-status").innerText = "Arkadaşın bağlandı! Maçı başlatabilirsin.";
        setupOnlineListeners();
        sendLobbySync();
    });
}

function updateMyColor(val) {
    player1.color = val; updateLobbyPreviews();
    if (peerConn && peerConn.open) {
        peerConn.send({ type: "lobbyUpdate", color: player1.color, username: player1.username });
    }
}

function setupOnlineListeners() {
    peerConn.on('data', data => {
        if (data.type === "lobbyUpdate") {
            player2.color = data.color; player2.username = data.username;
            document.getElementById("lobby-n2").innerText = data.username;
            updateLobbyPreviews();
        }
        if (data.type === "startGame") {
            // Misafir oyuncu verileri alır ve maça girer
            map = data.map; finishLine = data.finishLine; monsters = data.monsters;
            items = data.items; bombs = data.bombs; cols = data.cols; rows = data.rows; currentWave = data.currentWave;
            canvas.width = cols * tileSize; canvas.height = rows * tileSize;
            document.getElementById("pre-game-lobby").classList.add("hidden");
            document.getElementById("game-container").classList.remove("hidden");
            document.getElementById("connection-status").innerText = "Mod: Uzaktan Bağlantı Aktif";
            gameActive = true; gameLoop();
        }
        if (data.type === "pos") { player2.x = data.x; player2.y = data.y; player2.isDead = data.isDead; player2.color = data.color; }
        if (data.type === "explosion") { createExplosion(data.x, data.y); }
        if (data.type === "exitToMenu") { location.reload(); }
    });
}

function sendLobbySync() {
    if (peerConn && peerConn.open) { peerConn.send({ type: "lobbyUpdate", color: player1.color, username: player1.username }); }
}

// ==========================================
// 5. ADIM: OYUN ALANI VE HARİTA MEKANİKLERİ
// ==========================================
function getRequiredXP(lvl) {
    let baseXP = 1000;
    for (let i = 1; i < lvl; i++) { baseXP = baseXP * 1.35; }
    return Math.floor(baseXP);
}

function addXP(amount) {
    playerXP += amount; let req = getRequiredXP(playerLevel);
    while (playerXP >= req) { playerXP -= req; playerLevel++; req = getRequiredXP(playerLevel); }
    updateProfileUI();
}

function updateProfileUI() {
    const barFill = document.getElementById("ui-tp-bar");
    const requiredXP = getRequiredXP(playerLevel);
    const percentage = (playerXP / requiredXP) * 100;
    if(barFill) barFill.style.width = percentage + "%";
    const uiLvl = document.getElementById("ui-level"); if(uiLvl) uiLvl.innerText = playerLevel;
}

function generateRandomMap() {
    cols = Math.min(30 + (currentWave - 1) * 3, 45); rows = Math.min(20 + (currentWave - 1) * 2, 30);
    canvas.width = cols * tileSize; canvas.height = rows * tileSize;
    map = [];
    for (let r = 0; r < rows; r++) {
        map[r] = [];
        for (let c = 0; c < cols; c++) {
            if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) { map[r][c] = 1; } 
            else { map[r][c] = Math.random() < Math.max(0.18 - (currentWave * 0.01), 0.12) ? 1 : 0; }
        }
    }
}

function spawnPlayers() {
    let rx, ry;
    do { rx = Math.floor(Math.random() * (cols - 2)) + 1; ry = Math.floor(Math.random() * (rows - 2)) + 1; } while (map[ry][rx] === 1);
    player1.x = rx * tileSize + 8; player1.y = ry * tileSize + 8; map[ry][rx] = 0;
    if (isSoloMode) player2.isDead = true;
}

function spawnFinishLineRandomly() {
    let rx, ry, safety = 0;
    do { rx = Math.floor(Math.random() * (cols - 2)) + 1; ry = Math.floor(Math.random() * (rows - 2)) + 1; safety++; if(safety > 100) break; } while (map[ry][rx] === 1);
    finishLine.x = rx * tileSize + 5; finishLine.y = ry * tileSize + 5; map[ry][rx] = 0;
}

function spawnMonsters() {
    monsters = [];
    for (let i = 0; i < currentWave; i++) {
        let rx, ry;
        do { rx = Math.floor(Math.random() * (cols - 2)) + 1; ry = Math.floor(Math.random() * (rows - 2)) + 1; } while (map[ry][rx] === 1);
        monsters.push({
            x: rx * tileSize + 8, y: ry * tileSize + 8, size: 24, color: "#ff3333",
            speed: 1.5 + (Math.random() * 0.4), offsetX: (i % 3 - 1) * 15, offsetY: (Math.floor(i / 3) - 1) * 15
        });
    }
}

function spawnItems() {
    items = [];
    for (let i = 0; i < 3; i++) {
        let rx, ry;
        do { rx = Math.floor(Math.random() * (cols - 2)) + 1; ry = Math.floor(Math.random() * (rows - 2)) + 1; } while (map[ry][rx] === 1);
        items.push({ x: rx * tileSize + 10, y: ry * tileSize + 10, size: 20, type: Math.random() < 0.6 ? "speed" : "shield" });
    }
}

function spawnBombs() {
    bombs = [];
    let bombCount = 3 + currentWave;
    for (let i = 0; i < bombCount; i++) {
        let rx, ry, safety = 0;
        do { rx = Math.floor(Math.random() * (cols - 2)) + 1; ry = Math.floor(Math.random() * (rows - 2)) + 1; safety++; if (safety > 100) break; } 
        while (map[ry][rx] === 1 || (rx === Math.floor(player1.x/tileSize) && ry === Math.floor(player1.y/tileSize)));
        bombs.push({ x: rx * tileSize + 8, y: ry * tileSize + 8, size: 24 });
    }
}

// ==========================================
// 6. ADIM: OYUN DÖNGÜSÜ VE ÇARPIŞMA MOTORU
// ==========================================
let keys = {};
window.addEventListener("keydown", e => keys[e.key] = true);
window.addEventListener("keyup", e => keys[e.key] = false);

function checkWallCollision(x, y, size) {
    let left = Math.floor(x / tileSize); let right = Math.floor((x + size) / tileSize);
    let top = Math.floor(y / tileSize); let bottom = Math.floor((y + size) / tileSize);
    if (left < 0 || right >= cols || top < 0 || bottom >= rows) return true;
    if (map[top] && (map[top][left] === 1 || map[top][right] === 1)) return true;
    if (map[bottom] && (map[bottom][left] === 1 || map[bottom][right] === 1)) return true;
    return false;
}

// BFS EN KISA YOL YAPAY ZEKASI
function getNextStepBFS(startGridX, startGridY, targetGridX, targetGridY) {
    if (startGridX === targetGridX && startGridY === targetGridY) return { x: startGridX, y: startGridY };
    let queue = [[startGridX, startGridY]]; let visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    let parent = {}; visited[startGridY][startGridX] = true;
    const dirs = [{ dx: 0, dy: -1 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }, { dx: 1, dy: 0 }];
    let found = false;
    while (queue.length > 0) {
        let [cx, cy] = queue.shift();
        if (cx === targetGridX && cy === targetGridY) { found = true; break; }
        for (let d of dirs) {
            let nx = cx + d.dx; let ny = cy + d.dy;
            if (nx >= 0 && nx < cols && ny >= 0 && ny < rows) {
                if (!visited[ny][nx] && map[ny][nx] === 0) { visited[ny][nx] = true; parent[`${nx},${ny}`] = { x: cx, y: cy }; queue.push([nx, ny]); }
            }
        }
    }
    if (!found) return null;
    let curr = { x: targetGridX, y: targetGridY }; let path = [];
    while (curr && (curr.x !== startGridX || curr.y !== startGridY)) { path.push(curr); curr = parent[`${curr.x},${curr.y}`]; }
    return path.length > 0 ? path[path.length - 1] : { x: startGridX, y: startGridY };
}

function updateGameElements() {
    if (!player1.isDead) {
        let nextX = player1.x; let nextY = player1.y;
        if (keys["w"] || keys["ArrowUp"] || joyLeftY < -0.2) nextY -= player1.speed;
        if (keys["s"] || keys["ArrowDown"] || joyLeftY > 0.2) nextY += player1.speed;
        if (keys["a"] || keys["ArrowLeft"] || joyLeftX < -0.2) nextX -= player1.speed;
        if (keys["d"] || keys["ArrowRight"] || joyLeftX > 0.2) nextX += player1.speed;

        if (!checkWallCollision(nextX, player1.y, player1.size)) player1.x = nextX;
        if (!checkWallCollision(player1.x, nextY, player1.size)) player1.y = nextY;

        if (peerConn && peerConn.open) { peerConn.send({ type: "pos", x: player1.x, y: player1.y, isDead: player1.isDead, color: player1.color }); }

        if (player1.hasSpeedBoost || player1.hasShield) {
            player1.effectTimer--;
            if (player1.effectTimer <= 0) { player1.speed = player1.baseSpeed; player1.hasSpeedBoost = false; player1.hasShield = false; document.getElementById("ui-effect").innerText = "Yok"; }
        }

        items.forEach((item, index) => {
            if (Math.hypot(player1.x - item.x, player1.y - item.y) < player1.size) {
                if (item.type === "speed") { player1.hasSpeedBoost = true; player1.speed = player1.baseSpeed * 1.4; player1.effectTimer = 300; document.getElementById("ui-effect").innerText = "HIZ"; } 
                else { player1.hasShield = true; player1.effectTimer = 600; document.getElementById("ui-effect").innerText = "KALKAN"; }
                items.splice(index, 1);
            }
        });

        // TNT Bombaları Patlama Kontrolü
        bombs.forEach((bomb) => {
            if (Math.hypot(player1.x - bomb.x, player1.y - bomb.y) < player1.size) {
                createExplosion(bomb.x + bomb.size/2, bomb.y + bomb.size/2);
                if (peerConn && peerConn.open) { peerConn.send({ type: "explosion", x: bomb.x + bomb.size/2, y: bomb.y + bomb.size/2 }); }

                if (player1.hasShield) {
                    player1.hasShield = false; player1.effectTimer = 0; document.getElementById("ui-effect").innerText = "Yok";
                    bombs = bombs.filter(b => b !== bomb);
                } else { player1.isDead = true; if (!isSoloMode || player2.isDead) { endGame(false); } }
            }
        });

        if (Math.hypot((player1.x + player1.size/2) - (finishLine.x + finishLine.size/2), (player1.y + player1.size/2) - (finishLine.y + finishLine.size/2)) < player1.size) { endGame(true); }
    }

    let shouldUpdateMonsters = isSoloMode || (peerConn && myID < peerConn.peer);
    if (shouldUpdateMonsters && monsters.length > 0) {
        monsters.forEach((m) => {
            let target = !player1.isDead ? player1 : (!isSoloMode && !player2.isDead ? player2 : null);
            if (target && !player1.isDead && !isSoloMode && !player2.isDead) {
                if (Math.hypot(player2.x - m.x, player2.y - m.y) < Math.hypot(player1.x - m.x, player1.y - m.y)) target = player2;
            }
            if (!target) return;

            let mGridX = Math.floor((m.x + m.size/2) / tileSize); let mGridY = Math.floor((m.y + m.size/2) / tileSize);
            let tGridX = Math.max(1, Math.min(cols-2, Math.floor((target.x + m.offsetX)/tileSize)));
            let tGridY = Math.max(1, Math.min(rows-2, Math.floor((target.y + m.offsetY)/tileSize)));

            let nextStep = getNextStepBFS(mGridX, mGridY, tGridX, tGridY);
            if (nextStep) {
                let twX = nextStep.x * tileSize + 8; let twY = nextStep.y * tileSize + 8;
                if (m.x < twX) m.x += m.speed; if (m.x > twX) m.x -= m.speed;
                if (m.y < twY) m.y += m.speed; if (m.y > twY) m.y -= m.speed;
            }
        });
        if (peerConn && peerConn.open && myID < peerConn.peer) {
            peerConn.send({ type: "mapData", map: map, finishLine: finishLine, monsters: monsters, items: items, bombs: bombs, currentWave: currentWave, cols: cols, rows: rows });
        }
    }

    monsters.forEach(m => {
        if (!player1.isDead && Math.hypot(player1.x - m.x, player1.y - m.y) < player1.size) {
            if (player1.hasShield) { player1.hasShield = false; player1.effectTimer = 0; m.x -= 60; } else { player1.isDead = true; }
        }
    });

    if (player1.isDead && (isSoloMode || player2.isDead)) { endGame(false); }
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05070a"; ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (map[r] && map[r][c] === 1) { ctx.fillStyle = "#1e293b"; ctx.fillRect(c * tileSize, r * tileSize, tileSize, tileSize); }
        }
    }
    
    items.forEach(item => drawPowerUp(item.x, item.y, item.type, item.size));
    bombs.forEach(bomb => drawTNT(bomb.x, bomb.y, bomb.size));

    ctx.fillStyle = "#ffd700"; ctx.fillRect(finishLine.x, finishLine.y, finishLine.size, finishLine.size);
    ctx.strokeStyle = "#ffffff"; ctx.strokeRect(finishLine.x, finishLine.y, finishLine.size, finishLine.size);

    if (!player1.isDead) drawAstronaut(ctx, player1.x, player1.y, player1.color, player1.size);
    if (!isSoloMode && !player2.isDead) drawAstronaut(ctx, player2.x, player2.y, player2.color, player2.size);
    
    monsters.forEach(m => drawMonster(m.x, m.y, m.size));
    updateAndDrawParticles();
}

function gameLoop() { if (!gameActive) return; updateGameElements(); draw(); animationFrameId = requestAnimationFrame(gameLoop); }

function endGame(isWin) {
    gameActive = false; cancelAnimationFrame(animationFrameId);
    const screen = document.getElementById("game-over-screen"); const title = document.getElementById("game-over-title"); const xpText = document.getElementById("xp-gain-text");
    if(screen) screen.classList.remove("hidden");

    if (isWin) {
        if(title) { title.innerText = "MAÇI KAZANDINIZ!"; title.style.color = "#00ffcc"; }
        let earnedXP = currentWave * 150; addXP(earnedXP);
        if(xpText) xpText.innerText = `+${earnedXP} TP Kazandınız!`;
        currentWave++;
    } else {
        if(title) { title.innerText = "KAYBETTİNİZ!"; title.style.color = "#ff007f"; }
        if(xpText) xpText.innerText = "Seviye korundu. Dalga sıfırlandı.";
        currentWave = 1; updateProfileUI();
    }
}

function exitToLobbyMenu() {
    gameActive = false; cancelAnimationFrame(animationFrameId); particles = [];
    document.getElementById("game-container").classList.add("hidden");
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("lobby-menu").classList.remove("hidden");
}

// ==========================================
// 7. ADIM: BUTON TETİKLEYİCİLERİ VE LISTENERS
// ==========================================
document.getElementById("btn-start-solo").addEventListener("click", () => {
    isSoloMode = true; player1.color = document.getElementById("color-picker").value;
    player1.username = document.getElementById("username-input").value.trim() || "Deniz";
    document.getElementById("ui-username").innerText = player1.username;
    document.getElementById("connection-status").innerText = "Mod: Tek Oyunculu"; startNewMatch();
});

// LOBİ MAÇ BAŞLATMA (Sadece Host basabilir)
document.getElementById("btn-lobby-start").addEventListener("click", () => {
    if (!isHost) return;
    generateRandomMap(); spawnPlayers(); spawnFinishLineRandomly(); spawnMonsters(); spawnItems(); spawnBombs();
    peerConn.send({ type: "startGame", map, finishLine, monsters, items, bombs, currentWave, cols, rows });
    document.getElementById("pre-game-lobby").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    gameActive = true; gameLoop();
});

document.getElementById("btn-connect-online").addEventListener("click", () => {
    let friendID = document.getElementById("friend-peer-input").value.trim();
    if (friendID.length > 0) {
        player1.color = document.getElementById("color-picker").value; isSoloMode = false; isHost = false;
        player1.username = document.getElementById("username-input").value.trim() || "Deniz";
        document.getElementById("ui-username").innerText = player1.username;
        
        peerConn = peer.connect(friendID);
        peerConn.on('open', () => {
            document.getElementById("lobby-menu").classList.add("hidden");
            document.getElementById("pre-game-lobby").classList.remove("hidden");
            document.querySelector(".host-badge").classList.add("hidden"); // Rozeti gizle
            document.getElementById("lobby-status").innerText = "Lobi sahibinin başlatması bekleniyor...";
            setupOnlineListeners(); sendLobbySync();
        });
    } else { alert("Lütfen arkadaşınızın 5 haneli kodunu girin!"); }
});

document.getElementById("btn-game-exit").addEventListener("click", () => { if (peerConn && peerConn.open) { peerConn.send({ type: "exitToMenu" }); } exitToLobbyMenu(); });
document.getElementById("btn-next-game").addEventListener("click", () => { document.getElementById("game-over-screen").classList.add("hidden"); startNewMatch(); });
document.getElementById("btn-go-menu").addEventListener("click", exitToLobbyMenu);

function startNewMatch() {
    document.getElementById("lobby-menu").classList.add("hidden"); document.getElementById("game-container").classList.remove("hidden");
    player1.isDead = false; player1.hasShield = false; player1.hasSpeedBoost = false; player1.speed = player1.baseSpeed; player2.isDead = false; particles = [];
    if('ontouchstart' in window || navigator.maxTouchPoints > 0) { document.getElementById("mobile-controls").style.display = "block"; }
    generateRandomMap(); spawnPlayers(); spawnFinishLineRandomly(); spawnMonsters(); spawnItems(); spawnBombs();
    document.getElementById("ui-wave").innerText = currentWave; updateProfileUI(); gameActive = true; gameLoop();
}

// MOBİL JOYSTICK
function setupJoystick(zoneId, stickId, callback) {
    const zone = document.getElementById(zoneId); const stick = document.getElementById(stickId); if (!zone || !stick) return;
    zone.addEventListener("touchstart", e => handleTouch(e, zone, stick, callback));
    zone.addEventListener("touchmove", e => handleTouch(e, zone, stick, callback));
    zone.addEventListener("touchend", () => { callback(0, 0); stick.style.top = "33px"; stick.style.left = "33px"; });
}

function handleTouch(e, zone, stick, callback) {
    e.preventDefault(); let touch = e.touches[0]; let rect = zone.getBoundingClientRect();
    let cx = rect.left + rect.width / 2; let cy = rect.top + rect.height / 2;
    let dx = touch.clientX - cx; let dy = touch.clientY - cy; let dist = Math.hypot(dx, dy); let maxDist = 33;
    if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
    stick.style.left = (33 + dx) + "px"; stick.style.top = (33 + dy) + "px"; callback(dx / maxDist, dy / maxDist);
}

setupJoystick("joystick-left", "stick-left", (x, y) => { joyLeftX = x; joyLeftY = y; });

// Sistemi başlat
initOnlineConnection();
updateLobbyPreviews();