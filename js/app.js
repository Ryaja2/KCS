// Main app controller

document.addEventListener('DOMContentLoaded', () => {
  // Animate stars background
  const starsEl = document.getElementById('stars-canvas');
  if (starsEl) {
    const ctx = starsEl.getContext('2d');
    starsEl.width  = window.innerWidth;
    starsEl.height = window.innerHeight;
    drawStars(ctx, starsEl, 200, 42);
    window.addEventListener('resize', () => {
      starsEl.width  = window.innerWidth;
      starsEl.height = window.innerHeight;
      clearCanvas(ctx, starsEl);
      drawStars(ctx, starsEl, 200, 42);
    });
  }

  // Tab navigation
  const navBtns = document.querySelectorAll('.nav-btn');
  const tabs    = document.querySelectorAll('.tab-panel');

  function showTab(id) {
    navBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === id));
    tabs.forEach(t => t.classList.toggle('active', t.id === 'tab-' + id));
    // Re-trigger viz on tab switch (canvas sizing)
    if (id === 'constellation') calcConstellation();
    if (id === 'transfer')      calcTransfer();
    if (id === 'deltav')        calcDeltaV();
    if (id === 'orbit')         calcOrbit();
    if (id === 'commnet')       calcCommNet();
  }

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => showTab(btn.dataset.tab));
  });

  // Initialize calculators
  initConstellation();
  initTransfer();
  initDeltaV();
  initOrbit();
  initCommNet();

  // Resize canvases responsively
  function resizeCanvases() {
    document.querySelectorAll('canvas.viz-canvas').forEach(canvas => {
      const container = canvas.parentElement;
      const w = container.clientWidth;
      if (w > 0 && canvas.width !== w) {
        canvas.width  = w;
        canvas.height = Math.min(Math.round(w * 0.55), 380);
      }
    });
    // Re-draw active tab
    const active = document.querySelector('.nav-btn.active');
    if (active) showTab(active.dataset.tab);
  }

  window.addEventListener('resize', resizeCanvases);
  resizeCanvases();
});
