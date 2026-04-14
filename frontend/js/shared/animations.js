/* ============================================================
   ELITE CLASS — ANIMATION ENGINE v2
   Fullscreen cinematic animations for STUDENTS ONLY
   ============================================================ */

window.EC = window.EC || {};

EC._isStudent = () => EC.state.currentRole === 'student';

// ===== CONFETTI =====
let confettiAnim;
EC.confetti = {
  start() {
    if (!EC._isStudent()) return;
    const canvas = document.getElementById('confetti-canvas');
    if (!canvas) return;
    canvas.style.display = 'block';
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const colors = ['#1a3a8f','#ffc926','#ff6b35','#22c97a','#ff4060','#4a7fff','#ffffff','#ffd700'];
    const particles = Array.from({length:160}, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height - canvas.height,
      r: 4 + Math.random() * 7,
      d: 2 + Math.random() * 3,
      color: colors[Math.floor(Math.random() * colors.length)],
      tilt: Math.floor(Math.random() * 10) - 10,
      tiltAngle: 0,
      tiltSpeed: 0.07 + Math.random() * 0.05,
      shape: Math.random() > 0.5 ? 'rect' : 'circle',
    }));
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      particles.forEach(p => {
        ctx.beginPath(); ctx.fillStyle = p.color;
        if (p.shape === 'rect') {
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.tilt * Math.PI/180);
          ctx.fillRect(-p.r/2,-p.r/2,p.r,p.r*2); ctx.restore();
        } else { ctx.arc(p.x,p.y,p.r/2,0,2*Math.PI); ctx.fill(); }
        p.y += p.d; p.tiltAngle += p.tiltSpeed; p.tilt = Math.sin(p.tiltAngle)*12;
        if (p.y > canvas.height) { p.y = -10; p.x = Math.random()*canvas.width; }
      });
      confettiAnim = requestAnimationFrame(draw);
    };
    draw();
  },
  stop() {
    cancelAnimationFrame(confettiAnim);
    const c = document.getElementById('confetti-canvas');
    if (c) c.style.display = 'none';
  }
};

EC.showXp = (text = '+XP', x, y) => {
  if (!EC._isStudent()) return;
  const popup = document.getElementById('xp-popup');
  if (!popup) return;
  popup.textContent = text;
  popup.style.display = 'block';
  popup.style.top  = (y || window.innerHeight/2 - 60) + 'px';
  popup.style.left = (x || window.innerWidth/2 - 60) + 'px';
  popup.style.animation = 'none';
  popup.offsetHeight;
  popup.style.animation = 'xp-float 1.8s ease forwards';
  EC.sound?.xpGain?.();
  setTimeout(() => { popup.style.display = 'none'; }, 1900);
};

EC.particleBurst = (x, y, count = 12) => {
  if (!EC._isStudent()) return;
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    const size = 4 + Math.random() * 8;
    const colors = ['#ffc926','#3d6fe8','#ff6b35','#22c97a'];
    el.style.cssText = `width:${size}px;height:${size}px;left:${x}px;top:${y}px;background:${colors[Math.floor(Math.random()*colors.length)]};position:fixed;border-radius:50%;pointer-events:none;z-index:9999;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 850);
  }
};

EC.showBooyah = (subText = 'Amazing!') => {
  if (!EC._isStudent()) return;
  const overlay = document.getElementById('booyah-overlay');
  const sub     = document.getElementById('booyah-sub');
  if (!overlay) return;
  if (sub) sub.textContent = subText;
  overlay.classList.add('show');
  EC.confetti.start();
  EC.sound?.levelUp?.();
  setTimeout(() => { overlay.classList.remove('show'); EC.confetti.stop(); }, 3000);
};

EC.showLevelUp = (from, to) => {
  if (!EC._isStudent()) return;
  const overlay = document.getElementById('levelup-overlay');
  const lvlText = document.getElementById('levelup-level-text');
  if (!overlay) return;
  if (lvlText) lvlText.textContent = `${from} → ${to}`;
  overlay.classList.add('show');
  EC.confetti.start();
  EC.sound?.levelUp?.();
};
EC.closeLevelUp = () => {
  document.getElementById('levelup-overlay')?.classList.remove('show');
  EC.confetti.stop();
};

EC.showStreak = (days = 7) => {
  if (!EC._isStudent()) return;
  const overlay = document.getElementById('streak-overlay');
  if (!overlay) return;
  const sub = overlay.querySelector('.streak-sub');
  if (sub) sub.textContent = `${days}-Day Streak! Keep going!`;
  overlay.classList.add('show');
  EC.sound?.streak?.();
  setTimeout(() => overlay.classList.remove('show'), 3000);
};

EC.showBadgeUnlock = (badge) => {
  if (!EC._isStudent() || !badge) return;
  const overlay = document.getElementById('badge-unlock-overlay');
  if (!overlay) return;
  const iconEl   = document.getElementById('badge-unlock-icon');
  const nameEl   = document.getElementById('badge-unlock-name');
  const descEl   = document.getElementById('badge-unlock-desc');
  const rarityEl = document.getElementById('badge-rarity-tag');
  if (iconEl)   iconEl.textContent   = badge.icon;
  if (nameEl)   nameEl.textContent   = badge.name;
  if (descEl)   descEl.textContent   = badge.desc;
  if (rarityEl) { rarityEl.textContent = badge.rarity; rarityEl.className = `badge-rarity-tag ${badge.rarity}`; }
  overlay.classList.add('show');
  EC.confetti.start();
  EC.sound?.badgeUnlock?.();
};
EC.closeBadgeUnlock = () => {
  document.getElementById('badge-unlock-overlay')?.classList.remove('show');
  EC.confetti.stop();
};

