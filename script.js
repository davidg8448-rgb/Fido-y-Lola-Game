// Cliente Fido y Lola (español) - versión ligera para despliegue
const API_BASE = "https://fidoylola-1.onrender.com/api/scores";
const c=document.getElementById('gameCanvas'),ctx=c.getContext('2d');const W=c.width,H=c.height;let phase='menu',top10=[],selected='fido';let score=0,level=1,lives=3,maxLives=5;let player={w:56,h:76,x:W/2-28,y:H-180};let bags=[],streaks=[],lifeStripes=[];let audio={};
function loadAudio(){['music','pick','hit','jingle','powerup','dj_voice'].forEach(k=>{audio[k]=new Audio('sounds/'+k+'.wav');if(k==='music'){audio[k].loop=true;audio[k].volume=0.6;}})}
async function fetchTop(){try{const r=await fetch(API_BASE);const j=await r.json();if(j&&j.scores)top10=j.scores;}catch(e){top10=[];}}
async function submitScore(name){try{const payload={name:name.substring(0,24),score:Math.floor(score),character:selected};const r=await fetch(API_BASE,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const j=await r.json();if(j&&j.scores)top10=j.scores;}catch(e){}}
function drawMenu(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='20px sans-serif';ctx.fillText('🎶 Fido y Lola Game 🎶',W/2,48);ctx.font='12px monospace';for(let i=0;i<10;i++){const e=top10[i];ctx.fillStyle=e?'#fff':'rgba(255,255,255,0.18)';ctx.fillText(e?`${i+1}. ${e.name} — ${e.score}`:`${i+1}. ---`,W/2,90+i*30);}ctx.fillStyle='rgba(255,255,255,0.9)';ctx.fillText('Toca para PLAY',W/2,H-40)}
function drawSelect(){ctx.clearRect(0,0,W,H);ctx.fillStyle='#fff';ctx.textAlign='center';ctx.font='18px sans-serif';ctx.fillText('Selecciona personaje',W/2,48);ctx.fillText('Fido (izq) / Lola (der)',W/2,120);ctx.fillText('Toca para empezar',W/2,H-40)}
function drawGame(){ctx.clearRect(0,0,W,H);for(const p of lifeStripes){ctx.fillStyle='rgba(255,255,255,0.95)';ctx.fillRect(p.x,p.y,p.w,p.h);}for(const b of bags){ctx.fillStyle='#ff8fcf';ctx.fillRect(b.x,b.y,b.w,b.h);}ctx.fillStyle=(selected==='fido')?'#6b9be6':'#d76fe9';ctx.fillRect(player.x,player.y,player.w,player.h);ctx.fillStyle='#fff';ctx.font='12px monospace';ctx.fillText('Puntuación:'+Math.floor(score),10,18);ctx.fillText('Vidas:'+lives,10,36);}
function spawnPink(){const w=30+Math.random()*30;bags.push({x:Math.random()*(W-w-28)+14,y:-80,w:w,h:w*0.9,vx:(Math.random()-0.5)*0.8,vy:2+Math.random()*1.5});}
function spawnStreak(){const w=140+Math.random()*120;streaks.push({x:Math.random()*(W-w-80)+40,y:-40,w:w,h:12+Math.random()*8,vx:(Math.random()-0.5)*0.8,vy:1+Math.random()*1});}
function spawnLifeStripe(){const w=10+Math.random()*6;lifeStripes.push({x:Math.random()*(W-w-28)+14,y:-120,w:w,h:120,vy:2.2+Math.random()*0.6,life:800});}
function update(){if(phase!=='play')return;spawnTimer++;if(spawnTimer>60){spawnTimer=0;if(Math.random()<0.12+level*0.01)spawnStreak();spawnPink();if(Math.random()<0.05)spawnLifeStripe();}for(let i=bags.length-1;i>=0;i--){const b=bags[i];b.vy+=0.02+level*0.006;b.x+=b.vx;b.y+=b.vy;if(b.y>H+120){score+=Math.max(1,Math.floor(b.w/10));bags.splice(i,1);}if(b.x<player.x+player.w&&b.x+b.w>player.x&&b.y<player.y+player.h&&b.y+b.h>player.y){bags.splice(i,1);lives--;audio.hit.play();if(lives<=0){phase='gameover';onGameOver();}}}for(let i=lifeStripes.length-1;i>=0;i--){const p=lifeStripes[i];p.y+=p.vy;p.life--; if(p.y>H+120||p.life<=0){lifeStripes.splice(i,1);continue;} if(p.x<player.x+player.w&&p.x+p.w>player.x&&p.y<player.y+player.h&&p.y+p.h>player.y){lifeStripes.splice(i,1); if(lives<maxLives){lives++; audio.powerup.play();}}}player.dance=(player.dance+1)%60;if(score>level*300)level=Math.floor(score/300)+1}
async function onGameOver(){await fetchTop();const enters=(!top10||top10.length<10)?true:top10.some(e=>score>e.score);if(enters){let name=prompt('¡Top10! Escribe tu nombre:','Jugador');if(name)await submitScore(name);}try{audio.music.pause();audio.dj_voice.play();}catch(e){}showFinalScene();phase='menu'}
function showFinalScene(){let t0=performance.now();const dur=4000;function anim(now){const dt=now-t0;const alpha=Math.min(1,dt/dur);ctx.clearRect(0,0,W,H);ctx.fillStyle=`rgba(0,0,0,${alpha*0.85})`;ctx.fillRect(0,0,W,H);const grd=ctx.createLinearGradient(W*0.6,H*0.6,W*0.9,H*0.1);grd.addColorStop(0,`rgba(255,190,100,${alpha*0.7})`);grd.addColorStop(1,`rgba(255,220,140,${alpha*0.0})`);ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);ctx.fillStyle='white';ctx.font='28px sans-serif';ctx.textAlign='center';ctx.fillText('🪩 FIN DE LA FIESTA 🪩',W/2,H/2-20);ctx.fillStyle=`rgba(0,0,0,${Math.min(0.9,alpha)})`;ctx.beginPath();ctx.ellipse(W/2,H/2+40,40,80,0,0,Math.PI*2);ctx.fill();if(dt<dur+1200)requestAnimationFrame(anim);else{fetchTop();}}requestAnimationFrame(anim)}
c.addEventListener('touchstart',e=>{e.preventDefault();const t=e.touches[0];const rect=c.getBoundingClientRect();const x=(t.clientX-rect.left)*(c.width/rect.width);if(phase==='menu'){phase='select';return;}if(phase==='select'){if(x<W/2)selected='fido';else selected='lola';phase='play';score=0;lives=3;bags=[];streaks=[];lifeStripes=[];loadAudio();audio.music.play();return;}if(phase==='play'){return;}})
let spawnTimer=0;loadAudio();fetchTop();function loop(now){update();ctx.clearRect(0,0,W,H);if(phase==='menu')drawMenu();else if(phase==='select')drawSelect();else if(phase==='play')drawGame();requestAnimationFrame(loop);}loop();
c.addEventListener('touchstart', e => {
  e.preventDefault();
  const t = e.touches[0];
  const rect = c.getBoundingClientRect();
  const x = (t.clientX - rect.left) * (c.width / rect.width);

  // 🎛️ Menú principal → ir a selección
  if (phase === 'menu') {
    phase = 'select';
    return;
  }

  // 👯 Selección de personaje
  if (phase === 'select') {
    if (x < W / 2) selected = 'fido';
    else selected = 'lola';
    phase = 'play';
    score = 0;
    lives = 3;
    bags = [];
    streaks = [];
    lifeStripes = [];
    loadAudio();
    audio.music.play();
    return;
  }

  // 🎮 Juego en curso → mover izquierda/derecha
  if (phase === 'play') {
    if (x < W / 2) {
      player.x -= 40; // Mueve a la izquierda
    } else {
      player.x += 40; // Mueve a la derecha
    }

    // Limita dentro de la pantalla
    if (player.x < 0) player.x = 0;
    if (player.x + player.w > W) player.x = W - player.w;
  }
});
