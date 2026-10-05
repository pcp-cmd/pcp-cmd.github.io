(() => {
  'use strict';
  // Adapt Niku's original desktop force solver to Aleksi's six entry windows.
  // Touch targets and reduced-motion behavior retain the confirmed adaptation.
  const canvas = document.querySelector('[data-entrance-canvas]');
  const world = document.querySelector('[data-entrance-world]');
  const photo = document.querySelector('[data-photo-window]');
  const backdrop = document.querySelector('[data-entrance-backdrop]');
  if (!canvas || !world || !photo) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const touch = () => matchMedia('(hover: none), (pointer: coarse)').matches || innerWidth <= 700;
  const items = [...document.querySelectorAll('[data-window]')].map((element) => ({
    element, id: element.dataset.window, key: element.dataset.window, title: element.querySelector('.window-title'),
    preview: element.querySelector('.window-preview'), x: 0, y: 0, w: 0, h: 0,
    baseW: 0, baseH: 0, targetW: 0, targetH: 0, open: false, vx: 0, vy: 0, repelX: 0, repelY: 0
  }));
  const forceEngine = new window.NikuHome.ForceLayoutEngine({
    gap: 20, dt: .033, damping: 0, buffer: 0,
    iterationsPerStep: 1, initialIterations: 1, pairForce: 1, maxSpeed: 320
  });
  // Sample once; tapping and closing previews never reshuffle the positions.
  const jitter = items.map(() => ({ x: (Math.random() - .5) * 18, y: (Math.random() - .5) * 28 }));
  const camera = { x: 0, y: 0, tx: 0, ty: 0 };
  const mobilePositions = { writing: [.23, .13], project: [.74, .22], research: [.23, .79], about: [.74, .62], works: [.23, .61], room: [.74, .80] };
  let frame = 0, lastTime = 0, drag = null, suppressClick = false, keyboardFocus = false;
  let width, height, center, photoBox, brandBox;

  function measure() {
    const previousWidth = width, previousHeight = height;
    width = canvas.clientWidth; height = canvas.clientHeight;
    const mobile = width <= 700;
    const initialize = !previousWidth || (previousWidth <= 700) !== mobile;
    // Reserve a closed row and the expanded preview below the fixed photo,
    // including on the shortest supported mobile canvas (688 px).
    const mobilePhotoY = Math.min(height * .425, height - (24 + 225 + 12 + 60 + 12 + 84));
    center = { x: width / 2, y: mobile ? mobilePhotoY : height * .5 };
    photoBox = { x: center.x, y: center.y, w: mobile ? 224 : 332, h: mobile ? 168 : 240 };
    photo.style.left = `${center.x - photoBox.w / 2}px`;
    photo.style.top = `${center.y - photoBox.h / 2}px`;
    photo.style.width = `${photoBox.w}px`; photo.style.height = `${photoBox.h}px`;
    const brand = photo.querySelector('h1').getBoundingClientRect(), picture = photo.getBoundingClientRect();
    brandBox = { x: photoBox.x - photoBox.w / 2 + brand.left - picture.left + brand.width / 2,
      y: photoBox.y - photoBox.h / 2 + brand.top - picture.top + brand.height / 2, w: brand.width, h: brand.height };
    const positions = mobile
      ? mobilePositions
      : { writing: [-260, -180], project: [270, -185], research: [275, 155], about: [-255, 155], works: [5, -295], room: [5, 305] };
    items.forEach((item, index) => {
      const position = positions[item.key];
      item.x = initialize ? (mobile ? width * position[0] + jitter[index].x : center.x + position[0] + jitter[index].x) : item.x * width / previousWidth;
      item.y = initialize ? (mobile ? height * position[1] + jitter[index].y : center.y + position[1] + jitter[index].y) : item.y * height / previousHeight;
      item.baseW = Math.ceil(item.title.textContent.length * (mobile ? 12.1 : 17) + (mobile ? 22 : 32));
      item.baseH = mobile ? 60 : 72;
      if (initialize) { item.w = item.baseW; item.h = item.baseH; }
      targetSize(item);
    });
    if (initialize) camera.x = camera.y = camera.tx = camera.ty = 0;
    wake();
  }

  function targetSize(item) {
    item.targetW = item.open ? Math.min(width - 48, Math.max(item.baseW * 1.6, touch() ? 268 : 288)) : item.baseW;
    item.targetH = item.open ? (width <= 700 ? 225 : 285) : item.baseH;
    if (item.open && width > 700 && (Math.abs(item.x - photoBox.x) < 90 || width < 996)) {
      // Keep a preview between the fixed photo and the viewport edge when
      // there is no room to expand sideways without moving away from the pointer.
      const space = item.y < photoBox.y ? Math.min(photoBox.y - photoBox.h / 2, brandBox.y - brandBox.h / 2) : height - photoBox.y - photoBox.h / 2;
      item.targetH = Math.min(item.targetH, Math.max(165, space - 44));
    }
    item.element.classList.toggle('is-compact-preview', item.open && item.targetH < 225);
  }

  function setOpen(item, open) {
    if (item.open === open) return;
    item.open = open;
    item.element.classList.toggle('is-open', open);
    item.title.setAttribute('aria-expanded', String(open));
    item.preview.hidden = !open;
    targetSize(item);
    wake();
  }

  function wake() {
    if (!frame) { lastTime = 0; frame = requestAnimationFrame(tick); }
  }

  function mobileTargets() {
    const active = items.find((item) => item.open);
    if (width > 700 || !active) return null;
    const margin = 24, gap = 12, rowHeight = 60;
    const top = photoBox.y - photoBox.h / 2, bottom = photoBox.y + photoBox.h / 2;
    const others = items.filter((item) => item !== active);
    const neededBelow = Math.ceil(others.length / 2) * (rowHeight + gap) - gap;
    const above = active.y < photoBox.y && top - margin >= active.targetH + gap && height - margin - bottom - gap >= neededBelow;
    const targets = new Map([[active, { x: width / 2, y: above ? margin + active.targetH / 2 : height - margin - active.targetH / 2 }]]);
    const place = (group, regionTop, regionBottom) => {
      const rows = [...group].sort((a, b) => mobilePositions[a.key][1] - mobilePositions[b.key][1]);
      const byX = (a, b) => mobilePositions[a.key][0] - mobilePositions[b.key][0];
      const count = Math.ceil(rows.length / 2);
      for (let row = 0; row < count; row++) {
        const pair = rows.slice(row * 2, row * 2 + 2).sort(byX);
        const y = count === 1 ? (regionTop + regionBottom) / 2 : regionTop + rowHeight / 2 + row * (regionBottom - regionTop - rowHeight) / (count - 1);
        pair.forEach((item, column) => targets.set(item, { x: width * (pair.length === 1 ? .5 : column ? .75 : .25), y }));
      }
    };
    if (above) {
      place(others, bottom + gap, height - margin);
    } else {
      const previewTop = height - margin - active.targetH;
      const upperCapacity = Math.floor((top - margin) / (rowHeight + gap)) * 2;
      const ordered = [...others].sort((a, b) => mobilePositions[a.key][1] - mobilePositions[b.key][1]);
      place(ordered.slice(0, upperCapacity), margin, top - gap);
      place(ordered.slice(upperCapacity), bottom + gap, previewTop - gap);
    }
    return targets;
  }

  function desktopMotions() {
    const next = new Map();
    forceEngine.step([...items, { ...photoBox, id: 'photo', fixed: true, attractStrength: 1 }, { ...brandBox, id: 'brand', fixed: true, attractStrength: 0 }], (id, motion) => next.set(id, motion));
    return items.map(item => {
      const motion = next.get(item.id);
      if (!motion) return { x: 0, y: 0 };
      item.vx = motion.vx; item.vy = motion.vy;
      item.repelX = motion.repelX; item.repelY = motion.repelY;
      return { x: motion.x - item.x, y: motion.y - item.y };
    });
  }

  function tick(time) {
    frame = 0;
    const dt = lastTime ? Math.min((time - lastTime) / 1000, .033) : .033;
    lastTime = time;
    let change = 0;
    const sizeLerp = reduced.matches ? 1 : .2;
    items.forEach((item) => {
      const dw = (item.targetW - item.w) * sizeLerp, dh = (item.targetH - item.h) * sizeLerp;
      item.w += dw; item.h += dh; change += Math.abs(dw) + Math.abs(dh);
    });
    // On a narrow bounded canvas, a fixed photo can trap two separating cards.
    // Deterministic free-space targets guide the same force integration around
    // that obstacle. Positions still move continuously; random seeds never change.
    const targets = mobileTargets();
    // Resolve forces against a single frame; integrate all positions together.
    const motions = width > 700 && !reduced.matches ? desktopMotions() : items.map((item) => {
      const forces = { x: 0, y: 0, nx: 0, ny: 0 };
      for (const other of [...items, photoBox, ...(width > 700 ? [brandBox] : [])]) {
        if (other === item) continue;
        const dx = item.x - other.x, dy = item.y - other.y;
        const clearanceX = Math.abs(dx) - (item.w + other.w) / 2;
        const clearanceY = Math.abs(dy) - (item.h + other.h) / 2;
        const gap = width <= 700 ? 12 : 20;
        if (clearanceX >= gap || clearanceY >= gap) continue;
        if (clearanceX > clearanceY) { forces.x += (Math.sign(dx) || 1) * (gap - clearanceX); forces.nx++; }
        else { forces.y += (Math.sign(dy) || 1) * (gap - clearanceY); forces.ny++; }
      }
      let vx = forces.x / Math.max(1, forces.nx), vy = forces.y / Math.max(1, forces.ny);
      const target = targets?.get(item);
      if (target && reduced.matches) return { x: target.x - item.x, y: target.y - item.y };
      if (target) { vx += (target.x - item.x) * 4; vy += (target.y - item.y) * 4; }
      const speed = Math.hypot(vx, vy);
      if (speed > 320) { vx *= 320 / speed; vy *= 320 / speed; }
      return { x: vx * (reduced.matches ? 1 : dt), y: vy * (reduced.matches ? 1 : dt) };
    });
    items.forEach((item, index) => {
      const previousX = item.x, previousY = item.y;
      item.x += motions[index].x; item.y += motions[index].y;
      // Keep every entry and the mobile Enter action reachable in the viewport.
      const margin = 24;
      item.x = Math.max(margin + item.w / 2, Math.min(width - margin - item.w / 2, item.x));
      item.y = Math.max(margin + item.h / 2, Math.min(height - margin - item.h / 2, item.y));
      change += Math.abs(item.x - previousX) + Math.abs(item.y - previousY);
      item.element.style.left = '0'; item.element.style.top = '0';
      item.element.style.width = `${item.w}px`; item.element.style.height = `${item.h}px`;
      item.element.style.transform = `translate(${item.x - item.w / 2}px, ${item.y - item.h / 2}px)`;
    });
    const cameraLerp = reduced.matches ? 1 : .16;
    camera.x += (camera.tx - camera.x) * cameraLerp; camera.y += (camera.ty - camera.y) * cameraLerp;
    world.style.transform = `translate(${-camera.x}px, ${-camera.y}px)`;
    paintBackdrop();
    change += Math.abs(camera.tx - camera.x) + Math.abs(camera.ty - camera.y);
    if (change > .03) frame = requestAnimationFrame(tick);
  }

  function paintBackdrop() {
    window.AleksiBackdrop?.draw(backdrop, { width, height, center, camera });
  }

  items.forEach((item) => {
    item.element.addEventListener('pointerenter', () => { if (!touch() && !drag?.active) setOpen(item, true); });
    item.element.addEventListener('pointerleave', () => { if (!touch() && !item.element.contains(document.activeElement)) setOpen(item, false); });
    item.element.addEventListener('focusin', () => { if (keyboardFocus) setOpen(item, true); });
    item.element.addEventListener('focusout', (event) => { if (!item.element.contains(event.relatedTarget) && !item.element.matches(':hover')) setOpen(item, false); });
    item.title.addEventListener('click', (event) => {
      if (suppressClick) { event.preventDefault(); return; }
      if (touch()) {
        event.preventDefault();
        items.forEach((other) => { if (other !== item) setOpen(other, false); });
        setOpen(item, !item.open);
      }
    });
    item.element.addEventListener('click', (event) => {
      if (suppressClick || event.defaultPrevented || event.target.closest('a')) return;
      if (touch()) {
        items.forEach((other) => { if (other !== item) setOpen(other, false); });
        setOpen(item, true);
      } else {
        location.assign(item.title.href);
      }
    });
  });
  document.addEventListener('keydown', (event) => {
    keyboardFocus = true;
    if (event.key === 'Escape') {
      const focused = items.find((item) => item.preview.contains(document.activeElement));
      items.forEach((item) => setOpen(item, false));
      if (focused) { keyboardFocus = false; focused.title.focus(); }
    }
  });
  canvas.addEventListener('pointerdown', (event) => {
    keyboardFocus = false;
    if (touch() || event.button !== 0) return;
    suppressClick = false;
    drag = { id: event.pointerId, x: event.clientX, y: event.clientY, cx: camera.tx, cy: camera.ty, active: false };
  });
  canvas.addEventListener('pointermove', (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.x, dy = event.clientY - drag.y;
    if (Math.hypot(dx, dy) < 3 && !drag.active) return;
    if (!drag.active) {
      drag.active = true; canvas.setPointerCapture(event.pointerId); canvas.classList.add('is-dragging');
      items.forEach((item) => setOpen(item, false));
    }
    camera.tx = Math.max(-width / 3, Math.min(width / 3, drag.cx - dx));
    camera.ty = Math.max(-height / 3, Math.min(height / 3, drag.cy - dy));
    wake();
  });
  function endDrag(event) {
    if (!drag || drag.id !== event.pointerId) return;
    suppressClick = drag.active; canvas.classList.remove('is-dragging');
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    drag = null;
  }
  canvas.addEventListener('pointerup', endDrag); canvas.addEventListener('pointercancel', endDrag);
  canvas.addEventListener('click', (event) => { if (suppressClick) { event.preventDefault(); event.stopPropagation(); suppressClick = false; } }, true);
  window.addEventListener('resize', measure);
  window.addEventListener('pagehide', () => { cancelAnimationFrame(frame); frame = 0; });
  window.addEventListener('pageshow', (event) => {
    // A first-load pageshow must preserve previews opened before load finishes.
    if (event.persisted) { items.forEach((item) => setOpen(item, false)); wake(); }
  });
  measure();
})();
