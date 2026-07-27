// ============================================================
//  SORTING WHEEL — SHARED CEREMONY ANIMATIONS
//  animations.js  v1.0.0
// ============================================================
//  Extracted from index.html so that index.html (student sorting)
//  and faculty.html (predetermined faculty spins) can share one
//  copy instead of drifting apart.
//
//  There is no build step. This is a plain classic script that
//  installs a factory on `window`. Load it BEFORE the page's own
//  inline script:
//
//      <script src="animations.js"></script>
//
//  then wire it up once `$` exists:
//
//      const _sw = createSortingWheelAnimations({
//        $,
//        getHouses: () => state.houses
//      });
//      const ANIMATION_META = _sw.ANIMATION_META;
//      const animations     = _sw.animations;
//      const spinRoller     = _sw.spinRoller;
//
//  DEPENDENCIES ARE INJECTED, not reached for globally. The whole
//  point is that neither page can silently break the other, so this
//  file must never reference `state`, `firebase`, the spreadsheet, or
//  any page-specific DOM beyond the element IDs listed below.
//
//  Required DOM element IDs (the host page must provide these):
//      animationStage   rollerFrame   rollerStrip
//  These are created dynamically by the animations themselves:
//      shieldRow   shuffleArena   bracketStage
//
//  Required CSS: animations.css (or the equivalent rules inline).
// ============================================================

window.createSortingWheelAnimations = function (deps) {
  const $ = deps.$;
  const getHouses = deps.getHouses;

  if (typeof $ !== 'function') throw new Error('animations.js: deps.$ is required');
  if (typeof getHouses !== 'function') throw new Error('animations.js: deps.getHouses is required');

  // ----------------------------------------------------------
  //  Private colour helpers.
  //  Deliberate small duplication: index.html uses its own copies
  //  elsewhere, and this file stays self-contained so it can be
  //  dropped into any page without wiring up colour utilities.
  // ----------------------------------------------------------
  function contrastText(hex) {
    const r = parseInt(hex.slice(1,3),16), g = parseInt(hex.slice(3,5),16), b = parseInt(hex.slice(5,7),16);
    return (r*0.299 + g*0.587 + b*0.114) > 150 ? '#1a1a1a' : '#f0e6d3';
  }

  function adjustColor(hex, amount) {
    hex = hex.replace('#', '');
    let r = Math.max(0, Math.min(255, parseInt(hex.slice(0,2),16) + amount));
    let g = Math.max(0, Math.min(255, parseInt(hex.slice(2,4),16) + amount));
    let b = Math.max(0, Math.min(255, parseInt(hex.slice(4,6),16) + amount));
    return `#${r.toString(16).padStart(2,'0')}${g.toString(16).padStart(2,'0')}${b.toString(16).padStart(2,'0')}`;
  }

  function buildRollerStrip(targetIndex) {
    const strip = $('rollerStrip');
    const cardHeight = $('rollerFrame').offsetHeight;
    strip.innerHTML = '';

    // Build: 8 full random cycles + land on target
    const cycles = 8;
    const totalCards = getHouses().length * cycles + targetIndex + 1;
    const cards = [];

    for (let i = 0; i < totalCards; i++) {
      let houseIdx;
      if (i === totalCards - 1) {
        houseIdx = targetIndex; // Last card is the winner
      } else {
        houseIdx = i % getHouses().length;
        // Shuffle within each cycle for visual variety
        // Simple: just use modulo but offset each cycle
        const cycle = Math.floor(i / getHouses().length);
        houseIdx = (i + cycle * 3) % getHouses().length;
      }
      cards.push(houseIdx);
    }

    cards.forEach(hIdx => {
      const h = getHouses()[hIdx];
      const card = document.createElement('div');
      card.className = 'roller-card';
      card.style.background = `linear-gradient(135deg, ${h.color}, ${adjustColor(h.color, -30)})`;
      card.style.height = cardHeight + 'px';

      const textColor = contrastText(h.color);

      if (h.logoUrl) {
        card.innerHTML = `<img class="roller-card-logo" src="${h.logoUrl}" alt="${h.name}">
          <span class="roller-card-name" style="color:${textColor}">${h.name}</span>`;
      } else {
        card.innerHTML = `<div class="roller-card-placeholder" style="color:${textColor}; border-color:${textColor}33">
            ${h.name.charAt(0)}
          </div>
          <span class="roller-card-name" style="color:${textColor}">${h.name}</span>`;
      }
      strip.appendChild(card);
    });

    return { totalCards, cardHeight };
  }

  function spinRoller(targetIndex) {
    return new Promise(resolve => {
      const frame = $('rollerFrame');
      const strip = $('rollerStrip');

      // MUST be visible before measuring height
      frame.classList.add('visible');
      frame.offsetHeight; // Force layout

      const { totalCards, cardHeight } = buildRollerStrip(targetIndex);
      const targetY = -((totalCards - 1) * cardHeight);

      // Reset position
      strip.style.transition = 'none';
      strip.style.transform = 'translateY(0)';
      strip.offsetHeight; // Force reflow

      // Animate — longer spin builds suspense
      const duration = 5500 + Math.random() * 1500; // 5.5-7s
      strip.style.transition = `transform ${duration}ms cubic-bezier(0.05, 0.4, 0.1, 1)`;
      strip.style.transform = `translateY(${targetY}px)`;

      setTimeout(() => resolve(), duration + 100);
    });
  }

  // ============================================================
  //  ANIMATIONS — Wheel Spin, Shield Elimination, Particle Vortex
  // ============================================================
  const ANIMATION_META = {
    roller:     { name: 'Roller',     desc: 'Casino slot machine' },
    wheel:      { name: 'Wheel',      desc: 'Spinning wheel of fortune' },
    shields:    { name: 'Shields',    desc: 'Cards eliminated one by one' },
    particles:  { name: 'Particles',  desc: 'Swirling color vortex' },
    cards:      { name: 'Card Shuffle', desc: 'Shell game card flip' },
    bracket:    { name: 'Bracket',    desc: 'Tournament matchups' },
    portal:     { name: 'Portal',     desc: 'Dramatic vortex burst' },
    helix:      { name: 'Helix',      desc: 'DNA strands unwind' },
  };

  const animations = {
    wheel: animateWheel,
    shields: animateShields,
    particles: animateParticles,
    cards: animateCards,
    bracket: animateBracket,
    portal: animatePortal,
    helix: animateHelix,
  };

  function animateWheel(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      stage.classList.add('visible');
      stage.offsetHeight; // Force layout
      const size = Math.min(stage.offsetWidth || 500, 500);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.style.cssText = `width:${size}px; height:${size}px;`;
      stage.innerHTML = '';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const n = getHouses().length;
      const segAngle = (2 * Math.PI) / n;
      const cx = size / 2, cy = size / 2, radius = size / 2 - 20;

      // Pointer is at the top (12 o'clock = 3PI/2 in canvas coords)
      const pointerAngle = 3 * Math.PI / 2;

      // Target segment center (unrotated)
      const segCenter = segAngle * targetIdx + segAngle / 2;

      // Jitter: land randomly within the middle 60% of the segment
      const jitter = (Math.random() - 0.5) * segAngle * 0.6;

      // Rotation needed to put target under pointer
      let neededRotation = pointerAngle - segCenter - jitter;
      while (neededRotation < 0) neededRotation += 2 * Math.PI;

      // Add full spins for drama (always forward)
      const fullSpins = Math.floor(7 + Math.random() * 3) * 2 * Math.PI;
      const totalRotation = neededRotation + fullSpins;

      let startTime = null;
      const duration = 6000 + Math.random() * 1500;

      function draw(rotation) {
        ctx.clearRect(0, 0, size, size);

        // Draw segments
        getHouses().forEach((h, i) => {
          const start = segAngle * i + rotation;
          const end = start + segAngle;
          ctx.beginPath(); ctx.moveTo(cx, cy);
          ctx.arc(cx, cy, radius, start, end); ctx.closePath();
          ctx.fillStyle = h.color; ctx.fill();
          ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 2; ctx.stroke();

          // House name text
          const textAngle = start + segAngle / 2;
          const textRadius = radius * 0.6;
          ctx.save();
          ctx.translate(cx + Math.cos(textAngle) * textRadius, cy + Math.sin(textAngle) * textRadius);
          ctx.rotate(textAngle + Math.PI / 2);
          ctx.fillStyle = contrastText(h.color);
          ctx.font = `bold ${Math.max(14, radius / 8)}px Cinzel, serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(h.name, 0, 0);
          ctx.restore();
        });

        // Outer ring
        ctx.beginPath(); ctx.arc(cx, cy, radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 3; ctx.stroke();

        // Center hub
        ctx.beginPath(); ctx.arc(cx, cy, 20, 0, Math.PI * 2);
        ctx.fillStyle = '#1a1a2e'; ctx.fill();
        ctx.strokeStyle = '#c9a84c'; ctx.lineWidth = 2; ctx.stroke();

        // Pointer triangle at top — drawn ON TOP of wheel
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius + 18);
        ctx.lineTo(cx - 16, cy - radius - 8);
        ctx.lineTo(cx + 16, cy - radius - 8);
        ctx.closePath();
        ctx.fillStyle = '#c9a84c'; ctx.fill();
        ctx.strokeStyle = '#1a1a2e'; ctx.lineWidth = 2; ctx.stroke();
      }

      function frame(t) {
        if (!startTime) startTime = t;
        const progress = Math.min((t - startTime) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3.5);
        draw(totalRotation * eased);
        if (progress < 1) requestAnimationFrame(frame);
        else setTimeout(resolve, 400);
      }
      requestAnimationFrame(frame);
    });
  }

  function animateShields(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      stage.innerHTML = '<div class="shield-row" id="shieldRow"></div>';
      const row = $('shieldRow');

      const cards = getHouses().map((h, i) => {
        const card = document.createElement('div');
        card.className = 'shield-card';
        card.style.background = `linear-gradient(135deg, ${h.color}, ${adjustColor(h.color, -30)})`;
        card.style.color = contrastText(h.color);
        const inner = h.logoUrl
          ? `<img src="${h.logoUrl}" alt="${h.name}">`
          : `<span class="shield-initial">${h.name.charAt(0)}</span>`;
        card.innerHTML = `${inner}<span class="shield-name">${h.name}</span>`;
        row.appendChild(card);
        return card;
      });

      // Build elimination order (shuffled losers)
      const losers = getHouses().map((_, i) => i).filter(i => i !== targetIdx);
      for (let i = losers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [losers[i], losers[j]] = [losers[j], losers[i]];
      }

      let delay = 1500;
      losers.forEach((idx, step) => {
        setTimeout(() => cards[idx].classList.add('shield-eliminated'), delay);
        delay += 1200 + step * 400;
      });

      setTimeout(() => {
        cards[targetIdx].classList.add('shield-winner');
        setTimeout(resolve, 900);
      }, delay + 600);
    });
  }

  function animateParticles(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      const size = Math.min(stage.offsetWidth || 500, 500);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.style.cssText = `width:${size}px; height:${size}px;`;
      stage.innerHTML = '';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const cx = size / 2, cy = size / 2;

      const particles = [];
      getHouses().forEach((h, i) => {
        for (let j = 0; j < 50; j++) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 40 + Math.random() * (size / 2 - 50);
          particles.push({
            house: i, color: h.color,
            angle, dist, origDist: dist,
            size: 2.5 + Math.random() * 4,
            speed: 0.015 + Math.random() * 0.025,
            alpha: 1
          });
        }
      });

      const duration = 6000;
      let startTime = null;

      function frame(t) {
        if (!startTime) startTime = t;
        const progress = (t - startTime) / duration;
        ctx.clearRect(0, 0, size, size);

        particles.forEach(p => {
          p.angle += p.speed * (1 + (1 - Math.min(progress, 1)) * 2);

          // Phase 1 (0–0.35): swirl
          // Phase 2 (0.35–0.65): losers fade
          if (progress > 0.35 && p.house !== targetIdx) {
            p.alpha = Math.max(0, 1 - (progress - 0.35) / 0.3);
            p.size *= 0.998;
          }
          // Phase 3 (0.55–1.0): winner coalesces
          if (progress > 0.55 && p.house === targetIdx) {
            const t2 = Math.min((progress - 0.55) / 0.45, 1);
            p.dist = p.origDist * (1 - t2 * 0.75);
            p.size = Math.min(p.size * 1.001, 10);
          }

          const x = cx + Math.cos(p.angle) * p.dist;
          const y = cy + Math.sin(p.angle) * p.dist;

          if (p.alpha > 0.01) {
            ctx.beginPath();
            ctx.arc(x, y, p.size, 0, Math.PI * 2);
            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.fill();
          }
        });

        // Draw winner label in center during phase 3
        if (progress > 0.8) {
          const fadeIn = Math.min((progress - 0.8) / 0.15, 1);
          ctx.globalAlpha = fadeIn;
          ctx.fillStyle = contrastText('#0f0f1a');
          ctx.font = `bold ${size / 12}px Cinzel, serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(getHouses()[targetIdx].name, cx, cy);
        }

        ctx.globalAlpha = 1;
        if (progress < 1) requestAnimationFrame(frame);
        else setTimeout(resolve, 400);
      }
      requestAnimationFrame(frame);
    });
  }

  // ============================================================
  //  ANIMATION: Card Shuffle
  // ============================================================
  function animateCards(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      stage.classList.add('visible');
      stage.innerHTML = '<div class="shuffle-arena" id="shuffleArena"></div>';
      const arena = $('shuffleArena');
      const n = getHouses().length;
      const cardW = 120, cardH = 170;
      const totalW = arena.offsetWidth || 500;
      const spacing = Math.min(140, (totalW - cardW) / (n - 1));
      const startX = (totalW - spacing * (n - 1) - cardW) / 2;

      // Create face-down cards in a row
      const cards = getHouses().map((h, i) => {
        const card = document.createElement('div');
        card.className = 'shuffle-card shuffle-card-back';
        card.style.left = (startX + i * spacing) + 'px';
        card.style.top = '65px';
        arena.appendChild(card);
        return { el: card, houseIdx: i };
      });

      // Shuffling phase: rapid position swaps
      let shuffleCount = 0;
      const maxShuffles = 12 + n * 3;
      const shuffleInterval = setInterval(() => {
        const a = Math.floor(Math.random() * n);
        let b = Math.floor(Math.random() * n);
        if (b === a) b = (b + 1) % n;
        const tmpLeft = cards[a].el.style.left;
        cards[a].el.style.left = cards[b].el.style.left;
        cards[b].el.style.left = tmpLeft;
        [cards[a], cards[b]] = [cards[b], cards[a]];
        shuffleCount++;
        if (shuffleCount >= maxShuffles) {
          clearInterval(shuffleInterval);
          separateCards();
        }
      }, 250);

      function separateCards() {
        // Move winner card to top center
        const winIdx = cards.findIndex(c => c.houseIdx === targetIdx);
        cards[winIdx].el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
        cards[winIdx].el.style.left = ((totalW - cardW) / 2) + 'px';
        cards[winIdx].el.style.top = '0px';
        cards[winIdx].el.style.zIndex = '10';
        cards[winIdx].el.style.boxShadow = '0 8px 32px rgba(201,168,76,0.4)';
        cards[winIdx].el.style.borderColor = 'var(--accent-gold)';

        // Move losers to bottom row
        const loserCards = cards.filter((c, i) => i !== winIdx);
        const loserSpacing = Math.min(140, (totalW - cardW) / Math.max(loserCards.length - 1, 1));
        const loserStartX = (totalW - loserSpacing * (loserCards.length - 1) - cardW) / 2;
        loserCards.forEach((c, i) => {
          c.el.style.transition = 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)';
          c.el.style.left = (loserStartX + i * loserSpacing) + 'px';
          c.el.style.top = (cardH + 20) + 'px';
        });

        setTimeout(() => revealCards(winIdx, loserCards), 800);
      }

      function revealCards(winIdx, loserCards) {
        // Shuffle loser reveal order
        const revealOrder = [...loserCards];
        for (let i = revealOrder.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [revealOrder[i], revealOrder[j]] = [revealOrder[j], revealOrder[i]];
        }

        let delay = 400;
        revealOrder.forEach(c => {
          setTimeout(() => {
            const h = getHouses()[c.houseIdx];
            c.el.className = 'shuffle-card shuffle-card-front';
            c.el.style.background = h.color;
            c.el.style.color = contrastText(h.color);
            c.el.innerHTML = `<span class="shield-initial">${h.name.charAt(0)}</span><span class="shield-name">${h.name}</span>`;
            setTimeout(() => c.el.classList.add('shuffle-eliminated'), 400);
          }, delay);
          delay += 900;
        });

        // Reveal winner last
        setTimeout(() => {
          const h = getHouses()[targetIdx];
          cards[winIdx].el.className = 'shuffle-card shuffle-card-front';
          cards[winIdx].el.style.background = h.color;
          cards[winIdx].el.style.color = contrastText(h.color);
          cards[winIdx].el.style.zIndex = '10';
          cards[winIdx].el.innerHTML = `<span class="shield-initial">${h.name.charAt(0)}</span><span class="shield-name">${h.name}</span>`;
          setTimeout(() => {
            cards[winIdx].el.classList.add('shuffle-winner');
            setTimeout(resolve, 800);
          }, 400);
        }, delay + 200);
      }
    });
  }

  // ============================================================
  //  ANIMATION: Tournament Bracket
  // ============================================================
  function animateBracket(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      stage.classList.add('visible');
      stage.innerHTML = '<div class="bracket-stage" id="bracketStage"></div>';
      const bs = $('bracketStage');
      const n = getHouses().length;

      // Shuffle house order
      const order = getHouses().map((h, i) => i);
      for (let i = order.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [order[i], order[j]] = [order[j], order[i]];
      }

      // Semi-finals
      const semis = [];
      for (let i = 0; i < n; i += 2) {
        semis.push({ a: order[i], b: (i + 1 < n) ? order[i + 1] : null });
      }

      function pulseElement(el, color, speed) {
        el.style.animation = `none`; el.offsetHeight;
        el.style.boxShadow = `0 0 20px ${color}66`;
        el.style.animation = `bracket-color-pulse ${speed}s ease infinite alternate`;
        el.style.setProperty('--pulse-color', color);
      }

      // Inject keyframe if not present
      if (!document.querySelector('#bracketPulseStyle')) {
        const s = document.createElement('style');
        s.id = 'bracketPulseStyle';
        s.textContent = `@keyframes bracket-color-pulse { from { box-shadow: 0 0 8px var(--pulse-color,#666)44; transform: scale(1); } to { box-shadow: 0 0 30px var(--pulse-color,#666)aa; transform: scale(1.06); } }`;
        document.head.appendChild(s);
      }

      function createEntry(houseIdx) {
        const h = getHouses()[houseIdx];
        const el = document.createElement('div');
        el.className = 'bracket-entry';
        el.style.background = h.color; el.style.color = contrastText(h.color);
        el.textContent = h.name;
        return el;
      }

      function runMatchup(container, idxA, idxB, winner, callback) {
        const matchup = document.createElement('div');
        matchup.className = 'bracket-matchup';
        const elA = createEntry(idxA);
        const vs = document.createElement('span');
        vs.className = 'bracket-vs'; vs.textContent = 'VS';
        const elB = createEntry(idxB);
        matchup.appendChild(elA); matchup.appendChild(vs); matchup.appendChild(elB);
        container.appendChild(matchup);

        // Both start pulsating at same speed
        setTimeout(() => {
          pulseElement(elA, getHouses()[idxA].color, 0.4);
          pulseElement(elB, getHouses()[idxB].color, 0.4);
        }, 300);

        // Winner pulses faster and harder, loser slows
        setTimeout(() => {
          const winEl = winner === idxA ? elA : elB;
          const loseEl = winner === idxA ? elB : elA;
          pulseElement(winEl, getHouses()[winner].color, 0.15);
          loseEl.style.animation = 'none';
          loseEl.style.boxShadow = 'none';
          loseEl.style.opacity = '0.5';
          loseEl.style.transform = 'scale(0.95)';
        }, 1600);

        // Resolve
        setTimeout(() => {
          const winEl = winner === idxA ? elA : elB;
          const loseEl = winner === idxA ? elB : elA;
          winEl.style.animation = 'none';
          winEl.classList.add('bracket-won');
          loseEl.classList.add('bracket-lost');
          callback();
        }, 2400);
      }

      // Render semi labels
      const semiLabel = document.createElement('div');
      semiLabel.className = 'bracket-label';
      semiLabel.textContent = n > 4 ? 'Quarter Finals' : 'Semi Finals';
      bs.appendChild(semiLabel);
      const semiRow = document.createElement('div');
      semiRow.className = 'bracket-round';
      bs.appendChild(semiRow);

      const finalLabel = document.createElement('div');
      finalLabel.className = 'bracket-label'; finalLabel.textContent = 'Final';
      finalLabel.style.display = 'none';
      bs.appendChild(finalLabel);
      const finalRow = document.createElement('div');
      finalRow.className = 'bracket-round'; finalRow.style.display = 'none';
      bs.appendChild(finalRow);

      // Run semis sequentially
      const semiWinners = [];
      let semiIdx = 0;

      function runNextSemi() {
        if (semiIdx >= semis.length) {
          // Run final
          setTimeout(() => {
            finalLabel.style.display = '';
            finalRow.style.display = '';
            const f = semiWinners.slice(0, 2);
            if (f.length < 2) f.push(f[0]);
            runMatchup(finalRow, f[0], f[1], targetIdx, () => {
              // Champion glow
              const winEntry = finalRow.querySelector('.bracket-won');
              if (winEntry) winEntry.classList.add('bracket-champion');
              setTimeout(resolve, 1000);
            });
          }, 600);
          return;
        }

        const s = semis[semiIdx];
        if (s.b === null) {
          // Bye round
          const entry = createEntry(s.a);
          entry.style.opacity = '0.6';
          const matchup = document.createElement('div');
          matchup.className = 'bracket-matchup';
          matchup.appendChild(entry);
          const bye = document.createElement('span');
          bye.className = 'bracket-vs'; bye.textContent = 'BYE';
          matchup.appendChild(bye);
          semiRow.appendChild(matchup);
          semiWinners.push(s.a);
          semiIdx++;
          setTimeout(runNextSemi, 400);
          return;
        }

        const winner = (s.a === targetIdx || s.b === targetIdx)
          ? targetIdx : (Math.random() < 0.5 ? s.a : s.b);
        semiWinners.push(winner);

        runMatchup(semiRow, s.a, s.b, winner, () => {
          semiIdx++;
          setTimeout(runNextSemi, 500);
        });
      }

      setTimeout(runNextSemi, 400);
    });
  }

  // ============================================================
  //  ANIMATION: Portal Vortex
  // ============================================================
  function animatePortal(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      stage.classList.add('visible');
      const size = Math.min(stage.offsetWidth || 500, 500);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.style.cssText = `width:${size}px; height:${size}px;`;
      stage.innerHTML = '';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const cx = size / 2, cy = size / 2;
      const maxRadius = Math.sqrt(cx * cx + cy * cy); // corner distance
      const duration = 5500;
      let startTime = null;

      // Create vortex particles
      const rings = [];
      getHouses().forEach((h, i) => {
        for (let j = 0; j < 35; j++) {
          rings.push({
            house: i, color: h.color,
            angle: Math.random() * Math.PI * 2,
            radius: 30 + Math.random() * (size * 0.4),
            speed: 0.02 + Math.random() * 0.04,
            size: 2 + Math.random() * 3,
            phase: Math.random() * Math.PI * 2,
          });
        }
      });

      const winColor = getHouses()[targetIdx].color;
      const winHouse = getHouses()[targetIdx];

      function frame(t) {
        if (!startTime) startTime = t;
        const progress = Math.min((t - startTime) / duration, 1);
        ctx.clearRect(0, 0, size, size);

        if (progress < 0.55) {
          // Phase 1: vortex builds, particles spiral inward
          const p = progress / 0.55;
          const speedMult = 1 + p * 10;
          const radiusShrink = 1 - p * 0.6;
          rings.forEach(r => {
            r.angle += r.speed * speedMult;
            const rad = r.radius * radiusShrink;
            const x = cx + Math.cos(r.angle) * rad;
            const y = cy + Math.sin(r.angle) * rad;
            const wave = 0.5 + 0.5 * Math.sin(r.phase + progress * 12);
            ctx.beginPath();
            ctx.arc(x, y, r.size * (0.5 + wave * 0.5), 0, Math.PI * 2);
            ctx.globalAlpha = 0.4 + p * 0.6;
            ctx.fillStyle = r.color;
            ctx.fill();
          });
          // Growing center glow
          const glowSize = 20 + p * 40;
          const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowSize);
          grad.addColorStop(0, winColor + 'cc');
          grad.addColorStop(1, 'transparent');
          ctx.globalAlpha = p * 0.6;
          ctx.fillStyle = grad;
          ctx.beginPath(); ctx.arc(cx, cy, glowSize, 0, Math.PI * 2); ctx.fill();
        } else if (progress < 0.8) {
          // Phase 2: winning circle expands from center
          const p = (progress - 0.55) / 0.25;
          const eased = 1 - Math.pow(1 - p, 2.5);
          const circleR = eased * maxRadius;

          // Fill circle with winning color
          ctx.beginPath();
          ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
          ctx.fillStyle = winColor;
          ctx.globalAlpha = 1;
          ctx.fill();

          // White ring at edge
          ctx.beginPath();
          ctx.arc(cx, cy, circleR, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255,255,255,' + (0.8 - p * 0.6) + ')';
          ctx.lineWidth = 6; ctx.stroke();

          // House name fades in inside the circle
          if (p > 0.3) {
            const textFade = Math.min((p - 0.3) / 0.4, 1);
            ctx.globalAlpha = textFade;
            ctx.fillStyle = contrastText(winColor);
            ctx.font = `bold ${size / 8}px Cinzel, serif`;
            ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText(winHouse.name, cx, cy);
          }
        } else {
          // Phase 3: settle — full color with name, gentle particles orbit
          const p = (progress - 0.8) / 0.2;
          ctx.fillStyle = winColor;
          ctx.globalAlpha = 1 - p * 0.4;
          ctx.fillRect(0, 0, size, size);

          // Orbiting winner particles
          rings.filter(r => r.house === targetIdx).forEach(r => {
            r.angle += r.speed * 0.4;
            const rad = 50 + r.radius * 0.25;
            const x = cx + Math.cos(r.angle) * rad;
            const y = cy + Math.sin(r.angle) * rad;
            ctx.beginPath();
            ctx.arc(x, y, r.size * 1.3, 0, Math.PI * 2);
            ctx.globalAlpha = 0.5;
            ctx.fillStyle = '#ffffff';
            ctx.fill();
          });

          ctx.globalAlpha = 1;
          ctx.fillStyle = contrastText(winColor);
          ctx.font = `bold ${size / 8}px Cinzel, serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(winHouse.name, cx, cy);
        }

        ctx.globalAlpha = 1;
        if (progress < 1) requestAnimationFrame(frame);
        else setTimeout(resolve, 400);
      }
      requestAnimationFrame(frame);
    });
  }

  // ============================================================
  //  ANIMATION: DNA Helix
  // ============================================================
  function animateHelix(targetIdx) {
    return new Promise(resolve => {
      const stage = $('animationStage');
      stage.classList.add('visible');
      const size = Math.min(stage.offsetWidth || 500, 500);
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      canvas.style.cssText = `width:${size}px; height:${size}px;`;
      stage.innerHTML = '';
      stage.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      const cx = size / 2, cy = size / 2;
      const duration = 6000;
      let startTime = null;
      const n = getHouses().length;

      // Build elimination order
      const losers = getHouses().map((_, i) => i).filter(i => i !== targetIdx);
      for (let i = losers.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [losers[i], losers[j]] = [losers[j], losers[i]];
      }

      function frame(t) {
        if (!startTime) startTime = t;
        const progress = Math.min((t - startTime) / duration, 1);
        ctx.clearRect(0, 0, size, size);
        const time = progress * 12;

        getHouses().forEach((h, i) => {
          // Determine if this strand is eliminated
          const loserIdx = losers.indexOf(i);
          let alpha = 1;
          if (loserIdx >= 0) {
            const eliminateAt = 0.2 + loserIdx * (0.5 / losers.length);
            if (progress > eliminateAt) {
              alpha = Math.max(0, 1 - (progress - eliminateAt) / 0.2);
            }
          }
          if (alpha <= 0.01) return;

          // Helix path — vertical with sinusoidal x offset
          const phaseOffset = (i / n) * Math.PI * 2;
          const amplitude = (i === targetIdx && progress > 0.7)
            ? 60 * (1 - (progress - 0.7) / 0.3) // Winner straightens
            : 60;
          const points = 40;

          ctx.beginPath();
          ctx.globalAlpha = alpha;
          ctx.strokeStyle = h.color;
          ctx.lineWidth = (i === targetIdx && progress > 0.8) ? 5 : 3;

          for (let p = 0; p <= points; p++) {
            const py = (p / points) * size;
            const wave = Math.sin(time + phaseOffset + (py / size) * Math.PI * 4);
            const px = cx + wave * amplitude;
            if (p === 0) ctx.moveTo(px, py);
            else ctx.lineTo(px, py);
          }
          ctx.stroke();

          // Draw nodes along the strand
          for (let p = 0; p <= points; p += 4) {
            const py = (p / points) * size;
            const wave = Math.sin(time + phaseOffset + (py / size) * Math.PI * 4);
            const px = cx + wave * amplitude;
            ctx.beginPath();
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fillStyle = h.color;
            ctx.fill();
          }
        });

        // Winner name in center when settled
        if (progress > 0.85) {
          const fadeIn = Math.min((progress - 0.85) / 0.1, 1);
          ctx.globalAlpha = fadeIn;
          ctx.fillStyle = contrastText('#0f0f1a');
          ctx.font = `bold ${size / 10}px Cinzel, serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(getHouses()[targetIdx].name, cx, cy);
        }

        ctx.globalAlpha = 1;
        if (progress < 1) requestAnimationFrame(frame);
        else setTimeout(resolve, 400);
      }
      requestAnimationFrame(frame);
    });
  }
  return {
    ANIMATION_META: ANIMATION_META,
    animations: animations,
    spinRoller: spinRoller,
    buildRollerStrip: buildRollerStrip
  };
};
