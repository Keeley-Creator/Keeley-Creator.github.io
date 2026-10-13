(() => {
  const root = document.documentElement;
  root.classList.add('js');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));

  /* ---------- reveal on scroll ---------- */
  const revealIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('in'); revealIO.unobserve(e.target); }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  $$('.reveal').forEach((el) => revealIO.observe(el));

  /* ---------- count-up numbers ---------- */
  const render = (el, n) => { el.textContent = (el.dataset.prefix || '') + n + (el.dataset.suffix || ''); };
  const countIO = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (!e.isIntersecting) return;
      const el = e.target;
      countIO.unobserve(el);
      const target = Number(el.dataset.count);
      if (reduced) { render(el, target); return; }
      const t0 = performance.now(), dur = 1300;
      const step = (t) => {
        const p = Math.min(1, (t - t0) / dur);
        render(el, Math.round(target * (1 - Math.pow(1 - p, 3))));
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    });
  }, { threshold: 0.6 });
  $$('[data-count]').forEach((el) => { render(el, 0); countIO.observe(el); });

  /* ---------- progress bar, back-to-top, scrollspy ---------- */
  const bar = $('#progress-bar');
  const toTop = $('#to-top');
  const spyLinks = $$('[data-spy]');
  const sections = spyLinks.map((a) => document.getElementById(a.dataset.spy));
  let ticking = false;
  const onScroll = () => {
    ticking = false;
    const y = window.scrollY;
    const max = document.documentElement.scrollHeight - window.innerHeight;
    bar.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    toTop.classList.toggle('show', y > 600);
    const probe = y + window.innerHeight * 0.35;
    let current = sections[0];
    sections.forEach((s) => { if (s.offsetTop <= probe) current = s; });
    if (y >= max - 4) current = sections[sections.length - 1];
    spyLinks.forEach((a) => a.classList.toggle('active', a.dataset.spy === current.id));
  };
  window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();
  toTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' }));

  /* ---------- tabs ---------- */
  const tablist = $('.tabs');
  const tabs = $$('[role="tab"]', tablist);
  const indicator = $('.tab-indicator', tablist);
  const moveIndicator = (tab) => {
    indicator.style.width = tab.offsetWidth + 'px';
    indicator.style.height = tab.offsetHeight + 'px';
    indicator.style.transform = `translate(${tab.offsetLeft}px, ${tab.offsetTop}px)`;
  };
  const select = (tab, focus) => {
    tabs.forEach((t) => {
      const on = t === tab;
      t.setAttribute('aria-selected', on);
      t.tabIndex = on ? 0 : -1;
      document.getElementById(t.getAttribute('aria-controls')).hidden = !on;
    });
    moveIndicator(tab);
    if (focus) tab.focus({ preventScroll: true });
    if (tablist.scrollWidth > tablist.clientWidth) {
      tablist.scrollTo({ left: tab.offsetLeft - 16, behavior: reduced ? 'auto' : 'smooth' });
    }
  };
  tabs.forEach((t, i) => {
    t.addEventListener('click', () => select(t));
    t.addEventListener('keydown', (e) => {
      const map = { ArrowRight: i + 1, ArrowLeft: i - 1, Home: 0, End: tabs.length - 1 };
      if (!(e.key in map)) return;
      e.preventDefault();
      select(tabs[(map[e.key] + tabs.length) % tabs.length], true);
    });
  });
  const placeIndicator = () => {
    tablist.classList.add('no-anim');
    moveIndicator(tabs.find((t) => t.getAttribute('aria-selected') === 'true'));
    requestAnimationFrame(() => tablist.classList.remove('no-anim'));
  };
  placeIndicator();
  window.addEventListener('resize', placeIndicator);
  if (document.fonts) document.fonts.ready.then(placeIndicator);

  /* ---------- lightbox gallery ---------- */
  const lb = $('#lightbox');
  const lbImg = $('#lb-img');
  const lbCap = $('#lb-caption');
  const lbCount = $('#lb-count');
  let gallery = [], index = 0, lastFocus = null;

  const show = (i) => {
    index = (i + gallery.length) % gallery.length;
    const item = gallery[index];
    lbImg.src = item.dataset.src;
    lbImg.alt = item.querySelector('img').alt;
    lbCap.textContent = item.dataset.caption || '';
    lbCount.textContent = gallery.length > 1 ? `${index + 1} / ${gallery.length}` : '';
    lbImg.style.animation = 'none'; void lbImg.offsetWidth; lbImg.style.animation = '';
    [index + 1, index - 1].forEach((n) => { const g = gallery[(n + gallery.length) % gallery.length]; if (g) new Image().src = g.dataset.src; });
  };
  const open = (btn) => {
    gallery = $$('.zoom').filter((z) => z.offsetParent !== null);
    lastFocus = btn;
    lb.classList.toggle('single', gallery.length < 2);
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
    show(gallery.indexOf(btn));
    $('.lb-close', lb).focus();
  };
  const close = () => {
    lb.hidden = true;
    document.body.style.overflow = '';
    lbImg.removeAttribute('src');
    if (lastFocus) lastFocus.focus({ preventScroll: true });
  };
  $$('.zoom').forEach((z) => z.addEventListener('click', () => open(z)));
  $('.lb-close', lb).addEventListener('click', close);
  $('.lb-prev', lb).addEventListener('click', () => show(index - 1));
  $('.lb-next', lb).addEventListener('click', () => show(index + 1));
  lb.addEventListener('click', (e) => { if (e.target === lb || e.target.classList.contains('lb-figure')) close(); });
  document.addEventListener('keydown', (e) => {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    else if (e.key === 'ArrowRight') show(index + 1);
    else if (e.key === 'ArrowLeft') show(index - 1);
    else if (e.key === 'Tab') {
      const f = $$('button', lb).filter((b) => b.offsetParent !== null && getComputedStyle(b).visibility !== 'hidden');
      const first = f[0], last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    }
  });
  let touchX = null;
  lb.addEventListener('touchstart', (e) => { touchX = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', (e) => {
    if (touchX === null || gallery.length < 2) return;
    const dx = e.changedTouches[0].clientX - touchX;
    if (Math.abs(dx) > 50) show(index + (dx < 0 ? 1 : -1));
    touchX = null;
  });

  /* ---------- portrait tilt ---------- */
  const tilt = $('#tilt');
  if (tilt && !reduced && window.matchMedia('(pointer: fine)').matches) {
    const wrap = tilt.parentElement;
    wrap.addEventListener('pointermove', (e) => {
      const r = wrap.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      tilt.style.transition = 'transform .12s linear';
      tilt.style.transform = `rotateY(${x * 14}deg) rotateX(${-y * 14}deg) scale(1.03)`;
    });
    wrap.addEventListener('pointerleave', () => {
      tilt.style.transition = '';
      tilt.style.transform = '';
    });
  }

  /* ---------- copy link + toast ---------- */
  const toast = $('#toast');
  let toastTimer;
  const say = (msg) => {
    toast.textContent = msg;
    toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove('show'), 2000);
  };
  $('#copy-link').addEventListener('click', async () => {
    const url = location.origin + location.pathname;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = url; document.body.appendChild(ta); ta.select();
      document.execCommand('copy'); ta.remove();
    }
    say('已复制主页链接');
  });
})();
