/* Reuses app.js initHeroLottie's SVG player, frame range and playback speed.
   Only the Writing index loads this adapter. List rendering stays independent. */
(() => {
  'use strict';
  const siteRoot = new URL('../../', document.currentScript.src);

  function init() {
    const figure = document.querySelector('[data-writing-overview]');
    if (!figure) return;
    const container = figure.querySelector('[data-overview-art]');
    const toggle = figure.querySelector('[data-overview-toggle]');
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let animation, observer, ready = false, failed = false, inView = true, paused = motion.matches;
    const fail = reason => {
      ready = false;
      failed = true;
      figure.dataset.state = 'failed';
      figure.querySelector('[data-overview-fallback]').textContent = '动画暂不可用';
      toggle.hidden = true;
      animation?.pause();
      console.warn('[Aleksi] Writing animation: ' + reason);
    };
    const sync = () => {
      if (!ready) return;
      if (paused || !inView || document.hidden) animation.pause();
      else animation.play();
      toggle.textContent = paused ? '播放' : '暂停';
      toggle.setAttribute('aria-label', paused ? '播放动画' : '暂停动画');
      figure.dataset.playback = paused ? 'paused' : (inView && !document.hidden ? 'playing' : 'idle');
    };
    const mount = () => {
      if (!window.lottie || typeof window.lottie.loadAnimation !== 'function') {
        fail('lottie-web did not load.');
        return;
      }
      try {
        animation = window.lottie.loadAnimation({
          container,
          renderer: 'svg',
          loop: true,
          autoplay: false,
          path: new URL('assets/lottie/overview-dark.json', siteRoot).href,
          initialSegment: [12, 239],
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: true }
        });
        animation.setSpeed(0.82);
        animation.addEventListener('DOMLoaded', () => {
          if (failed) return;
          animation.goToAndStop(motion.matches ? 60 : 12, true);
          if (failed) return;
          ready = true;
          figure.dataset.state = 'ready';
          toggle.hidden = false;
          sync();
        });
        animation.addEventListener('data_failed', () => fail('animation data failed to load.'));
        animation.addEventListener('error', event => fail(event.type || 'animation error.'));
      } catch (error) { fail(error.message); }
    };

    toggle.addEventListener('click', () => { paused = !paused; sync(); });
    motion.addEventListener('change', () => { paused = motion.matches; sync(); });
    document.addEventListener('visibilitychange', sync);
    if ('IntersectionObserver' in window) {
      observer = new IntersectionObserver(([entry]) => { inView = entry.isIntersecting; sync(); }, { threshold: 0.24 });
      observer.observe(container);
    }
    window.addEventListener('pagehide', event => {
      if (event.persisted) animation?.pause();
      else { observer?.disconnect(); animation?.destroy(); }
    });
    window.addEventListener('pageshow', sync);

    // Loading the player after DOMContentLoaded lets reading.js render/filter
    // articles immediately, even if the player or its JSON is slow or missing.
    if (window.lottie) mount();
    else {
      const player = document.createElement('script');
      player.src = new URL('assets/vendor/lottie-5.12.2.min.js', siteRoot).href;
      player.async = true;
      player.onload = mount;
      player.onerror = () => fail('lottie-web did not load.');
      document.head.append(player);
    }
  }
  // Deferred scripts run while readyState is "interactive", before this event.
  if (document.readyState === 'complete') init();
  else document.addEventListener('DOMContentLoaded', init, { once: true });
})();
