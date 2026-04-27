// Settings

const SETTINGS_KEY = 'kcs_settings';

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {}; }
  catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'kerbin');
}

// Run before DOMContentLoaded so BODIES has OPM data when selects are built
function preInitSettings() {
  const s = loadSettings();
  applyTheme(s.theme || 'kerbin');
  if (s.opm) { Object.assign(BODIES, OPM_BODIES); Object.assign(BODIES.eeloo, OPM_EELOO_ORBIT); }
}

function initSettings() {
  const s = loadSettings();

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
      Object.assign(BODIES.eeloo, OPM_EELOO_ORBIT);
    } else {
      Object.keys(OPM_BODIES).forEach(k => delete BODIES[k]);
      Object.assign(BODIES.eeloo, STOCK_EELOO_ORBIT);
    }
    rebuildBodySelects();
    // Re-run active tab's calculator
    const active = document.querySelector('.ctrl-btn.active');
    if (active && active.dataset.tab !== 'settings') active.click();
  });
}
