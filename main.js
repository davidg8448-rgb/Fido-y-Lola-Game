// main.js - Fido y Lola van de marcha (mejorado: dificultad progresiva + flash neón nivel + adaptabilidad)
const API_BASE = "https://fidoylola-1.onrender.com/api/scores";
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d', { alpha: false });

// Base canvas
const BASE_W = 360, BASE_H = 640;
function fitCanvasToScreen() {
  const availW = Math.min(window.innerWidth, 1200);
  const availH = Math.min(window.innerHeight, 1200);
  const scale = Math.min(availW / BASE_W, availH / BASE_H);
  canvas.style.width = Math.round(BASE_W * scale) + 'px';
  canvas.style.height = Math.round(BASE_H * scale) + 'px';
  const dpr = Math.max(1, window.devicePixelRatio || 1);
  canvas.width = Math.round(BASE_W * dpr);
  canvas.height = Math.round(BASE_H * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}
window.addEventListener('resize', fitCanvasToScreen);
fitCanvasToScreen();

// Estado del juego
let phase = 'menu', selected = 'fido', score = 0, level = 1, lives = 3, maxLives = 5;
let spawnTimer = 0, bags = [], lifeStripes = [];
let baseSpeed = 1.4; // 🚀 más difícil desde el inicio
const speedIncrease = 0.22; // más progresivo
const maxMusicRate = 2.1;
let audio = {}, audioUnlocked = false;
let levelFlash = 0, levelTextTimer = 0; // efectos visuales
let lastLevel = 1;

// Jugador
let player = { x: BASE_W / 2 - 28, y: BASE_H - 180, w: 56, h: 76 };

// --- AUDIO ---
function loadAudio() {
  const keys = ['music_loop', 'pick', 'hit', 'powerup', 'dj_voice'];
  keys.forEach(k => {
    audio[k] = new Audio('sounds/' + k + '.wav');
    audio[k].preload = 'auto';
    if (k === 'music_loop') { audio[k].loop = true; audio[k].volume = 0.72; }
    else audio[k].volume = 0.9;
  });
}
function unlockAudio() {
  if (audioUnlocked) return;
  audioUnlocked = true;
  try { if (audio.music_loop) audio.music_loop.play().catch(() => {}); } catch (e) {}
}

// --- API TOP 10 ---
async function fetchTop() {
  try { const r = await fetch(API_BASE); const j = await r.json(); return j.scores || []; }
  catch (e) { return []; }
}
async function submitScore(name) {
  try {
    const payload = { name: name.substring(0, 24), score: Math.floor(score), character: selected };
    const r = await fetch(API_BASE, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const j = await r.json();
    return j.scores || [];
  } catch (e) { return null; }
}

// --- DIBUJO ---
function roundRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawBackground(rhythmFactor = 1) {
  ctx.clearRect(0, 0, BASE_W, BASE_H);
  const t = Date.now() / (380 / Math.max(0.6, rhythmFactor));
  for (let i = 0; i < 7; i++) {
    const x = (i * 100 + (t * 90) % 400) - 120;
    const g = ctx.createLinearGradient(x, 0, x + 240, BASE_H);
    g.addColorStop(0, `rgba(${200 + 40 * Math.sin(t + i)}, ${80 + 60 * Math.cos(t + i)}, ${220 + 20 * Math.sin(t / 2 + i)}, 0.07)`);
    g.addColorStop(1, `rgba(40,200,255,0.05)`);
    ctx.fillStyle = g;
    ctx.fillRect(x, 0, 240, BASE_H);
  }

  // Flash al subir de nivel
  if (levelFlash > 0) {
    levelFlash--;
    const intensity = Math.sin(levelFlash / 2) * 0.5 + 0.5;
    ctx.fillStyle = `rgba(${255 * intensity}, ${200 * intensity}, ${255}, 0.4)`;
    ctx.fillRect(0, 0, BASE_W, BASE_H);
  }

  // Vignette
  const vg = ctx.createRadialGradient(BASE_W / 2, BASE_H / 2, 10, BASE_W / 2, BASE_H / 2, Math.max(BASE_W, BASE_H));
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, BASE_W, BASE_H);
}

function drawHUD() {
  for (let i = 0; i < lives; i++) {
    const x = 12 + i * 38;
    ctx.fillStyle = ['#ff8fcf', '#7ad1ff', '#b98cff', '#ffd97a'][i % 4];
    roundRect(x, 8, 32, 30, 6); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(x + 26, 6, 3, 12);
  }
  ctx.fillStyle = '#fff';
  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('Puntuación: ' + Math.floor(score), 12, 56);
  ctx.fillText('Nivel: ' + level, 12, 74);
}

function drawPlayer() {
  const bob = Math.sin(Date.now() / 180) * 4;
  ctx.fillStyle = selected === 'fido' ? '#6b9be6' : '#d76fe9';
  roundRect(player.x, player.y + bob, player.w, player.h, 8);
  ctx.fill();
  ctx.fillStyle = '#f4d8bf';
  ctx.beginPath();
  ctx.arc(player.x + player.w / 2, player.y + 12 + bob, 10, 0, Math.PI * 2);
  ctx.fill();
}

function drawBags() {
  for (const b of bags) {
    ctx.fillStyle = '#ff8fcf';
    roundRect(b.x, b.y, b.w, b.h, 6);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.beginPath(); ctx.moveTo(b.x + 6, b.y + 6); ctx.lineTo(b.x + b.w - 6, b.y + 6); ctx.stroke();
  }
}

function drawLifeStripes() {
  for (const s of lifeStripes) {
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    roundRect(s.x, s.y, s.w, s.h, 6);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(s.x + s.w - 4, s.y - 12, 3, 14);
  }
}

// --- SPAWN ---
function spawnPink() {
  const w = 28 + Math.random() * 36;
  bags.push({
    x: Math.random() * (BASE_W - w - 28) + 14,
    y: -60, w: w, h: w * 0.95,
    vx: (Math.random() - 0.5) * 1.4 * baseSpeed,
    vy: (3.6 + Math.random() * 2.6) * baseSpeed
  });
}
function spawnLifeStripe() {
  const w = 12 + Math.random() * 8;
  lifeStripes.push({
    x: Math.random() * (BASE_W - w - 28) + 14,
    y: -140, w: w, h: 120,
    vy: (3.6 + Math.random() * 1.4) * baseSpeed,
    life: 700
  });
}

// --- UPDATE ---
function update() {
  if (phase !== 'play') return;
  spawnTimer++;

  const spawnInterval = Math.max(24, Math.floor(50 - level * 3)); // más rápido
  if (spawnTimer > spawnInterval) {
    spawnTimer = 0;
    if (Math.random() < 0.16 + level * 0.01) spawnPink();
    if (Math.random() < 0.03 + level * 0.002) spawnLifeStripe();
    if (Math.random() < 0.08 + level * 0.01) spawnPink();
  }

  // Movimiento de bolsas
  for (let i = bags.length - 1; i >= 0; i--) {
    const b = bags[i];
    b.vy += 0.035 * baseSpeed + level * 0.009;
    b.x += b.vx;
    b.y += b.vy;
    if (b.y > BASE_H + 120) { score += Math.max(1, Math.floor(b.w / 10)); bags.splice(i, 1); continue; }
    if (b.x < player.x + player.w && b.x + b.w > player.x && b.y < player.y + player.h && b.y + b.h > player.y) {
      bags.splice(i, 1); lives--;
      try { audio.hit.play(); } catch (e) {}
      if (lives <= 0) { phase = 'gameover'; onGameOver(); return; }
    }
  }

  // Movimiento de cubatas
  for (let i = lifeStripes.length - 1; i >= 0; i--) {
    const s = lifeStripes[i];
    s.y += s.vy; s.life--;
    if (s.y > BASE_H + 120 || s.life <= 0) { lifeStripes.splice(i, 1); continue; }
    if (s.x < player.x + player.w && s.x + s.w > player.x && s.y < player.y + player.h && s.y + s.h > player.y) {
      lifeStripes.splice(i, 1);
      if (lives < maxLives) { lives++; try { audio.powerup.play(); } catch (e) {} }
    }
  }

  // Subida de nivel con efecto
  if (score > level * 300) {
    level++;
    baseSpeed += speedIncrease;
    levelFlash = 60; levelTextTimer = 80;
    try { audio.powerup.play(); } catch (e) {}
    try {
      if (audio.music_loop)
        audio.music_loop.playbackRate = Math.min(maxMusicRate, (audio.music_loop.playbackRate || 1) + 0.07);
    } catch (e) {}
  }
}

// --- GAME OVER ---
async function onGameOver() {
  const top = await fetchTop();
  const enters = (!top || top.length < 10) ? true : top.some(e => score > e.score);
  if (enters) {
    const name = prompt('¡Top10! Escribe tu nombre:', 'Jugador');
    if (name) await submitScore(name);
  }
  try {
    if (audio.music_loop) audio.music_loop.pause();
    if (audio.dj_voice) audio.dj_voice.play();
  } catch (e) {}
  showFinalScene();
  phase = 'menu';
}

function showFinalScene() {
  const t0 = performance.now(); const dur = 4200;
  function anim(now) {
    const dt = now - t0, alpha = Math.min(1, dt / dur);
    ctx.clearRect(0, 0, BASE_W, BASE_H);
    drawBackground(1 + level * 0.05);
    ctx.fillStyle = `rgba(0,0,0,${alpha * 0.76})`; ctx.fillRect(0, 0, BASE_W, BASE_H);
    ctx.fillStyle = 'white'; ctx.font = '26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('🪩 FIN DE LA FIESTA 🪩', BASE_W / 2, BASE_H / 2 - 20);
    const walk = Math.min(1, dt / 3200);
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.beginPath(); ctx.ellipse(BASE_W / 2 + walk * 160, BASE_H / 2 + 60, 36, 70, 0, 0, Math.PI * 2); ctx.fill();
    if (dt < dur + 1200) requestAnimationFrame(anim);
    else try { if (audio.music_loop) audio.music_loop.playbackRate = 1.0; } catch (e) {}
  }
  requestAnimationFrame(anim);
}

// --- RENDER ---
async function render() {
  drawBackground(Math.min(1.5, 1 + (level - 1) * 0.05));
  if (phase === 'menu') {
    drawTextCentered('🎶 Fido y Lola van de marcha 🎶', 56, 20);
    drawTextCentered('Toca para PLAY', BASE_H - 48, 14);
    fetchTop().then(top => {
      ctx.font = '11px monospace';
      for (let i = 0; i < 5; i++) {
        const e = top[i];
        ctx.fillStyle = e ? 'white' : 'rgba(255,255,255,0.18)';
        const text = e ? `${i + 1}. ${e.name} — ${e.score}` : `${i + 1}. ---`;
        ctx.fillText(text, BASE_W / 2, 100 + i * 26);
      }
    }).catch(() => {});
  } else if (phase === 'play') {
    drawLifeStripes(); drawBags(); drawPlayer(); drawHUD();
    if (levelTextTimer > 0) {
      levelTextTimer--;
      ctx.font = 'bold 30px sans-serif'; ctx.fillStyle = `rgba(255,255,255,${levelTextTimer / 80})`;
      ctx.textAlign = 'center';
      ctx.fillText(`¡Nivel ${level}!`, BASE_W / 2, BASE_H / 2);
    }
  }
}
function drawTextCentered(text, y, size = 18) {
  ctx.fillStyle = '#fff'; ctx.font = `${size}px sans-serif`;
  ctx.textAlign = 'center'; ctx.fillText(text, BASE_W / 2, y);
}

// --- INPUT ---
let touchStartX = 0;
canvas.addEventListener('touchstart', e => {
  e.preventDefault();
  unlockAudio();
  const t = e.touches[0]; const rect = canvas.getBoundingClientRect();
  const x = (t.clientX - rect.left) * (canvas.width / rect.width);
  if (phase === 'menu') { phase = 'select'; return; }
  if (phase === 'select') { selected = (x < BASE_W / 2) ? 'fido' : 'lola'; phase = 'play'; resetGame(); try { audio.music_loop.play(); } catch (e) {} return; }
  if (phase === 'play') {
    if (x < BASE_W / 2) player.x -= 48; else player.x += 48;
    if (player.x < 0) player.x = 0; if (player.x + player.w > BASE_W) player.x = BASE_W - player.w;
  }
  touchStartX = t.clientX;
});
canvas.addEventListener('touchend', e => {
  const dx = e.changedTouches[0].clientX - touchStartX;
  if (phase === 'play') {
    if (dx > 40) player.x += 60; else if (dx < -40) player.x -= 60;
    if (player.x < 0) player.x = 0; if (player.x + player.w > BASE_W) player.x = BASE_W - player.w;
  }
});
window.addEventListener('keydown', e => {
  if (phase === 'menu' && (e.key === 'Enter' || e.key === ' ')) phase = 'select';
  if (phase === 'select' && (e.key === 'Enter' || e.key === ' ')) { phase = 'play'; resetGame(); }
  if (phase === 'play') {
    if (e.key === 'ArrowLeft' || e.key === 'a') player.x -= 48;
    if (e.key === 'ArrowRight' || e.key === 'd') player.x += 48;
    if (player.x < 0) player.x = 0; if (player.x + player.w > BASE_W) player.x = BASE_W - player.w;
  }
});

// --- RESET ---
function resetGame() {
  score = 0; level = 1; lives = 3; bags = []; lifeStripes = []; spawnTimer = 0;
  baseSpeed = 1.4; levelFlash = 0; levelTextTimer = 0;
  player.x = BASE_W / 2 - player.w / 2;
  try { if (audio.music_loop) audio.music_loop.playbackRate = 1.0; } catch (e) {}
}

//
