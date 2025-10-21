// Fido y Lola - Canvas standalone (ES) - connects to Render Top10
const API_BASE = "https://fidoylola-1.onrender.com/api/scores";
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;
let phase = 'menu'; // menu, select, play, gameover
let selected = 'fido';
let score = 0, level = 1, lives = 3, maxLives = 5;
let spawnTimer = 0;
let bags = [], lifeStripes = [];
let audio = {};

// simple player representation
let player = { x: W/2 - 28, y: H-180, w:56, h:76 };

function loadAudio(){ ['music','pick','hit','powerup','dj_voice'].forEach(k=>{ audio[k]=new Audio('sounds/'+k+'.wav'); if(k==='music'){ audio[k].loop=true; audio[k].volume=0.6; }}); }

async function fetchTop(){ try{ const r = await fetch(API_BASE); const j = await r.json(); return j.scores || []; }catch(e){ return []; } }
async function submitScore(name){ try{ const payload={name:name.substring(0,24),score:Math.floor(score),character:selected}; await fetch(API_BASE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}); }catch(e){} }

function drawMenu(){ ctx.clearRect(0,0,W,H); let t = Date.now()/500; for(let i=0;i<6;i++){ ctx.fillStyle = `rgba(${Math.floor(200+50*Math.sin(t+i))},${Math.floor(80+80*Math.cos(t+i))},${Math.floor(220+30*Math.sin(t/2+i))},0.06)`; ctx.fillRect((i*80 + (t*40)%200)-40,20,220,260); } ctx.fillStyle='#fff'; ctx.font='20px sans-serif'; ctx.textAlign='center'; ctx.fillText('🎶 Fido y Lola Game 🎶', W/2, 56); ctx.fillStyle='rgba(255,255,255,0.9)'; ctx.font='12px sans-serif'; ctx.fillText('Toca para PLAY', W/2, H-48); }

function drawSelect(){ ctx.clearRect(0,0,W,H); ctx.fillStyle='#fff'; ctx.font='18px sans-serif'; ctx.textAlign='center'; ctx.fillText('Selecciona personaje',W/2,48); ctx.fillText('Toca IZQ = Fido  |  DER = Lola',W/2,120); }

function drawHUD(){ for(let i=0;i<lives;i++){ const x = 12 + i*38; ctx.fillStyle = ['#ff8fcf','#7ad1ff','#b98cff','#ffd97a'][i%4]; roundRect(ctx, x, 8, 32, 30, 6); ctx.fill(); ctx.fillStyle='#fff'; ctx.fillRect(x+26,6,4,12); } ctx.fillStyle='#fff'; ctx.font='12px monospace'; ctx.fillText('Puntuación:'+Math.floor(score),10,56); }

function roundRect(ctx,x,y,w,h,r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }

function drawGame(){ ctx.clearRect(0,0,W,H); let t = Date.now()/400; for(let i=0;i<5;i++){ const g = ctx.createLinearGradient(0, (i*80 + (t*30)%200)-80, W, (i*80 + (t*30)%200)+80); g.addColorStop(0,'rgba(255,90,200,0.06)'); g.addColorStop(0.5,'rgba(120,90,255,0.06)'); g.addColorStop(1,'rgba(40,200,255,0.04)'); ctx.fillStyle = g; ctx.fillRect(0, (i*120 + (t*20)%300)-120, W, 200); } for(let s of lifeStripes){ ctx.fillStyle='rgba(255,255,255,0.95)'; roundRect(ctx,s.x,s.y,s.w,s.h,4); ctx.fill(); } for(let b of bags){ ctx.fillStyle='#ff8fcf'; roundRect(ctx,b.x,b.y,b.w,b.h,6); ctx.fill(); } ctx.fillStyle = (selected==='fido')? '#6b9be6':'#d76fe9'; roundRect(ctx, player.x, player.y, player.w, player.h, 8); ctx.fill(); ctx.fillStyle='#f4d8bf'; ctx.beginPath(); ctx.arc(player.x+player.w/2, player.y+12, 10, 0, Math.PI*2); ctx.fill(); drawHUD(); }

function spawnPink(){ const w = 30 + Math.random()*30; bags.push({ x: Math.random()*(W-w-28)+14, y:-80, w:w, h:w*0.9, vx:(Math.random()-0.5)*0.8, vy:2+Math.random()*1.5 }); }
function spawnLifeStripe(){ const w = 10 + Math.random()*6; lifeStripes.push({ x: Math.random()*(W-w-28)+14, y:-140, w: w, h: 120, vy: 2.2 + Math.random()*0.6, life:800 }); }

function update(){ if(phase!=='play') return; spawnTimer++; if(spawnTimer>60){ spawnTimer=0; if(Math.random()<0.12+level*0.01) spawnPink(); if(Math.random()<0.03) spawnLifeStripe(); } for(let i=bags.length-1;i>=0;i--){ const b = bags[i]; b.vy += 0.02 + level*0.006; b.x += b.vx; b.y += b.vy; if(b.y > H+120){ score += Math.max(1, Math.floor(b.w/10)); bags.splice(i,1); } if(b.x < player.x+player.w && b.x+b.w > player.x && b.y < player.y+player.h && b.y+b.h > player.y){ bags.splice(i,1); lives--; try{ audio.hit.play(); }catch(e){} if(lives<=0){ phase='gameover'; onGameOver(); } } } for(let i=lifeStripes.length-1;i>=0;i--){ const s = lifeStripes[i]; s.y += s.vy; s.life--; if(s.y > H+120 || s.life<=0){ lifeStripes.splice(i,1); continue; } if(s.x < player.x+player.w && s.x+s.w > player.x && s.y < player.y+player.h && s.y+s.h > player.y){ lifeStripes.splice(i,1); if(lives < maxLives){ lives++; try{ audio.powerup.play(); }catch(e){} } } } if(score > level*300) level = Math.floor(score/300)+1; }

async function onGameOver(){ const top = await fetchTop(); const enters = (!top || top.length<10) ? true : top.some(e=>score>e.score); if(enters){ const name = prompt('¡Top10! Escribe tu nombre:','Jugador'); if(name) await submitScore(name); } try{ audio.music.pause(); audio.dj_voice.play(); }catch(e){} showFinalScene(); phase='menu'; }

function showFinalScene(){ let t0 = performance.now(); const dur = 4200; function anim(now){ const dt = now - t0; const alpha = Math.min(1, dt/dur); ctx.clearRect(0,0,W,H); ctx.fillStyle = `rgba(0,0,0,${alpha*0.85})`; ctx.fillRect(0,0,W,H); const grd = ctx.createLinearGradient(W*0.6, H*0.6, W*0.9, H*0.1); grd.addColorStop(0, `rgba(255,190,100,${alpha*0.7})`); grd.addColorStop(1, `rgba(255,220,140,${alpha*0.0})`); ctx.fillStyle = grd; ctx.fillRect(0,0,W,H); ctx.fillStyle='white'; ctx.font='28px sans-serif'; ctx.textAlign='center'; ctx.fillText('🪩 FIN DE LA FIESTA 🪩', W/2, H/2-20); const walk = Math.min(1, dt/3000); ctx.fillStyle = 'rgba(0,0,0,0.9)'; ctx.beginPath(); ctx.ellipse(W/2 + walk*120, H/2+40, 40,80,0,0,Math.PI*2); ctx.fill(); if(dt < dur+1200) requestAnimationFrame(anim); else { fetchTop(); } } requestAnimationFrame(anim); }

// input handling & touch
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); const t = e.touches[0]; const rect = canvas.getBoundingClientRect(); const x = (t.clientX-rect.left)*(canvas.width/rect.width); if(phase==='menu'){ phase='select'; return; } if(phase==='select'){ if(x < W/2) selected='fido'; else selected='lola'; phase='play'; score=0; lives=3; bags=[]; lifeStripes=[]; loadAudio(); try{ audio.music.play(); }catch(e){} return; } if(phase==='play'){ if(x < W/2) player.x -= 40; else player.x += 40; if(player.x < 0) player.x = 0; if(player.x+player.w > W) player.x = W - player.w; } });
let touchStartX = 0;
canvas.addEventListener('touchstart', e=>{ touchStartX = e.touches[0].clientX; });
canvas.addEventListener('touchend', e=>{ const dx = e.changedTouches[0].clientX - touchStartX; if(phase==='play'){ if(dx>30) player.x += 50; else if(dx<-30) player.x -=50; if(player.x<0) player.x=0; if(player.x+player.w>W) player.x=W-player.w; } });

loadAudio();
function loop(){ update(); if(phase==='menu') drawMenu(); else if(phase==='select') drawSelect(); else if(phase==='play') drawGame(); requestAnimationFrame(loop); }
loop();
