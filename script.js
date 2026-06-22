let gameActive = false;
let animationFrameId;
let isSoloMode = true;
let isHost = false;

let peer = null;
let peerConn = null;
let myID = "";

let playerLevel = parseInt(localStorage.getItem("eo_level")) || 1;
let playerXP = parseInt(localStorage.getItem("eo_xp")) || 0;
let totalDiamonds = parseInt(localStorage.getItem("eo_diamonds")) || 0; 
let joystickPos = localStorage.getItem("eo_joy_pos") || "left"; 
let sensitivity = parseInt(localStorage.getItem("eo_sensitivity")) || 50; 
let mapZoom = parseInt(localStorage.getItem("eo_map_zoom")) || 100;
let controlMode = localStorage.getItem("eo_control_mode") || "joystick";

let currentWave = 1; 
let currentMatchDiamonds = 0; 
let deathReason = "Canavara yakalandın"; 

let matchStartTime = 0; 
let matchSurvivalTime = 0; 

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const tileSize = 40;
let map = [];
let cols = 30;
let rows = 20;

let player1 = { x: 120, y: 120, size: 24, color: "#00ffcc", username: "Player 1", isDead: false, hasShield: false, hasSpeedBoost: false, effectTimer: 0, speed: 4, baseSpeed: 4 };
let player2 = { x: -100, y: -100, size: 24, color: "#ff007f", username: "Arkadaşın", isDead: false }; 

let monsters = [];
let items = []; 
let bombs = []; 
let portals = []; 
let finishLine = { x: 0, y: 0, size: 30 }; 
let particles = [];
let joyLeftX = 0, joyLeftY = 0;
let arrowKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };
let portalCooldown = 0; 

function drawAstronaut(targetCtx, x, y, color, size, isUI = false) {
    let ox = isUI ? x : x + size/2;
    let oy = isUI ? y : y + size/2;
    targetCtx.save(); targetCtx.translate(ox, oy);
    targetCtx.fillStyle = color;
    targetCtx.fillRect(-size/2, 0, size, size/3); 
    targetCtx.fillRect(-size/3, size/4, size/5, size/3); 
    targetCtx.fillRect(size/8, size/4, size/5, size/3); 
    targetCtx.beginPath(); targetCtx.roundRect(-size/3, -size/4, (size/3)*2, size/2, 5); targetCtx.fill();
    targetCtx.fillStyle = "#e2e8f0"; targetCtx.beginPath(); targetCtx.arc(0, -size/3, size/2.5, 0, Math.PI*2); targetCtx.fill();
    targetCtx.fillStyle = "#1e293b"; targetCtx.beginPath(); targetCtx.roundRect(-size/4, -size/2, size/2, size/4, 3); targetCtx.fill();
    targetCtx.restore();
}

function drawMonster(x, y, size) {
    ctx.save(); ctx.translate(x + size/2, y + size/2);
    ctx.fillStyle = "#ef4444"; ctx.beginPath(); ctx.arc(0, 0, size/2, Math.PI, 0); ctx.fill(); ctx.fillRect(-size/2, 0, size, size/2);
    ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.arc(-size/4, -size/10, size/6, 0, Math.PI*2); ctx.arc(size/4, -size/10, size/6, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#000000"; ctx.beginPath(); ctx.arc(-size/4, -size/10, size/12, 0, Math.PI*2); ctx.arc(size/4, -size/10, size/12, 0, Math.PI*2); ctx.fill();
    ctx.fillStyle = "#ffffff"; ctx.fillRect(-size/4, size/5, size/2, size/10); ctx.restore();
}

function drawTNT(x, y, size) {
    ctx.save(); ctx.translate(x + size/2, y + size/2);
    ctx.fillStyle = "#b91c1c"; ctx.beginPath(); ctx.roundRect(-size/2, -size/2, size, size, 4); ctx.fill();
    ctx.fillStyle = "#fde047"; ctx.fillRect(-size/2, -size/6, size, size/3);
    ctx.fillStyle = "#000000"; ctx.font = "bold 9px Arial"; ctx.textAlign = "center"; ctx.fillText("TNT", 0, 3);
    ctx.strokeStyle = "#f97316"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.quadraticCurveTo(5, -size/2 - 5, 3, -size/2 - 8); ctx.stroke();
    ctx.fillStyle = "#eab308"; ctx.beginPath(); ctx.arc(3, -size/2 - 8, 3, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawPortal(x, y, size) {
    ctx.save(); ctx.translate(x + size/2, y + size/2);
    let pulse = 2 * Math.sin(Date.now() / 100);
    ctx.fillStyle = "rgba(0, 191, 255, 0.2)"; ctx.beginPath(); ctx.arc(0, 0, size/1.5 + pulse, 0, Math.PI*2); ctx.fill();
    ctx.strokeStyle = "#00bfff"; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, size/2, size/3 + pulse/2, Date.now()/200, 0, Math.PI*2); ctx.stroke();
    ctx.fillStyle = "#60a5fa"; ctx.beginPath(); ctx.arc(0, 0, size/4, 0, Math.PI*2); ctx.fill();
    ctx.restore();
}

function drawPowerUp(x, y, type, size) {
    ctx.save(); ctx.translate(x + size/2, y + size/2);
    if (type === "speed") {
        ctx.fillStyle = "#22c55e"; ctx.beginPath(); ctx.moveTo(-size/3, size/3); ctx.lineTo(size/3, size/3); ctx.lineTo(size/3, -size/4); ctx.lineTo(0, -size/4); ctx.closePath(); ctx.fill();
    } else if (type === "shield") {
        ctx.fillStyle = "#3b82f6"; ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.lineTo(size/2, -size/4); ctx.lineTo(size/3, size/4); ctx.quadraticCurveTo(0, size/2, -size/3, size/4); ctx.lineTo(-size/2, -size/4); ctx.closePath(); ctx.fill();
    } else if (type === "diamond") {
        ctx.fillStyle = "#00f0ff"; ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.lineTo(size/2, 0); ctx.lineTo(0, size/2); ctx.lineTo(-size/2, 0); ctx.closePath(); ctx.fill();
        ctx.fillStyle = "#ffffff"; ctx.beginPath(); ctx.moveTo(0, -size/2); ctx.lineTo(size/4, 0); ctx.lineTo(0, size/4); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
}

function updateLobbyPreviews() {
    const c1 = document.getElementById("preview-p1");
    const c2 = document.getElementById("preview-p2");
    if(!c1 || !c2) return;
    drawAstronaut(c1.getContext("2d"), 50, 60, player1.color, 40, true);
    drawAstronaut(c2.getContext("2d"), 50, 60, player2.color, 40, true);
}

function toggleAdminPanel() {
    let name = document.getElementById("username-input").value.trim();
    if (name === "Deniz") {
        let p = document.getElementById("admin-panel"); p.classList.toggle("hidden");
    } else { alert("Bu panele erişim yetkiniz yok! Sadece Yönetici 'Deniz' erişebilir."); }
}

document.getElementById("btn-admin-give-gems").addEventListener("click", () => {
    totalDiamonds += 10000; localStorage.setItem("eo_diamonds", totalDiamonds);
    updateGlobalUI(); alert("🛡️ Yönetici Ayrıcalığı: Hesabınıza 10.000 Elmas Eklendi!");
});

function updateGlobalUI() {
    const menuEl = document.getElementById("menu-diamonds");
    if(menuEl) menuEl.innerText = totalDiamonds;
    const matchGems = document.getElementById("ui-diamonds-match");
    if(matchGems) matchGems.innerText = currentMatchDiamonds;
}

function changeControlMode(mode) {
    controlMode = mode; localStorage.setItem("eo_control_mode", mode);
    const joyZone = document.getElementById("joystick-left");
    const arrowWrapper = document.getElementById("arrow-controls-wrapper");
    const joySettings = document.getElementById("joystick-settings-group");

    if (mode === "arrows") {
        if(joyZone) joyZone.classList.add("hidden");
        if(arrowWrapper) arrowWrapper.classList.remove("hidden");
        if(joySettings) joySettings.classList.add("hidden");
    } else {
        if(joyZone) joyZone.classList.remove("hidden");
        if(arrowWrapper) arrowWrapper.classList.add("hidden");
        if(joySettings) joySettings.classList.remove("hidden");
        changeJoystickPosition(joystickPos);
    }
}

function setArrowKey(key, state) {
    if (arrowKeys.hasOwnProperty(key)) arrowKeys[key] = state;
}

function changeJoystickPosition(pos) {
    joystickPos = pos; localStorage.setItem("eo_joy_pos", pos);
    const joyZone = document.getElementById("joystick-left");
    if (joyZone) {
        if (pos === "right") { joyZone.className = "joystick-zone position-right"; } 
        else { joyZone.className = "joystick-zone position-left"; }
    }
}

function changeSensitivity(val) {
    sensitivity = parseInt(val); localStorage.setItem("eo_sensitivity", sensitivity);
    const display = document.getElementById("sens-value-display"); if(display) display.innerText = val;
    let sensFactor = 0.3 + (sensitivity / 50); player1.speed = player1.baseSpeed * sensFactor;
}

function changeMapZoom(val) {
    mapZoom = parseInt(val); localStorage.setItem("eo_map_zoom", mapZoom);
    const display = document.getElementById("zoom-value-display"); if(display) display.innerText = val + "%";
    const wrapper = document.getElementById("canvas-wrapper");
    if(wrapper) { wrapper.style.transform = `scale(${mapZoom / 100})`; }
}

function createExplosion(x,y) { for(let i=0; i<20; i++) { let a=Math.random()*Math.PI*2; let s=1+Math.random()*3; particles.push({x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, size:2+Math.random()*3, alpha:1, color:Math.random()<0.5?"#f97316":"#eab308"}); } }
function updateAndDrawParticles() { for(let i=particles.length-1; i>=0; i--) { let p=particles[i]; p.x+=p.vx; p.y+=p.vy; p.alpha-=0.02; if(p.alpha<=0){particles.splice(i,1); continue;} ctx.save(); ctx.globalAlpha=p.alpha; ctx.fillStyle=p.color; ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fill(); ctx.restore(); } }

function initOnlineConnection() {
    try {
        if (typeof Peer === "undefined") {
            const myPeerEl = document.getElementById("my-peer-id"); if(myPeerEl) myPeerEl.innerText = "Solo Aktif"; return;
        }
        let randomID = Math.floor(10000 + Math.random() * 90000).toString();
        peer = new Peer(randomID);
        peer.on('open', id => { myID = id; const myPeerEl = document.getElementById("my-peer-id"); if(myPeerEl) myPeerEl.innerText = myID; });
        peer.on('connection', conn => {
            if (peerConn) return; 
            peerConn = conn; isHost = true; isSoloMode = false;
            document.getElementById("lobby-menu").classList.add("hidden");
            document.getElementById("pre-game-lobby").classList.remove("hidden");
            const startLobbyBtn = document.getElementById("btn-lobby-start"); if(startLobbyBtn) startLobbyBtn.classList.remove("hidden");
            document.getElementById("lobby-status").innerText = "Arkadaşın bağlandı! Maçı başlatabilirsin.";
            setupOnlineListenersOnlineSafely();
        });
    } catch (e) {
        const myPeerEl = document.getElementById("my-peer-id"); if(myPeerEl) myPeerEl.innerText = "Solo Aktif";
    }
}

function setupOnlineListeners() {
    if(!peerConn) return;
    peerConn.on('data', data => {
        if (data.type === "lobbyUpdate") {
            player2.color = data.color; player2.username = data.username;
            document.getElementById("lobby-n2").innerText = data.username; updateLobbyPreviews();
        }
        if (data.type === "startGame") {
            map = data.map; finishLine = data.finishLine; monsters = data.monsters; items = data.items; bombs = data.bombs; portals = data.portals; cols = data.cols; rows = data.rows; currentWave = data.currentWave;
            canvas.width = cols * tileSize; canvas.height = rows * tileSize;
            
            if(!player1.x || player1.x < tileSize) { player1.x = 120; player1.y = 120; }
            
            document.getElementById("pre-game-lobby").classList.add("hidden");
            document.getElementById("game-container").classList.remove("hidden");
            gameActive = true; gameLoop();
        }
        if (data.type === "pos") { player2.x = data.x; player2.y = data.y; player2.isDead = data.isDead; player2.color = data.color; }
        if (data.type === "explosion") { createExplosion(data.x, data.y); }
        if (data.type === "exitToMenu") { location.reload(); }
    });
}

function setupListenersOnlineSafely() {
    if(!peerConn) return;
    setupOnlineListeners(); sendLobbySync();
}

function sendLobbySync() {
    if (peerConn && peerConn.open) { peerConn.send({ type: "lobbyUpdate", color: player1.color, username: player1.username }); }
}

function getRequiredXP(lvl) { let b = 1000; for(let i=1; i<lvl; i++) b*=1.35; return Math.floor(b); }
function addXP(amount) {
    playerXP += amount; let req = getRequiredXP(playerLevel);
    while (playerXP >= req) { playerXP -= req; playerLevel++; req = getRequiredXP(playerLevel); }
    localStorage.setItem("eo_level", playerLevel); localStorage.setItem("eo_xp", playerXP); updateProfileUI();
}

function updateProfileUI() {
    const barFill = document.getElementById("ui-tp-bar"); const req = getRequiredXP(playerLevel);
    if(barFill) barFill.style.width = (playerXP / req * 100) + "%";
    const ul = document.getElementById("ui-level"); if(ul) ul.innerText = playerLevel;
    const ml = document.getElementById("menu-level"); if(ml) ml.innerText = playerLevel;
}

function generateRandomMap() {
    cols = Math.min(30 + (currentWave - 1) * 3, 45); 
    rows = Math.min(20 + (currentWave - 1) * 2, 30);
    canvas.width = cols * tileSize; 
    canvas.height = rows * tileSize; 
    map = [];
    for (let r = 0; r < rows; r++) {
        map[r] = [];
        for (let c = 0; c < cols; c++) {
            if (r === 0 || c === 0 || r === rows - 1 || c === cols - 1) map[r][c] = 1;
            else map[r][c] = Math.random() < Math.max(0.18 - (currentWave*0.01), 0.12) ? 1 : 0;
        }
    }
}

function spawnPlayers() {
    let rx, ry; do { rx = Math.floor(Math.random()*(cols-2))+1; ry = Math.floor(Math.random()*(rows-2))+1; } while(map[ry][rx]===1);
    player1.x = rx * tileSize + 8; player1.y = ry * tileSize + 8; map[ry][rx] = 0;
    if(isSoloMode) player2.isDead = true;
}

function spawnFinishLineRandomly() {
    let rx, ry; 
    do { 
        rx = Math.floor(Math.random() * (cols - 2)) + 1; 
        ry = Math.floor(Math.random() * (rows - 2)) + 1; 
    } while (map[ry][rx] === 1);
    
    finishLine.x = rx * tileSize + 5; 
    finishLine.y = ry * tileSize + 5; 
    finishLine.size = 30; 
    map[ry][rx] = 0;
}

function spawnPortals() {
    portals = [];
    for (let i = 0; i < 2; i++) {
        let rx, ry; do { rx = Math.floor(Math.random()*(cols-2))+1; ry = Math.floor(Math.random()*(rows-2))+1; } while(map[ry][rx]===1 || (rx*tileSize+5 === finishLine.x));
        portals.push({ x: rx*tileSize+8, y: ry*tileSize+8, size:24 });
    }
}

function spawnMonsters() {
    monsters = [];
    for (let i = 0; i < currentWave; i++) {
        let rx, ry; do { rx = Math.floor(Math.random()*(cols-2))+1; ry = Math.floor(Math.random()*(rows-2))+1; } while(map[ry][rx]===1);
        monsters.push({ x: rx*tileSize+8, y: ry*tileSize+8, size:24, speed: 1.5 + (Math.random()*0.3), offsetX: (i%3-1)*15, offsetY: (Math.floor(i/3)-1)*15 });
    }
}

function spawnItems() {
    items = []; let count = 3 + Math.floor(currentWave / 2);
    for (let i = 0; i < count; i++) {
        let rx, ry; do { rx = Math.floor(Math.random()*(cols-2))+1; ry = Math.floor(Math.random()*(rows-2))+1; } while(map[ry][rx]===1);
        let rand = Math.random(); let type = rand < 0.4 ? "speed" : (rand < 0.7 ? "shield" : "diamond");
        items.push({ x: rx*tileSize+10, y: ry*tileSize+10, size:20, type: type });
    }
}

function spawnBombs() {
    bombs = []; let bombCount = 3 + currentWave;
    for (let i = 0; i < bombCount; i++) {
        let rx, ry; do { rx = Math.floor(Math.random()*(cols-2))+1; ry = Math.floor(Math.random()*(rows-2))+1; } while(map[ry][rx]===1);
        bombs.push({ x: rx*tileSize+8, y: ry*tileSize+8, size:24 });
    }
}

window.addEventListener("keydown", e => { keys[e.key] = true; setArrowKey(e.key, true); }); 
window.addEventListener("keyup", e => { keys[e.key] = false; setArrowKey(e.key, false); });

function checkWallCollision(x,y,s) {
    let l=Math.floor(x/tileSize); let r=Math.floor((x+s)/tileSize); let t=Math.floor(y/tileSize); let b=Math.floor((y+s)/tileSize);
    if(l<0||r>=cols||t<0||b>=rows) return true; if(map[t]&&(map[t][l]===1||map[t][r]===1)) return true; if(map[b]&&(map[b][l]===1||map[b][r]===1)) return true; return false;
}

function getNextStepBFS(sx, sy, tx, ty) {
    if(sx===tx && sy===ty) return {x:sx, y:sy}; let q = [[sx,sy]]; let v = Array.from({length:rows},()=>Array(cols).fill(false));
    let p = {}; v[sy][sx] = true; const dirs = [{dx:0,dy:-1},{dx:0,dy:1},{dx:-1,dy:0},{dx:1,dy:0}]; let f = false;
    while(q.length>0) {
        let [cx,cy] = q.shift(); if(cx===tx && cy===ty) { f=true; break; }
        for(let d of dirs) {
            let nx=cx+d.dx; let ny=cy+d.dy; if(nx>=0&&nx<cols&&ny>=0&&ny<rows) { if (!v[ny][nx] && map[ny][nx] === 0) { v[ny][nx] = true; p[`${nx},${ny}`] = { x: cx, y: cy }; q.push([nx, ny]); } }
        }
    }
    if(!f) return null; let curr = {x:tx, y:ty}; let path = []; while(curr&&(curr.x!==sx || curr.y!==sy)) { path.push(curr); curr=p[`${curr.x},${curr.y}`]; }
    return path.length > 0 ? path[path.length-1] : {x:sx,y:sy};
}

function updateGameElements() {
    if (gameActive && !player1.isDead) {
        let liveTime = Math.floor((Date.now() - matchStartTime) / 1000);
        const uiTimerEl = document.getElementById("ui-timer");
        if (uiTimerEl) uiTimerEl.innerText = liveTime + "s";
    }

    if (portalCooldown > 0) portalCooldown--;

    if (!player1.isDead) {
        let nextX = player1.x; let nextY = player1.y;
        
        if (keys["w"] || keys["ArrowUp"] || arrowKeys["ArrowUp"]) nextY -= player1.speed;
        if (keys["s"] || keys["ArrowDown"] || arrowKeys["ArrowDown"]) nextY += player1.speed;
        if (keys["a"] || keys["ArrowLeft"] || arrowKeys["ArrowLeft"]) nextX -= player1.speed;
        if (keys["d"] || keys["ArrowRight"] || arrowKeys["ArrowRight"]) nextX += player1.speed;

        if (controlMode === "joystick") {
            if (Math.abs(joyLeftY) > 0.1) nextY += joyLeftY * player1.speed;
            if (Math.abs(joyLeftX) > 0.1) nextX += joyLeftX * player1.speed;
        }

        if (!checkWallCollision(nextX, player1.y, player1.size)) player1.x = nextX;
        if (!checkWallCollision(player1.x, nextY, player1.size)) player1.y = nextY;

        if (peerConn && peerConn.open) peerConn.send({ type: "pos", x: player1.x, y: player1.y, isDead: player1.isDead, color: player1.color });

        if (player1.hasSpeedBoost || player1.hasShield) {
            player1.effectTimer--;
            if (player1.effectTimer <= 0) { 
                player1.hasSpeedBoost = false; player1.hasShield = false; 
                document.getElementById("ui-effect").innerText = "Yok";
                changeSensitivity(sensitivity); 
            }
        }

        if (portalCooldown === 0 && portals.length === 2) {
            if (Math.hypot(player1.x - portals[0].x, player1.y - portals[0].y) < player1.size) {
                player1.x = portals[1].x; player1.y = portals[1].y; portalCooldown = 90; 
            } else if (Math.hypot(player1.x - portals[1].x, player1.y - portals[1].y) < player1.size) {
                player1.x = portals[0].x; player1.y = portals[0].y; portalCooldown = 90;
            }
        }

        items.forEach((item, index) => {
            if (Math.hypot(player1.x - item.x, player1.y - item.y) < player1.size) {
                if (item.type === "speed") { player1.hasSpeedBoost = true; player1.speed = player1.speed * 1.5; player1.effectTimer = 300; document.getElementById("ui-effect").innerText = "HIZ"; } 
                else if (item.type === "shield") { player1.hasShield = true; player1.effectTimer = 600; document.getElementById("ui-effect").innerText = "KALKAN"; }
                else if (item.type === "diamond") { currentMatchDiamonds += 1; updateGlobalUI(); }
                items.splice(index, 1);
            }
        });

        bombs.forEach((bomb) => {
            if (Math.hypot(player1.x - bomb.x, player1.y - bomb.y) < player1.size) {
                createExplosion(bomb.x + bomb.size/2, bomb.y + bomb.size/2);
                if (peerConn && peerConn.open) { peerConn.send({ type: "explosion", x: bomb.x + bomb.size/2, y: bomb.y + bomb.size/2 }); }

                if (player1.hasShield) {
                    player1.hasShield = false; player1.effectTimer = 0; document.getElementById("ui-effect").innerText = "Yok";
                    bombs = bombs.filter(b => b !== bomb);
                    changeSensitivity(sensitivity);
                } else { player1.isDead = true; deathReason = "TNT patlamasında havaya uçtun! 💥"; if (!isSoloMode || player2.isDead) endGame(false); }
            }
        });

        if (finishLine && Math.hypot((player1.x+player1.size/2) - (finishLine.x+finishLine.size/2), (player1.y+player1.size/2) - (finishLine.y+finishLine.size/2)) < player1.size) endGame(true);
    }

    let shouldUpdateMonsters = isSoloMode || (peerConn && myID < peerConn.peer);
    if (shouldUpdateMonsters && monsters.length > 0) {
        monsters.forEach((m) => {
            let target = !player1.isDead ? player1 : (!isSoloMode && !player2.isDead ? player2 : null);
            if (target && !player1.isDead && !isSoloMode && !player2.isDead) {
                if (Math.hypot(player2.x - m.x, player2.y - m.y) < Math.hypot(player1.x - m.x, Math.hypot(player1.y - m.y))) target = player2;
            }
            if (!target) return;
            let mgX = Math.floor((m.x+m.size/2)/tileSize); let mgY = Math.floor((m.y+m.size/2)/tileSize);
            let tgX = Math.max(1, Math.min(cols-2, Math.floor((target.x+m.offsetX)/tileSize)));
            let tgY = Math.max(1, Math.min(rows-2, Math.floor((target.y+m.offsetY)/tileSize)));
            let next = getNextStepBFS(mgX, mgY, tgX, tgY);
            if (next) {
                let twX = next.x * tileSize + 8; let twY = next.y * tileSize + 8;
                if (m.x < twX) m.x += m.speed; if (m.x > twX) m.x -= m.speed;
                if (m.y < twY) m.y += m.speed; if (m.y > twY) m.y -= m.speed;
            }
        });
    }

    monsters.forEach(m => {
        if (!player1.isDead && Math.hypot(player1.x - m.x, player1.y - m.y) < player1.size) {
            if (player1.hasShield) { player1.hasShield = false; player1.effectTimer = 0; m.x -= 60; changeSensitivity(sensitivity); } 
            else { player1.isDead = true; deathReason = "Kızgın canavara yem oldun! 👾"; }
        }
    });

    if (player1.isDead && (isSoloMode || player2.isDead)) endGame(false);
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#05070a"; ctx.fillRect(0, 0, canvas.width, canvas.height);
    for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) if (map[r] && map[r][c] === 1) { ctx.fillStyle = "#1e293b"; ctx.fillRect(c*tileSize, r*tileSize, tileSize, tileSize); }
    portals.forEach(p => drawPortal(p.x, p.y, p.size));
    items.forEach(item => drawPowerUp(item.x, item.y, item.type, item.size));
    bombs.forEach(bomb => drawTNT(bomb.x, bomb.y, bomb.size));
    if(finishLine && finishLine.size) { ctx.fillStyle = "#ffd700"; ctx.fillRect(finishLine.x, finishLine.y, finishLine.size, finishLine.size); }
    if (!player1.isDead) drawAstronaut(ctx, player1.x, player1.y, player1.color, player1.size);
    if (!isSoloMode && !player2.isDead) drawAstronaut(ctx, player2.x, player2.y, player2.color, player2.size);
    monsters.forEach(m => drawMonster(m.x, m.y, m.size)); updateAndDrawParticles();
}

let keys = {}; 

function gameLoop() { if (!gameActive) return; updateGameElements(); draw(); animationFrameId = requestAnimationFrame(gameLoop); }

function updateGlobalUI() {
    const menuEl = document.getElementById("menu-diamonds");
    if(menuEl) menuEl.innerText = totalDiamonds;
    const matchGems = document.getElementById("ui-diamonds-match");
    if(matchGems) matchGems.innerText = currentMatchDiamonds;
}

function endGame(isWin) {
    matchSurvivalTime = Math.max(0, Math.floor((Date.now() - matchStartTime) / 1000));
    gameActive = false; cancelAnimationFrame(animationFrameId);

    const statTimeEl = document.getElementById("stat-time");
    const statDiamondsEl = document.getElementById("stat-diamonds");
    const uiTimerEl = document.getElementById("ui-timer");

    if (statTimeEl) statTimeEl.innerText = matchSurvivalTime + "s";
    if (statDiamondsEl) statDiamondsEl.innerText = currentMatchDiamonds;
    if (uiTimerEl) uiTimerEl.innerText = matchSurvivalTime + "s"; 

    const screen = document.getElementById("game-over-screen"); 
    const title = document.getElementById("game-over-title"); 
    const msg = document.getElementById("game-over-msg");
    const xpText = document.getElementById("xp-gain-text");
    const btnRevive = document.getElementById("btn-revive");

    if(screen) screen.classList.remove("hidden");

    if (isWin) {
        title.innerText = "MAÇI KAZANDINIZ!"; title.style.color = "#00ffcc";
        let waveBonusGems = 5 + (currentWave * 2);
        let totalGained = waveBonusGems + currentMatchDiamonds;
        totalDiamonds += totalGained; localStorage.setItem("eo_diamonds", totalDiamonds);

        let earnedXP = currentWave * 150; addXP(earnedXP);
        msg.innerText = "Sarı kapıdan kaçmayı başardın! 🚀"; 
        xpText.innerHTML = `+${earnedXP} TP Kazandınız!<br>💎 +${totalGained} Kalıcı Elmas Hesaba Geçti!`;
        currentWave++; btnRevive.style.display = "none";
    } else {
        title.innerText = "ELENDİNİZ!"; title.style.color = "#ff007f";
        msg.innerText = deathReason; 
        xpText.innerHTML = `Mevcut Dalga: ${currentWave}<br>Yerden kapılan elmaslar kurtarılamadı.`;
        
        if (totalDiamonds >= 10) {
            btnRevive.style.display = "block"; btnRevive.innerText = `💎 10 Elmas Harca ve Diril (Kalan: ${totalDiamonds})`;
        } else { btnRevive.style.display = "none"; }
        currentWave = 1;
    }
    updateGlobalUI();
}

document.getElementById("btn-revive").addEventListener("click", () => {
    if (totalDiamonds >= 10) {
        totalDiamonds -= 10; localStorage.setItem("eo_diamonds", totalDiamonds);
        player1.isDead = false; player1.hasShield = true; player1.effectTimer = 180; 
        monsters.forEach(m => { m.x -= 100; m.y -= 100; });
        document.getElementById("game-over-screen").classList.add("hidden");
        updateGlobalUI(); document.getElementById("ui-effect").innerText = "KALKAN";
        matchStartTime = Date.now(); 
        gameActive = true; gameLoop(); 
    }
});

function exitToLobbyMenu() {
    gameActive = false; cancelAnimationFrame(animationFrameId); particles = []; currentMatchDiamonds = 0;
    document.getElementById("game-container").classList.add("hidden"); document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("lobby-menu").classList.remove("hidden"); updateGlobalUI();
}

document.getElementById("btn-start-solo").addEventListener("click", () => {
    isSoloMode = true; player1.color = document.getElementById("color-picker").value;
    player1.username = document.getElementById("username-input").value.trim() || "Player 1";
    const uiUser = document.getElementById("ui-username");
    if(uiUser) uiUser.innerText = player1.username;
    startNewMatch();
});

const lobbyStartBtn = document.getElementById("btn-lobby-start");
if(lobbyStartBtn) {
    lobbyStartBtn.addEventListener("click", () => {
        if (!isHost) return;
        generateRandomMap(); spawnPlayers(); spawnFinishLineRandomly(); spawnPortals(); spawnMonsters(); spawnItems(); spawnBombs();
        if(peerConn && peerConn.open) { peerConn.send({ type: "startGame", map, finishLine, monsters, items, bombs, portals, currentWave, cols, rows }); }
        document.getElementById("pre-game-lobby").classList.add("hidden"); document.getElementById("game-container").classList.remove("hidden");
        gameActive = true; gameLoop();
    });
}

document.getElementById("btn-connect-online").addEventListener("click", () => {
    let friendID = document.getElementById("friend-peer-input").value.trim();
    if (friendID.length > 0) {
        player1.color = document.getElementById("color-picker").value; isSoloMode = false; isHost = false;
        player1.username = document.getElementById("username-input").value.trim() || "Player 1";
        const uiUser = document.getElementById("ui-username");
        if(uiUser) uiUser.innerText = player1.username;
        if(peer) {
            peerConn = peer.connect(friendID);
            peerConn.on('open', () => {
                document.getElementById("lobby-menu").classList.add("hidden"); document.getElementById("pre-game-lobby").classList.remove("hidden");
                const badge = document.querySelector(".host-badge"); if(badge) badge.classList.add("hidden");
                document.getElementById("lobby-status").innerText = "Lobi sahibinin başlatması bekleniyor...";
                setupListenersOnlineSafely(); 
            });
        }
    }
});

function setupListenersOnlineSafely() {
    if(!peerConn) return;
    setupOnlineListeners(); sendLobbySync();
}

document.getElementById("btn-game-exit").addEventListener("click", () => { if (peerConn && peerConn.open) peerConn.send({ type: "exitToMenu" }); exitToLobbyMenu(); });
document.getElementById("btn-next-game").addEventListener("click", () => { document.getElementById("game-over-screen").classList.add("hidden"); startNewMatch(); });
document.getElementById("btn-go-menu").addEventListener("click", exitToLobbyMenu);

document.getElementById("btn-fullscreen").addEventListener("click", () => {
    const docEl = document.documentElement;
    if (!document.fullscreenElement) {
        if (docEl.requestFullscreen) docEl.requestFullscreen();
        else if (docEl.webkitRequestFullscreen) docEl.webkitRequestFullscreen();
        document.getElementById("btn-fullscreen").innerText = "🔄 Tam Ekrandan Çık";
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        document.getElementById("btn-fullscreen").innerText = "📱 Tam Ekran Modu";
    }
});

function startNewMatch() {
    document.getElementById("game-over-screen").classList.add("hidden");
    document.getElementById("game-container").classList.remove("hidden");
    player1.isDead = false; player1.hasShield = false; player1.hasSpeedBoost = false; player2.isDead = false; particles = []; currentMatchDiamonds = 0;
    if('ontouchstart' in window || navigator.maxTouchPoints > 0) { document.getElementById("mobile-controls").style.display = "flex"; }
    generateRandomMap(); spawnPlayers(); spawnFinishLineRandomly(); spawnPortals(); spawnMonsters(); spawnItems(); spawnBombs();
    const uiWave = document.getElementById("ui-wave"); if(uiWave) uiWave.innerText = currentWave;
    document.getElementById("lobby-menu").classList.add("hidden");
    
    changeControlMode(controlMode);
    const ctrlSelect = document.getElementById("control-mode-select"); if(ctrlSelect) ctrlSelect.value = controlMode;

    changeJoystickPosition(joystickPos);
    const selectEl = document.getElementById("joystick-pos-select"); if(selectEl) selectEl.value = joystickPos;
    
    changeSensitivity(sensitivity);
    const sliderEl = document.getElementById("sensitivity-slider"); if(sliderEl) sliderEl.value = sensitivity;

    changeMapZoom(mapZoom);
    const zoomSliderEl = document.getElementById("zoom-slider"); if(zoomSliderEl) zoomSliderEl.value = mapZoom;

    updateProfileUI(); updateGlobalUI(); gameActive = true;
    matchStartTime = Date.now(); 
    gameLoop();
}

function setupJoystick(zoneId, stickId, callback) {
    const zone = document.getElementById(zoneId); const stick = document.getElementById(stickId); if (!zone || !stick) return;
    function moveStick(e) {
        e.preventDefault(); let touch = e.touches[0]; let rect = zone.getBoundingClientRect();
        let cx = rect.left + rect.width / 2; let cy = rect.top + rect.height / 2;
        let dx = touch.clientX - cx; let dy = touch.clientY - cy; let dist = Math.hypot(dx, dy); let maxDist = 33;
        if (dist > maxDist) { dx = (dx / dist) * maxDist; dy = (dy / dist) * maxDist; }
        stick.style.left = (33 + dx) + "px"; stick.style.top = (33 + dy) + "px"; callback(dx / maxDist, dy / maxDist);
    }
    zone.addEventListener("touchstart", moveStick, { passive: false });
    zone.addEventListener("touchmove", moveStick, { passive: false });
    zone.addEventListener("touchend", () => { callback(0, 0); stick.style.left = "33px"; stick.style.top = "33px"; });
}
setupJoystick("joystick-left", "stick-left", (x, y) => { joyLeftX = x; joyLeftY = y; });

function setupSlidersTouchEngine() {
    const sensitivitySlider = document.getElementById("sensitivity-slider");
    const zoomSlider = document.getElementById("zoom-slider");

    function bindSlider(slider, isZoom = false) {
        if (!slider) return;
        
        function updateValue(val) {
            slider.value = val;
            if (isZoom) { changeMapZoom(val); } 
            else { changeSensitivity(val); }
        }

        slider.addEventListener("input", (e) => {
            updateValue(e.target.value);
        });

        function handleSliderTouch(e) {
            e.stopPropagation(); 
            let touch = e.touches[0];
            let rect = slider.getBoundingClientRect();
            let percentage = (touch.clientX - rect.left) / rect.width;
            percentage = Math.max(0, Math.min(1, percentage));
            
            let minVal = parseInt(slider.min);
            let maxVal = parseInt(slider.max);
            let targetValue = Math.round(minVal + percentage * (maxVal - minVal));
            
            updateValue(targetValue);
        }
        
        slider.addEventListener("touchstart", handleSliderTouch, { passive: true });
        slider.addEventListener("touchmove", handleSliderTouch, { passive: true });
    }

    bindSlider(sensitivitySlider, false);
    bindSlider(zoomSlider, true);
}

initOnlineConnection(); updateLobbyPreviews(); updateProfileUI(); updateGlobalUI();
setupSlidersTouchEngine();