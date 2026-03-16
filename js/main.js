// ── UPSTATE SC WEATHER — CORE JS ──────────────────────────

const UW = {

  // ── CONFIG ──────────────────────────────────────────────
  ADMIN_PASS: 'upstate2024!',

  // City definitions: name, offset from Greer (reference = 0), NWS station
  CITIES: {
    greenville:  { name: 'Greenville',  county: 'Greenville County',  offset:  0, station: 'KGMU', lat: 34.852,  lon: -82.394 },
    spartanburg: { name: 'Spartanburg', county: 'Spartanburg County', offset: -1, station: 'KSPA', lat: 34.9495, lon: -81.9943 },
    anderson:    { name: 'Anderson',    county: 'Anderson County',    offset:  1, station: 'KAND', lat: 34.5034, lon: -82.6499 },
    greer:       { name: 'Greer',       county: 'Spartanburg/Greenville', offset: 0, station: 'KGSP', lat: 34.8960, lon: -82.2185, isRef: true },
    greenwood:   { name: 'Greenwood',   county: 'Greenwood County',   offset:  2, station: 'KGRD', lat: 34.1959, lon: -82.1618 },
    abbeville:   { name: 'Abbeville',   county: 'Abbeville County',   offset:  2, station: 'KAND', lat: 34.1779, lon: -82.3790 },
    laurens:     { name: 'Laurens',     county: 'Laurens County',     offset:  1, station: 'KLUR', lat: 34.4993, lon: -82.0135 },
    union:       { name: 'Union',       county: 'Union County',       offset: -1, station: 'KSPA', lat: 34.7154, lon: -81.6243 },
    gaffney:     { name: 'Gaffney',     county: 'Cherokee County',    offset: -2, station: 'KCLT', lat: 35.0718, lon: -81.6496 },
    clemson:     { name: 'Clemson',     county: 'Pickens County',     offset:  1, station: 'KAND', lat: 34.6834, lon: -82.8374 },
    pickens:     { name: 'Pickens',     county: 'Pickens County',     offset: -1, station: 'KGMU', lat: 34.8843, lon: -82.7071 },
    caesarshead: { name: "Caesar's Head", county: 'Greenville County', offset: -8, station: 'KGMU', lat: 35.1073, lon: -82.6362 },
    landrum:     { name: 'Landrum',     county: 'Spartanburg County', offset: -3, station: 'KSPA', lat: 35.1751, lon: -82.1874 },
    walhalla:    { name: 'Walhalla',    county: 'Oconee County',      offset:  0, station: 'KAND', lat: 34.7651, lon: -83.0649 },
  },

  // ── STATE ────────────────────────────────────────────────
  state: {
    isAdmin: false,
    greerTemp: null,   // admin-set base temp
    temps: {},         // per-city overrides
    discussions: {},   // per-city forecast discussions
    forecasts: {},     // per-city 7-day forecast data
    observations: {},  // live obs cache
    alerts: [],        // NWS alerts
  },

  // ── INIT ─────────────────────────────────────────────────
  init() {
    this.loadLocalStorage();
    this.renderAdminBar();
    this.setupLoginModal();
    this.fetchAlerts();
    this.fetchAllObs();

    // City page init
    const cityKey = document.body.dataset.city;
    if (cityKey) {
      this.initCityPage(cityKey);
    }

    // Home page
    if (document.getElementById('city-cards-container')) {
      this.renderCityCards();
    }

    // Radar page or home radar panels
    if (document.getElementById('radar-container')) {
      this.initRadar();
    }

    setInterval(() => this.fetchAllObs(), 5 * 60 * 1000);
    setInterval(() => this.fetchAlerts(), 10 * 60 * 1000);
  },

  // ── LOCAL STORAGE ────────────────────────────────────────
  loadLocalStorage() {
    try {
      const saved = localStorage.getItem('uw_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        this.state = { ...this.state, ...parsed };
      }
    } catch(e) {}
  },

  saveState() {
    try {
      localStorage.setItem('uw_state', JSON.stringify(this.state));
    } catch(e) {}
  },

  // ── ADMIN ────────────────────────────────────────────────
  renderAdminBar() {
    const bar = document.getElementById('admin-bar');
    if (!bar) return;
    if (this.state.isAdmin) {
      bar.classList.add('active');
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
    } else {
      bar.classList.remove('active');
      document.querySelectorAll('.admin-only').forEach(el => el.style.display = 'none');
    }
  },

  setupLoginModal() {
    const loginBtn = document.getElementById('login-trigger');
    const modal = document.getElementById('login-modal');
    const closeBtn = document.getElementById('modal-close');
    const submitBtn = document.getElementById('login-submit');
    const passInput = document.getElementById('login-pass');

    if (!loginBtn || !modal) return;

    loginBtn.addEventListener('click', () => {
      if (this.state.isAdmin) {
        this.state.isAdmin = false;
        this.saveState();
        this.renderAdminBar();
      } else {
        modal.classList.add('active');
        setTimeout(() => passInput && passInput.focus(), 100);
      }
    });

    closeBtn && closeBtn.addEventListener('click', () => modal.classList.remove('active'));

    const tryLogin = () => {
      if (passInput.value === this.ADMIN_PASS) {
        this.state.isAdmin = true;
        this.saveState();
        modal.classList.remove('active');
        passInput.value = '';
        this.renderAdminBar();
        document.querySelectorAll('.admin-only').forEach(el => el.style.display = '');
      } else {
        passInput.classList.add('shake');
        setTimeout(() => passInput.classList.remove('shake'), 500);
        passInput.value = '';
      }
    };

    submitBtn && submitBtn.addEventListener('click', tryLogin);
    passInput && passInput.addEventListener('keydown', e => { if (e.key === 'Enter') tryLogin(); });
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.remove('active'); });
  },

  // ── TEMPERATURE SYSTEM ───────────────────────────────────
  getTemp(cityKey) {
    // Admin override for this city
    if (this.state.temps[cityKey] !== undefined) return this.state.temps[cityKey];
    // Derived from Greer base
    if (this.state.greerTemp !== null) {
      const offset = this.CITIES[cityKey]?.offset ?? 0;
      return this.state.greerTemp + offset;
    }
    return null;
  },

  // ── NWS ALERTS ───────────────────────────────────────────
  async fetchAlerts() {
    // Upstate SC counties: Greenville, Spartanburg, Anderson, Pickens, Oconee, Cherokee, Union, Laurens, Abbeville, Greenwood, Newberry
    const zones = 'SCZ028,SCZ029,SCZ030,SCZ031,SCZ032,SCZ033,SCZ034,SCZ035,SCZ036,SCZ037';
    try {
      const r = await fetch(`https://api.weather.gov/alerts/active?zone=${zones}`);
      const data = await r.json();
      this.state.alerts = (data.features || []).map(f => ({
        event: f.properties.event,
        headline: f.properties.headline,
        severity: f.properties.severity,
        areas: f.properties.areaDesc,
        expires: f.properties.expires,
      }));
    } catch(e) {
      this.state.alerts = [];
    }
    this.renderAlerts();
  },

  renderAlerts() {
    this.renderTicker();
    this.renderAlertBannerHome();
  },

  renderTicker() {
    const inner = document.querySelector('.ticker-inner');
    if (!inner) return;
    if (!this.state.alerts.length) {
      inner.textContent = 'No active watches, warnings, or advisories for Upstate South Carolina.';
      inner.classList.add('no-alerts');
      return;
    }
    inner.classList.remove('no-alerts');
    inner.textContent = this.state.alerts.map(a => `⚠ ${a.event}: ${a.areas}`).join('  ·  ');
  },

  renderAlertBannerHome() {
    const banner = document.getElementById('alert-banner-home');
    if (!banner) return;
    banner.innerHTML = '';
    if (!this.state.alerts.length) {
      banner.innerHTML = '<div style="text-align:center;color:#5a7fa8;font-style:italic;font-size:0.9rem;padding:8px 0">✓ No active weather alerts for Upstate South Carolina</div>';
      return;
    }
    this.state.alerts.forEach(a => {
      const sev = a.severity?.toLowerCase();
      let cls = 'advisory';
      if (sev === 'extreme' || a.event.toLowerCase().includes('warning')) cls = 'warning';
      else if (a.event.toLowerCase().includes('watch')) cls = 'watch';
      banner.innerHTML += `
        <div class="alert-card ${cls}">
          <span class="alert-card-icon">${cls === 'warning' ? '🔴' : cls === 'watch' ? '🟡' : '🔵'}</span>
          <div class="alert-card-content">
            <strong>${a.event}</strong>
            ${a.headline || a.areas}
          </div>
        </div>`;
    });
  },

  // ── LIVE OBSERVATIONS ────────────────────────────────────
  async fetchAllObs() {
    const stations = [...new Set(Object.values(this.CITIES).map(c => c.station))];
    await Promise.all(stations.map(s => this.fetchObs(s)));
    this.updateObsDisplays();
  },

  async fetchObs(station) {
    try {
      const r = await fetch(`https://api.weather.gov/stations/${station}/observations/latest`);
      const data = await r.json();
      const p = data.properties;
      if (!p) return;
      this.state.observations[station] = {
        temp: p.temperature?.value != null ? Math.round(p.temperature.value * 9/5 + 32) : null,
        dewpoint: p.dewpoint?.value != null ? Math.round(p.dewpoint.value * 9/5 + 32) : null,
        humidity: p.relativeHumidity?.value != null ? Math.round(p.relativeHumidity.value) : null,
        windSpeed: p.windSpeed?.value != null ? Math.round(p.windSpeed.value * 2.237) : null,
        windDir: p.windDirection?.value != null ? this.degToDir(p.windDirection.value) : null,
        windGust: p.windGust?.value != null ? Math.round(p.windGust.value * 2.237) : null,
        pressure: p.barometricPressure?.value != null ? (p.barometricPressure.value / 100).toFixed(1) : null,
        visibility: p.visibility?.value != null ? (p.visibility.value / 1609.34).toFixed(1) : null,
        condition: p.textDescription || null,
        time: p.timestamp ? new Date(p.timestamp) : null,
        raw: p.rawMessage || null,
      };
    } catch(e) {}
  },

  updateObsDisplays() {
    // Update all city card temps from obs if no admin temp set
    document.querySelectorAll('[data-city-card]').forEach(card => {
      const key = card.dataset.cityCard;
      const city = this.CITIES[key];
      if (!city) return;
      const obs = this.state.observations[city.station];
      const adminTemp = this.getTemp(key);
      const displayTemp = adminTemp !== null ? adminTemp : (obs?.temp ?? '—');
      const tempEl = card.querySelector('.city-card-temp');
      if (tempEl) tempEl.textContent = displayTemp !== null ? `${displayTemp}°` : '—';
      const condEl = card.querySelector('.city-card-cond');
      if (condEl && obs?.condition) condEl.textContent = obs.condition;
    });

    // Update city page obs sidebar
    const sidebar = document.getElementById('obs-sidebar');
    if (sidebar) {
      const cityKey = document.body.dataset.city;
      const city = this.CITIES[cityKey];
      if (city) {
        const obs = this.state.observations[city.station];
        if (obs) this.populateObsSidebar(obs, city.station);
      }
    }
  },

  populateObsSidebar(obs, station) {
    const set = (id, val, unit) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val !== null && val !== undefined ? `${val}${unit||''}` : '—';
    };
    set('obs-temp', obs.temp, '°F');
    set('obs-dewpoint', obs.dewpoint, '°F');
    set('obs-humidity', obs.humidity, '%');
    set('obs-wind', obs.windSpeed !== null ? `${obs.windDir || ''} ${obs.windSpeed} mph${obs.windGust ? ` G${obs.windGust}` : ''}` : null);
    set('obs-pressure', obs.pressure, ' mb');
    set('obs-visibility', obs.visibility, ' mi');
    set('obs-condition', obs.condition);
    const timeEl = document.getElementById('obs-time');
    if (timeEl && obs.time) {
      timeEl.textContent = `Obs: ${obs.time.toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit',timeZone:'America/New_York'})} EDT · ${station}`;
    }
  },

  degToDir(deg) {
    const dirs = ['N','NNE','NE','ENE','E','ESE','SE','SSE','S','SSW','SW','WSW','W','WNW','NW','NNW'];
    return dirs[Math.round(deg / 22.5) % 16];
  },

  // ── CITY PAGE ────────────────────────────────────────────
  initCityPage(cityKey) {
    const city = this.CITIES[cityKey];
    if (!city) return;

    // Set page title
    document.title = `${city.name} Weather — Upstate SC Weather`;

    // Render stored forecast
    this.renderForecastStrip(cityKey);
    this.renderDiscussion(cityKey);
    this.renderCityPageTemp(cityKey);

    // Admin controls
    if (this.state.isAdmin) {
      this.initCityAdminPanel(cityKey);
    }

    document.querySelectorAll('.admin-only').forEach(el => {
      el.style.display = this.state.isAdmin ? '' : 'none';
    });

    // Edit buttons
    const editDiscBtn = document.getElementById('edit-disc-btn');
    if (editDiscBtn) {
      editDiscBtn.addEventListener('click', () => {
        if (!this.state.isAdmin) { this.promptLogin(); return; }
        this.initCityAdminPanel(cityKey);
        document.getElementById('city-admin-panel')?.classList.toggle('active');
      });
    }
  },

  renderCityPageTemp(cityKey) {
    const el = document.getElementById('city-main-temp');
    if (!el) return;
    const t = this.getTemp(cityKey);
    const city = this.CITIES[cityKey];
    const obs = this.state.observations[city?.station];
    el.textContent = t !== null ? `${t}°F` : (obs?.temp != null ? `${obs.temp}°F` : '—');
  },

  renderForecastStrip(cityKey) {
    const strip = document.getElementById('forecast-strip');
    if (!strip) return;
    const fc = this.state.forecasts[cityKey] || this.defaultForecast(cityKey);
    strip.innerHTML = fc.map((day, i) => `
      <div class="forecast-day">
        <div class="fc-day-name">${day.day}</div>
        <div class="fc-icon">${day.icon}</div>
        <div class="fc-temps">
          <span class="fc-high">${day.high}°</span> / <span class="fc-low">${day.low}°</span>
        </div>
        ${day.precip ? `<div class="fc-precip">💧${day.precip}%</div>` : ''}
      </div>`).join('');
  },

  defaultForecast(cityKey) {
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const today = new Date().getDay();
    const greer = this.state.greerTemp || 62;
    const offset = this.CITIES[cityKey]?.offset || 0;
    const base = greer + offset;
    return Array.from({length:7}, (_,i) => ({
      day: days[(today+i)%7],
      icon: ['☀️','⛅','🌧️','⛅','☀️','🌤️','⛅'][i],
      high: base + [0,2,-3,-1,3,2,-1][i],
      low: base - [12,10,8,11,13,12,10][i],
      precip: [0,0,60,20,0,0,30][i] || null,
    }));
  },

  renderDiscussion(cityKey) {
    const el = document.getElementById('discussion-text');
    if (!el) return;
    const disc = this.state.discussions[cityKey];
    el.textContent = disc || 'No forecast discussion available. Check back soon.';
  },

  initCityAdminPanel(cityKey) {
    const panel = document.getElementById('city-admin-panel');
    if (!panel) return;
    panel.innerHTML = this.buildAdminPanelHTML(cityKey);
    this.bindAdminPanelEvents(cityKey);
  },

  buildAdminPanelHTML(cityKey) {
    const city = this.CITIES[cityKey];
    const fc = this.state.forecasts[cityKey] || this.defaultForecast(cityKey);
    const disc = this.state.discussions[cityKey] || '';
    const temp = this.state.temps[cityKey] ?? '';

    const iconOptions = ['☀️','🌤️','⛅','🌥️','☁️','🌧️','⛈️','🌩️','🌨️','❄️','🌫️','🌬️'];

    const forecastRows = fc.map((day, i) => `
      <div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #ffc10730;flex-wrap:wrap;">
        <span style="font-family:'Barlow Condensed',sans-serif;font-weight:700;width:36px;color:#5a4000">${day.day}</span>
        <select data-fc-icon="${i}" style="padding:3px;border:1px solid #ffc107;border-radius:3px;background:#fffde7;font-size:1.1rem;">
          ${iconOptions.map(ic => `<option value="${ic}" ${ic===day.icon?'selected':''}>${ic}</option>`).join('')}
        </select>
        <label style="font-size:0.75rem;color:#795548;margin:0">High:</label>
        <input type="number" data-fc-high="${i}" value="${day.high}" style="width:55px;padding:3px 6px;border:1px solid #ffc107;border-radius:3px;background:#fffde7;font-family:'IBM Plex Mono',monospace;">
        <label style="font-size:0.75rem;color:#795548;margin:0">Low:</label>
        <input type="number" data-fc-low="${i}" value="${day.low}" style="width:55px;padding:3px 6px;border:1px solid #ffc107;border-radius:3px;background:#fffde7;font-family:'IBM Plex Mono',monospace;">
        <label style="font-size:0.75rem;color:#795548;margin:0">Precip%:</label>
        <input type="number" data-fc-precip="${i}" value="${day.precip||0}" style="width:55px;padding:3px 6px;border:1px solid #ffc107;border-radius:3px;background:#fffde7;font-family:'IBM Plex Mono',monospace;">
      </div>`).join('');

    return `
      <div style="font-family:'Barlow Condensed',sans-serif;font-weight:800;font-size:1.1rem;color:#5a4000;margin-bottom:14px;letter-spacing:0.06em;">
        ✏️ EDITING: ${city.name}
      </div>

      <label>Override Temperature (leave blank to use Greer-based)</label>
      <input type="number" id="admin-temp-override" value="${temp}" placeholder="e.g. 58">

      <label>7-Day Forecast</label>
      <div style="background:#fffde7;border:1px solid #ffc107;border-radius:4px;padding:10px 14px;margin-bottom:10px;">
        ${forecastRows}
      </div>

      <label>Forecast Discussion</label>
      <textarea id="admin-discussion" rows="6" placeholder="Write forecast discussion here...">${disc}</textarea>

      <button class="save-btn" id="admin-save-city">💾 Save ${city.name}</button>
    `;
  },

  bindAdminPanelEvents(cityKey) {
    const saveBtn = document.getElementById('admin-save-city');
    if (!saveBtn) return;
    saveBtn.addEventListener('click', () => {
      const fc = this.state.forecasts[cityKey] || this.defaultForecast(cityKey);

      // Temp override
      const tempVal = document.getElementById('admin-temp-override')?.value;
      if (tempVal !== '' && tempVal !== undefined) {
        const n = parseInt(tempVal);
        if (!isNaN(n)) this.state.temps[cityKey] = n;
        else delete this.state.temps[cityKey];
      } else {
        delete this.state.temps[cityKey];
      }

      // Forecast
      for (let i = 0; i < 7; i++) {
        const iconEl = document.querySelector(`[data-fc-icon="${i}"]`);
        const highEl = document.querySelector(`[data-fc-high="${i}"]`);
        const lowEl  = document.querySelector(`[data-fc-low="${i}"]`);
        const precEl = document.querySelector(`[data-fc-precip="${i}"]`);
        if (iconEl) fc[i].icon = iconEl.value;
        if (highEl) fc[i].high = parseInt(highEl.value) || fc[i].high;
        if (lowEl)  fc[i].low  = parseInt(lowEl.value)  || fc[i].low;
        if (precEl) fc[i].precip = parseInt(precEl.value) || 0;
      }
      this.state.forecasts[cityKey] = fc;

      // Discussion
      const discEl = document.getElementById('admin-discussion');
      if (discEl) this.state.discussions[cityKey] = discEl.value;

      this.saveState();
      this.renderForecastStrip(cityKey);
      this.renderDiscussion(cityKey);
      this.renderCityPageTemp(cityKey);

      saveBtn.textContent = '✓ Saved!';
      saveBtn.style.background = '#1565c0';
      setTimeout(() => { saveBtn.textContent = `💾 Save ${this.CITIES[cityKey].name}`; saveBtn.style.background = ''; }, 2000);
    });
  },

  // ── CITY CARDS (HOME) ────────────────────────────────────
  renderCityCards() {
    const container = document.getElementById('city-cards-container');
    if (!container) return;
    container.innerHTML = Object.entries(this.CITIES).map(([key, city]) => {
      const t = this.getTemp(key);
      const obs = this.state.observations[city.station];
      const displayTemp = t !== null ? t : (obs?.temp ?? '—');
      const icon = this.state.forecasts[key]?.[0]?.icon || '⛅';
      return `
        <a href="pages/${key}.html" class="city-card" data-city-card="${key}">
          <div class="city-card-name">${city.name}</div>
          <div class="city-card-temp">${displayTemp !== '—' ? displayTemp + '°' : '—'}</div>
          <div class="city-card-cond">${obs?.condition || city.county}</div>
          <div class="city-card-icon">${icon}</div>
        </a>`;
    }).join('');
  },

  // ── RADAR INIT ───────────────────────────────────────────
  initRadar() {
    // Radar: embed RainViewer or direct NWS iframe
    const radarFrame = document.getElementById('kgsp-radar');
    if (radarFrame) {
      // RainViewer embed for KGSP area
      radarFrame.src = 'https://embed.windy.com/embed2.html?lat=34.9&lon=-82.2&detailLat=34.9&detailLon=-82.2&width=650&height=400&zoom=7&level=surface&overlay=radar&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1';
    }
  },

  // ── GREER MASTER TEMP (Home Admin) ──────────────────────
  initHomeAdmin() {
    const panel = document.getElementById('home-admin-panel');
    if (!panel || !this.state.isAdmin) return;
    panel.classList.add('active');

    const greerInput = document.getElementById('greer-base-temp');
    if (greerInput) {
      greerInput.value = this.state.greerTemp || '';
      greerInput.addEventListener('input', () => {
        const v = parseInt(greerInput.value);
        if (!isNaN(v)) {
          this.state.greerTemp = v;
          this.updateDerivedTempInputs();
        }
      });
    }

    // Per-city overrides
    Object.keys(this.CITIES).forEach(key => {
      const input = document.getElementById(`temp-${key}`);
      if (input) {
        input.value = this.state.temps[key] ?? '';
        input.addEventListener('input', () => {
          const v = parseInt(input.value);
          if (!isNaN(v)) this.state.temps[key] = v;
          else delete this.state.temps[key];
        });
      }
    });

    document.getElementById('save-all-temps')?.addEventListener('click', () => {
      this.saveState();
      this.renderCityCards();
      const btn = document.getElementById('save-all-temps');
      btn.textContent = '✓ Saved!';
      btn.style.background = '#1565c0';
      setTimeout(() => { btn.textContent = '💾 Save All Temperatures'; btn.style.background = ''; }, 2000);
    });
  },

  updateDerivedTempInputs() {
    Object.entries(this.CITIES).forEach(([key, city]) => {
      const input = document.getElementById(`temp-${key}`);
      if (input && (this.state.temps[key] === undefined)) {
        if (this.state.greerTemp !== null) {
          const derived = this.state.greerTemp + city.offset;
          input.placeholder = `${derived} (auto)`;
        }
      }
    });
  },

  promptLogin() {
    document.getElementById('login-modal')?.classList.add('active');
  },
};

// ── ARTICLE MANAGEMENT ────────────────────────────────────
const Articles = {
  STORAGE_KEY: 'uw_articles',

  getAll() {
    try {
      return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]');
    } catch(e) { return []; }
  },

  save(articles) {
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(articles));
  },

  create(title, tag, content) {
    const articles = this.getAll();
    const id = Date.now().toString();
    articles.unshift({ id, title, tag, content, date: new Date().toISOString() });
    this.save(articles);
    return id;
  },

  get(id) {
    return this.getAll().find(a => a.id === id);
  },

  delete(id) {
    const articles = this.getAll().filter(a => a.id !== id);
    this.save(articles);
  },

  renderList(container) {
    const articles = this.getAll();
    if (!articles.length) {
      container.innerHTML = '<p style="color:var(--text-light);font-style:italic;padding:20px 0">No articles yet.</p>';
      return;
    }
    container.innerHTML = articles.map(a => `
      <a href="article.html?id=${a.id}" class="article-card">
        <div class="article-tag">${a.tag || 'Weather'}</div>
        <div class="article-title">${a.title}</div>
        <div class="article-excerpt">${(a.content || '').replace(/<[^>]*>/g,'').substring(0,160)}...</div>
        <div class="article-date">${new Date(a.date).toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}</div>
      </a>`).join('');
  },
};

// ── OBSERVATION ARCHIVE ────────────────────────────────────
const ObsArchive = {
  STORAGE_KEY: 'uw_obs_archive',

  getAll() {
    try { return JSON.parse(localStorage.getItem(this.STORAGE_KEY) || '[]'); }
    catch(e) { return []; }
  },

  save(records) { localStorage.setItem(this.STORAGE_KEY, JSON.stringify(records)); },

  addRecord(cityKey, obs) {
    const records = this.getAll();
    records.unshift({
      city: cityKey,
      ...obs,
      savedAt: new Date().toISOString(),
    });
    if (records.length > 500) records.splice(500);
    this.save(records);
  },

  renderTable(container, cityFilter) {
    let records = this.getAll();
    if (cityFilter) records = records.filter(r => r.city === cityFilter);
    if (!records.length) {
      container.innerHTML = '<p style="color:var(--text-light);font-style:italic">No archived observations.</p>';
      return;
    }
    container.innerHTML = `
      <table class="archive-table">
        <thead><tr>
          <th>Date/Time</th><th>City</th><th>Temp</th><th>Dew</th>
          <th>Wind</th><th>Humidity</th><th>Condition</th>
        </tr></thead>
        <tbody>${records.slice(0,200).map(r => `
          <tr>
            <td>${new Date(r.savedAt).toLocaleString('en-US',{timeZone:'America/New_York'})}</td>
            <td>${UW.CITIES[r.city]?.name || r.city}</td>
            <td>${r.temp != null ? r.temp + '°F' : '—'}</td>
            <td>${r.dewpoint != null ? r.dewpoint + '°F' : '—'}</td>
            <td>${r.windDir || ''} ${r.windSpeed != null ? r.windSpeed + ' mph' : '—'}</td>
            <td>${r.humidity != null ? r.humidity + '%' : '—'}</td>
            <td>${r.condition || '—'}</td>
          </tr>`).join('')}</tbody>
      </table>`;
  },
};

// init on DOM ready
document.addEventListener('DOMContentLoaded', () => UW.init());
