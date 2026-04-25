// Settings panel

const SETTINGS_KEY = 'kcs_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme || 'kerbin');
}

// Call before DOMContentLoaded init so selects are built with correct bodies
function preInitSettings() {
  const s = loadSettings();
  applyTheme(s.theme || 'kerbin');
  if (s.opm) Object.assign(BODIES, OPM_BODIES);
}

function initSettings() {
  const s = loadSettings();

  const panel = document.getElementById('settings-panel');
  const btn   = document.getElementById('settings-btn');

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.classList.toggle('open');
  });

  document.addEventListener('click', e => {
    if (!panel.contains(e.target) && e.target !== btn && !btn.contains(e.target)) {
      panel.classList.remove('open');
    }
  });

  // Theme buttons
  document.querySelectorAll('.theme-btn').forEach(b => {
    if (b.dataset.theme === (s.theme || 'kerbin')) b.classList.add('active');
    b.addEventListener('click', () => {
      const theme = b.dataset.theme;
      applyTheme(theme);
      const cur = loadSettings(); cur.theme = theme; saveSettings(cur);
      document.querySelectorAll('.theme-btn').forEach(x => x.classList.toggle('active', x === b));
    });
  });

  // OPM toggle
  const opmEl = document.getElementById('settings-opm');
  opmEl.checked = !!s.opm;
  opmEl.addEventListener('change', () => {
    const cur = loadSettings();
    cur.opm = opmEl.checked;
    saveSettings(cur);
    if (cur.opm) {
      Object.assign(BODIES, OPM_BODIES);
    } else {
      Object.keys(OPM_BODIES).forEach(k => delete BODIES[k]);
    }
    rebuildBodySelects();
    const active = document.querySelector('.ctrl-btn.active');
    if (active) active.click();
  });
}
