// shared-components.js — injects header, nav, footer into every page

const SHARED = {
  BASE: document.body.dataset.base || '../',

  inject() {
    this.injectHeader();
    this.injectNav();
    this.injectAdminBar();
    this.injectLoginModal();
    this.injectFooter();
  },

  injectHeader() {
    const base = this.BASE;
    document.body.insertAdjacentHTML('afterbegin', `
      <header id="site-header">
        <div class="header-inner">
          <a href="${base}index.html" class="site-logo">
            <svg class="logo-icon" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="24" cy="24" r="20" fill="#1a6fd4" opacity="0.3"/>
              <path d="M24 8 L28 18 L38 18 L30 25 L33 36 L24 29 L15 36 L18 25 L10 18 L20 18 Z" fill="#f5a623"/>
              <path d="M14 28 Q10 32 12 38 Q16 42 24 40 Q35 40 38 32 Q40 26 35 22 Q32 20 28 22 Q26 14 20 14 Q12 14 10 22 Q8 28 14 28Z" fill="white" opacity="0.85"/>
            </svg>
            <div>
              <div class="logo-text">Upstate SC Weather</div>
              <div class="logo-sub">Your Regional Forecast Authority</div>
            </div>
          </a>
          <div id="alert-ticker">
            <span class="ticker-label">⚠ ALERTS</span>
            <div class="ticker-scroll">
              <span class="ticker-inner no-alerts">Loading alerts…</span>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:10px;flex-shrink:0">
            <button id="login-trigger" style="font-family:'Barlow Condensed',sans-serif;font-weight:700;font-size:0.78rem;letter-spacing:0.08em;text-transform:uppercase;background:rgba(255,255,255,0.1);color:rgba(255,255,255,0.7);border:1px solid rgba(255,255,255,0.2);padding:5px 12px;border-radius:3px;cursor:pointer;transition:all 0.15s;">⚙ Admin</button>
          </div>
        </div>
      </header>
    `);
  },

  injectAdminBar() {
    const base = this.BASE;
    document.body.insertAdjacentHTML('afterbegin', `
      <div id="admin-bar">
        <span>🔑 ADMIN MODE</span>
        <a href="${base}admin.html" class="admin-bar-btn">Master Temps</a>
        <a href="${base}articles/new.html" class="admin-bar-btn">New Article</a>
        <button class="admin-bar-btn" onclick="UW.state.isAdmin=false;UW.saveState();location.reload()">Logout</button>
      </div>
    `);
  },

  injectNav() {
    const base = this.BASE;
    const cities = [
      ['greenville','Greenville'],['spartanburg','Spartanburg'],['anderson','Anderson'],
      ['greer','Greer'],['greenwood','Greenwood'],['abbeville','Abbeville'],
      ['laurens','Laurens'],['union','Union'],['gaffney','Gaffney'],
      ['clemson','Clemson'],['pickens','Pickens'],['caesarshead',"Caesar's Head"],
      ['landrum','Landrum'],['walhalla','Walhalla'],
    ];

    const cityLinks = cities.map(([k,n]) => `<a href="${base}pages/${k}.html">${n}</a>`).join('');

    document.body.insertAdjacentHTML('afterbegin', `
      <nav id="main-nav">
        <div class="nav-inner">
          <a href="${base}index.html">🏠 Home</a>
          <div class="nav-dropdown">
            <button class="nav-dropdown-toggle">Cities ▾</button>
            <div class="nav-dropdown-menu">${cityLinks}</div>
          </div>
          <a href="${base}radar.html">📡 Radar &amp; Satellite</a>
          <a href="${base}articles/index.html">📰 Articles</a>
          <a href="${base}archive.html">📊 Obs Archive</a>
        </div>
      </nav>
    `);
  },

  injectLoginModal() {
    document.body.insertAdjacentHTML('beforeend', `
      <div class="modal-overlay" id="login-modal">
        <div class="modal-box">
          <button class="modal-close" id="modal-close">✕</button>
          <div class="modal-title">🔑 Admin Login</div>
          <input type="password" id="login-pass" placeholder="Enter admin password" autocomplete="current-password">
          <button class="login-btn" id="login-submit">Sign In</button>
        </div>
      </div>
    `);
  },

  injectFooter() {
    const base = this.BASE;
    document.body.insertAdjacentHTML('beforeend', `
      <footer>
        <div class="footer-inner">
          <div class="footer-links">
            <a href="${base}index.html">Home</a>
            <a href="${base}radar.html">Radar</a>
            <a href="${base}articles/index.html">Articles</a>
            <a href="${base}archive.html">Archive</a>
            <a href="https://www.weather.gov/gsp/" target="_blank">NWS Greenville-Spartanburg</a>
          </div>
          <div class="footer-copy">
            Live observations from NOAA/NWS. KGSP radar and GOES-19 satellite imagery courtesy of NOAA.<br>
            Upstate SC Weather — Serving Greenville, Spartanburg &amp; surrounding counties.
          </div>
        </div>
      </footer>
    `);
  }
};

document.addEventListener('DOMContentLoaded', () => SHARED.inject());
