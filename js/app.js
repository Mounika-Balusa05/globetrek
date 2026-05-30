// =============================================
// GLOBETREK — MAIN APP LOGIC
// Uses CONFIG from config.js for all API keys
// =============================================

const WEATHER_API_KEY = CONFIG.WEATHER_API_KEY;
const WEATHER_BASE = "https://api.openweathermap.org/data/2.5";

// =============================================
// APP STATE
// =============================================
const state = {
  theme: localStorage.getItem("gt_theme") || "light",
  savedDestinations: JSON.parse(localStorage.getItem("gt_saved") || "[]"),
  savedItineraries: JSON.parse(localStorage.getItem("gt_itins") || "[]"),
  currentPage: "explore",
  heroSlide: 0,
  heroInterval: null,
};

// =============================================
// INIT
// =============================================
document.addEventListener("DOMContentLoaded", () => {
  applyTheme(state.theme);
  renderHero();
  renderTrending();
  renderPopularDestinations();
  renderDestinationsPage();
  renderBudgetWidget();
  renderGuide("All");
  renderSavedPage();
  updateSavedBadge();
  fetchWeatherWidget("Bali");
  bindEvents();
  startHeroAutoplay();
});

// =============================================
// THEME
// =============================================
function applyTheme(t) {
  document.documentElement.setAttribute("data-theme", t);
  const icon = document.getElementById("themeIcon");
  if (icon) icon.className = t === "dark" ? "fa-solid fa-moon" : "fa-solid fa-sun";
  localStorage.setItem("gt_theme", t);
}

// =============================================
// PAGE NAVIGATION
// =============================================
function showPage(pageId) {
  document.querySelectorAll(".page").forEach(p => p.classList.remove("active"));
  const target = document.getElementById("page-" + pageId);
  if (target) target.classList.add("active");
  document.querySelectorAll(".nav-item").forEach(n => {
    n.classList.toggle("active", n.dataset.page === pageId);
  });
  state.currentPage = pageId;
  document.getElementById("sidebar").classList.remove("open");
  if (pageId === "weather") {
    const city = document.getElementById("weatherCity").value || "Bali";
    fetchWeatherFull(city);
  }
}

// =============================================
// HERO SLIDESHOW
// =============================================
function renderHero() {
  const slidesEl = document.getElementById("heroSlides");
  const dotsEl = document.getElementById("heroDots");
  slidesEl.innerHTML = HERO_SLIDES.map((s, i) =>
    `<div class="hero-slide ${i === 0 ? 'active' : ''}" style="background-image:url('${s.url}')"></div>`
  ).join("");
  dotsEl.innerHTML = HERO_SLIDES.map((_, i) =>
    `<div class="hero-dot ${i === 0 ? 'active' : ''}" onclick="goToSlide(${i})"></div>`
  ).join("");
}

function goToSlide(idx) {
  state.heroSlide = idx;
  document.querySelectorAll(".hero-slide").forEach((s, i) => s.classList.toggle("active", i === idx));
  document.querySelectorAll(".hero-dot").forEach((d, i) => d.classList.toggle("active", i === idx));
}

function startHeroAutoplay() {
  state.heroInterval = setInterval(() => {
    goToSlide((state.heroSlide + 1) % HERO_SLIDES.length);
  }, 4500);
}

// =============================================
// TRENDING SIDEBAR
// =============================================
function renderTrending() {
  const trending = DESTINATIONS.filter(d => d.trending);
  document.getElementById("trendingList").innerHTML = trending.map(d => `
    <div class="trending-item" onclick="openDestModal(${d.id})">
      <img class="trending-img" src="${d.image}" alt="${d.name}" loading="lazy" />
      <div class="trending-info">
        <div class="trending-name">${d.name}</div>
        <div class="trending-rating">★ ${d.rating}</div>
      </div>
    </div>
  `).join("");
}

// =============================================
// DESTINATION CARDS
// =============================================
function renderPopularDestinations() {
  const el = document.getElementById("popularDestinations");
  el.innerHTML = DESTINATIONS.slice(0, 4).map(d => destCardHTML(d)).join("");
}

function renderDestinationsPage(filter = {}) {
  let list = [...DESTINATIONS];
  if (filter.region && filter.region !== "All Countries") list = list.filter(d => d.region === filter.region);
  if (filter.category && filter.category !== "All Categories") list = list.filter(d => d.category === filter.category);
  if (filter.query) {
    const q = filter.query.toLowerCase();
    list = list.filter(d => d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q));
  }
  if (filter.sort === "Sort by: Rating") list.sort((a, b) => b.rating - a.rating);
  else if (filter.sort === "Sort by: Name") list.sort((a, b) => a.name.localeCompare(b.name));

  const el = document.getElementById("destinationsGrid");
  el.innerHTML = list.length
    ? list.map(d => destCardHTML(d, true)).join("")
    : `<div class="empty-state"><i class="fa-solid fa-search"></i><p>No destinations found.</p></div>`;
}

function destCardHTML(d, fullSize = false) {
  const saved = state.savedDestinations.some(s => s.id === d.id);
  return `
    <div class="dest-card" onclick="openDestModal(${d.id})">
      <img class="dest-card-img" src="${d.image}" alt="${d.name}" loading="lazy" />
      <div class="dest-card-overlay"></div>
      <button class="dest-heart-btn ${saved ? 'saved' : ''}"
        onclick="event.stopPropagation(); toggleSave(${d.id})"
        title="${saved ? 'Remove' : 'Save'}">
        <i class="fa-${saved ? 'solid' : 'regular'} fa-heart"></i>
      </button>
      <div class="dest-card-info">
        <div class="dest-card-name">${d.name}</div>
        <div class="dest-card-rating">★ ${d.rating}</div>
        <span class="dest-card-tag">${d.category}</span>
      </div>
    </div>
  `;
}

// =============================================
// DESTINATION MODAL
// =============================================
function openDestModal(id) {
  const d = DESTINATIONS.find(x => x.id === id);
  if (!d) return;
  const saved = state.savedDestinations.some(s => s.id === id);
  const modal = document.getElementById("destModal");
  const content = document.getElementById("destModalContent");
  const mapsEmbedUrl = `https://maps.google.com/maps?q=${encodeURIComponent(d.name)}&output=embed&z=11`;

  content.innerHTML = `
    <div class="modal-hero">
      <img class="modal-hero-img" src="${d.heroImage}" alt="${d.name}" />
      <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
      <div class="modal-hero-info">
        <h2>${d.name}</h2>
        <div class="rating">★ ${d.rating} · ${d.category} · ${d.country}</div>
      </div>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab-btn active" data-mtab="overview">Overview</button>
      <button class="modal-tab-btn" data-mtab="gallery">Gallery</button>
      <button class="modal-tab-btn" data-mtab="nearby">Nearby</button>
      <button class="modal-tab-btn" data-mtab="map">Map</button>
    </div>
    <div class="modal-body" style="padding-top:0">
      <div class="modal-tab-panel active" id="mtab-overview">
        <div class="modal-section">
          <h4>About</h4>
          <p>${d.description}</p>
        </div>
        <div class="modal-section">
          <h4>Famous Attractions</h4>
          <div class="modal-tags">
            ${d.attractions.map(a => `<span class="modal-tag"><i class="fa-solid fa-map-pin" style="color:var(--accent);margin-right:4px;font-size:0.7rem"></i>${a}</span>`).join("")}
          </div>
        </div>
        <div class="modal-section">
          <h4>Local Food</h4>
          <div class="modal-tags">
            ${d.food.map(f => `<span class="modal-tag">🍽 ${f}</span>`).join("")}
          </div>
        </div>
        <div class="modal-section">
          <h4>Travel Tips</h4>
          <div class="modal-grid">
            <div class="modal-grid-item"><i class="fa-solid fa-calendar"></i><span>Best Time: ${d.bestTime}</span></div>
            ${d.tips.map(t => `<div class="modal-grid-item"><i class="fa-solid fa-lightbulb"></i><span>${t}</span></div>`).join("")}
          </div>
        </div>
      </div>
      <div class="modal-tab-panel" id="mtab-gallery">
        <div id="galleryContainer">
          <div class="gallery-loading"><div class="spinner"></div><span>Loading photos...</span></div>
        </div>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:8px;text-align:right">
          Photos from <a href="https://unsplash.com" target="_blank" style="color:var(--accent)">Unsplash</a>
        </p>
      </div>
      <div class="modal-tab-panel" id="mtab-nearby">
        <div class="nearby-grid">${buildNearbyPlaces(d)}</div>
      </div>
      <div class="modal-tab-panel" id="mtab-map">
        <div style="border-radius:var(--radius-md);overflow:hidden;height:280px;">
          <iframe width="100%" height="280"
            style="border:0;border-radius:var(--radius-md);"
            loading="lazy" allowfullscreen
            src="${mapsEmbedUrl}">
          </iframe>
        </div>
        <p style="font-size:0.78rem;color:var(--text-secondary);margin-top:0.75rem">
          <i class="fa-solid fa-map-pin" style="color:var(--accent)"></i>
          Showing map for <strong>${d.name}</strong>
        </p>
      </div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn-primary" onclick="planFromDest('${d.name}')">
          <i class="fa-solid fa-map"></i> Plan Itinerary
        </button>
        <button class="btn-secondary" id="modalSaveBtn" onclick="toggleSave(${d.id}); updateModalSaveBtn(${d.id})">
          <i class="fa-${saved ? 'solid' : 'regular'} fa-heart"></i>
          ${saved ? 'Saved' : 'Save Trip'}
        </button>
        <button class="btn-secondary" onclick="closeModal()">
          <i class="fa-solid fa-xmark"></i> Close
        </button>
      </div>
    </div>
  `;

  content.querySelectorAll(".modal-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      content.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
      content.querySelectorAll(".modal-tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById("mtab-" + btn.dataset.mtab)?.classList.add("active");
      if (btn.dataset.mtab === "gallery") loadGallery(d.name);
    });
  });

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

function updateModalSaveBtn(id) {
  const saved = state.savedDestinations.some(s => s.id === id);
  const btn = document.getElementById("modalSaveBtn");
  if (btn) btn.innerHTML = `<i class="fa-${saved ? 'solid' : 'regular'} fa-heart"></i> ${saved ? 'Saved' : 'Save Trip'}`;
}

function closeModal() {
  document.getElementById("destModal").classList.remove("open");
  document.body.style.overflow = "";
}

function planFromDest(name) {
  closeModal();
  showPage("itinerary");
  const sel = document.getElementById("itinDest");
  if (sel) sel.value = name;
}

// =============================================
// UNSPLASH — REAL API CALL
// =============================================
async function loadGallery(destName) {
  const container = document.getElementById("galleryContainer");
  if (!container) return;
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(destName)}&per_page=9&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${CONFIG.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) throw new Error("Unsplash error");
    const data = await res.json();
    if (!data.results.length) {
      container.innerHTML = `<div class="gallery-loading">No photos found for ${destName}</div>`;
      return;
    }
    container.innerHTML = `
      <div class="gallery-grid">
        ${data.results.map(p => `
          <img class="gallery-img" src="${p.urls.small}"
            alt="${p.alt_description || destName}" loading="lazy"
            onclick="window.open('${p.links.html}', '_blank')"
            title="Photo by ${p.user.name} on Unsplash" />
        `).join("")}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<div class="gallery-loading">⚠️ Could not load photos.</div>`;
  }
}

// =============================================
// NEARBY PLACES
// =============================================
const NEARBY_DATA = {
  "Bali, Indonesia": [
    { name: "Ku De Ta", type: "Restaurant", rating: "4.7", icon: "fa-utensils" },
    { name: "Seminyak Square", type: "Shopping", rating: "4.3", icon: "fa-bag-shopping" },
    { name: "Potato Head Beach Club", type: "Bar/Club", rating: "4.6", icon: "fa-martini-glass" },
    { name: "Alaya Resort Ubud", type: "Hotel", rating: "4.8", icon: "fa-bed" },
    { name: "Sacred Monkey Forest", type: "Attraction", rating: "4.5", icon: "fa-tree" },
    { name: "Naughty Nuri's Warung", type: "Restaurant", rating: "4.4", icon: "fa-utensils" },
  ],
  "Paris, France": [
    { name: "Le Jules Verne", type: "Restaurant", rating: "4.8", icon: "fa-utensils" },
    { name: "Café de Flore", type: "Café", rating: "4.5", icon: "fa-mug-hot" },
    { name: "Galeries Lafayette", type: "Shopping", rating: "4.6", icon: "fa-bag-shopping" },
    { name: "Le Bristol Paris", type: "Hotel", rating: "4.9", icon: "fa-bed" },
    { name: "Musée d'Orsay", type: "Museum", rating: "4.8", icon: "fa-building-columns" },
    { name: "Shakespeare & Company", type: "Bookshop", rating: "4.7", icon: "fa-book" },
  ],
  "Tokyo, Japan": [
    { name: "Sukiyabashi Jiro", type: "Restaurant", rating: "4.9", icon: "fa-utensils" },
    { name: "Shibuya 109", type: "Shopping", rating: "4.4", icon: "fa-bag-shopping" },
    { name: "Park Hyatt Tokyo", type: "Hotel", rating: "4.8", icon: "fa-bed" },
    { name: "Senso-ji Temple", type: "Attraction", rating: "4.7", icon: "fa-torii-gate" },
    { name: "Fuglen Tokyo", type: "Café", rating: "4.6", icon: "fa-mug-hot" },
    { name: "TeamLab Planets", type: "Museum", rating: "4.8", icon: "fa-building-columns" },
  ],
  "default": [
    { name: "Local Restaurant", type: "Restaurant", rating: "4.5", icon: "fa-utensils" },
    { name: "City Hotel", type: "Hotel", rating: "4.3", icon: "fa-bed" },
    { name: "Coffee House", type: "Café", rating: "4.4", icon: "fa-mug-hot" },
    { name: "Tourist Center", type: "Attraction", rating: "4.6", icon: "fa-map-pin" },
    { name: "Local Market", type: "Shopping", rating: "4.2", icon: "fa-bag-shopping" },
    { name: "City Park", type: "Nature", rating: "4.5", icon: "fa-tree" },
  ]
};

function buildNearbyPlaces(d) {
  const places = NEARBY_DATA[d.name] || NEARBY_DATA["default"];
  return places.map(p => `
    <div class="nearby-card">
      <div class="nearby-icon"><i class="fa-solid ${p.icon}"></i></div>
      <div>
        <div class="nearby-name">${p.name}</div>
        <div class="nearby-type">${p.type}</div>
        <div class="nearby-rating">★ ${p.rating}</div>
      </div>
    </div>
  `).join("");
}

// =============================================
// SAVE / UNSAVE
// =============================================
function toggleSave(id) {
  const dest = DESTINATIONS.find(d => d.id === id);
  if (!dest) return;
  const idx = state.savedDestinations.findIndex(d => d.id === id);
  if (idx === -1) {
    state.savedDestinations.push(dest);
    showToast(`❤️ ${dest.name} saved!`);
  } else {
    state.savedDestinations.splice(idx, 1);
    showToast(`💔 ${dest.name} removed`);
  }
  localStorage.setItem("gt_saved", JSON.stringify(state.savedDestinations));
  updateSavedBadge();
  renderSavedPage();
  document.querySelectorAll(".dest-heart-btn").forEach(btn => {
    const onclickVal = btn.getAttribute("onclick");
    const match = onclickVal?.match(/toggleSave\((\d+)\)/);
    if (match && parseInt(match[1]) === id) {
      const isSaved = state.savedDestinations.some(s => s.id === id);
      btn.className = `dest-heart-btn ${isSaved ? 'saved' : ''}`;
      btn.innerHTML = `<i class="fa-${isSaved ? 'solid' : 'regular'} fa-heart"></i>`;
    }
  });
}

function updateSavedBadge() {
  const badge = document.getElementById("savedBadge");
  if (badge) badge.textContent = state.savedDestinations.length;
}

function renderSavedPage() {
  const grid = document.getElementById("savedDestGrid");
  if (grid) {
    grid.innerHTML = state.savedDestinations.length
      ? state.savedDestinations.map(d => destCardHTML(d, true)).join("")
      : `<div class="empty-state"><i class="fa-regular fa-heart"></i><p>No saved destinations yet!</p></div>`;
  }
  const itinList = document.getElementById("savedItinList");
  if (itinList) {
    itinList.innerHTML = state.savedItineraries.length
      ? state.savedItineraries.map((itin, i) => `
          <div class="widget-card" style="margin: 0 1.75rem 1rem; max-width:600px">
            <div class="widget-title">
              <i class="fa-solid fa-map"></i>
              <span>${itin.dest} — ${itin.days} Days (${itin.budget})</span>
              <button onclick="deleteSavedItin(${i})" style="margin-left:auto;background:none;border:none;color:var(--danger);cursor:pointer">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
            <p style="font-size:0.8rem;color:var(--text-muted);margin-top:4px">Saved ${new Date(itin.savedAt).toLocaleDateString()}</p>
          </div>
        `).join("")
      : `<div class="empty-state"><i class="fa-solid fa-map"></i><p>No saved itineraries yet!</p></div>`;
  }
}

function deleteSavedItin(idx) {
  state.savedItineraries.splice(idx, 1);
  localStorage.setItem("gt_itins", JSON.stringify(state.savedItineraries));
  renderSavedPage();
  showToast("Itinerary deleted");
}

// =============================================
// WEATHER — REAL OPENWEATHER API
// =============================================
async function fetchWeatherWidget(city) {
  const el = document.getElementById("miniWeatherContent");
  const cityLabel = document.getElementById("miniWeatherCity");
  if (!el) return;
  el.innerHTML = `<div class="weather-loading"><div class="spinner"></div> Loading...</div>`;
  try {
    const [wRes, fRes] = await Promise.all([
      fetch(`${WEATHER_BASE}/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`),
      fetch(`${WEATHER_BASE}/forecast?q=${city}&appid=${WEATHER_API_KEY}&units=metric&cnt=35`)
    ]);
    if (!wRes.ok) throw new Error("City not found");
    const w = await wRes.json();
    const f = await fRes.json();
    if (cityLabel) cityLabel.textContent = `${w.name}, ${w.sys.country}`;
    const daily = getDailyForecasts(f.list);
    const icon = getWeatherIcon(w.weather[0].id);
    el.innerHTML = `
      <div class="mini-weather-main">
        <span class="weather-icon-big">${icon}</span>
        <div>
          <div class="weather-temp">${Math.round(w.main.temp)}°C</div>
          <div class="weather-desc">${w.weather[0].description}</div>
        </div>
      </div>
      <div class="weather-meta">
        <span>Humidity <strong>${w.main.humidity}%</strong></span>
        <span>Wind <strong>${Math.round(w.wind.speed * 3.6)} km/h</strong></span>
        <span>Feels like <strong>${Math.round(w.main.feels_like)}°C</strong></span>
        <span>Pressure <strong>${w.main.pressure} hPa</strong></span>
      </div>
      <div class="weather-forecast">
        ${daily.slice(0, 5).map(d => `
          <div class="forecast-day">
            <span>${d.day}</span>
            <span class="f-icon">${getWeatherIcon(d.code)}</span>
            <span class="f-temp">${d.high}°</span>
            <span class="f-low">${d.low}°</span>
          </div>
        `).join("")}
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="weather-loading">⚠️ ${err.message}. Check your API key.</div>`;
  }
}

async function fetchWeatherFull(city) {
  const el = document.getElementById("weatherResult");
  if (!el) return;
  el.innerHTML = `<div class="weather-loading"><div class="spinner"></div> Fetching weather for ${city}...</div>`;
  try {
    const [wRes, fRes] = await Promise.all([
      fetch(`${WEATHER_BASE}/weather?q=${city}&appid=${WEATHER_API_KEY}&units=metric`),
      fetch(`${WEATHER_BASE}/forecast?q=${city}&appid=${WEATHER_API_KEY}&units=metric&cnt=35`)
    ]);
    if (!wRes.ok) throw new Error("City not found");
    const w = await wRes.json();
    const f = await fRes.json();
    const daily = getDailyForecasts(f.list);
    const icon = getWeatherIcon(w.weather[0].id);
    const now = new Date();
    el.innerHTML = `
      <div class="weather-main-card">
        <div class="weather-city-name">${w.name}, ${w.sys.country}</div>
        <div class="weather-date">${now.toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })}</div>
        <div class="weather-big-row">
          <span class="weather-icon-xl">${icon}</span>
          <div>
            <div class="weather-temp-xl">${Math.round(w.main.temp)}°C</div>
            <div class="weather-desc-lg">${w.weather[0].description}</div>
          </div>
        </div>
        <div class="weather-stats">
          <div class="weather-stat"><div class="weather-stat-label">Humidity</div><div class="weather-stat-val">${w.main.humidity}%</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Wind</div><div class="weather-stat-val">${Math.round(w.wind.speed * 3.6)} km/h</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Feels Like</div><div class="weather-stat-val">${Math.round(w.main.feels_like)}°C</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Pressure</div><div class="weather-stat-val">${w.main.pressure} hPa</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Visibility</div><div class="weather-stat-val">${(w.visibility/1000).toFixed(1)} km</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Clouds</div><div class="weather-stat-val">${w.clouds.all}%</div></div>
        </div>
        <div class="forecast-row">
          ${daily.slice(0, 5).map(d => `
            <div class="forecast-item">
              <div class="forecast-item-day">${d.day}</div>
              <div class="forecast-item-icon">${getWeatherIcon(d.code)}</div>
              <div class="forecast-item-high">${d.high}°</div>
              <div class="forecast-item-low">${d.low}°</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="weather-loading">⚠️ Could not find "${city}". Try another city name.</div>`;
  }
}

function getDailyForecasts(list) {
  const map = {};
  list.forEach(item => {
    const date = new Date(item.dt * 1000);
    const key = date.toDateString();
    if (!map[key]) {
      map[key] = { day: DAYS[date.getDay()], high: item.main.temp_max, low: item.main.temp_min, code: item.weather[0].id };
    } else {
      map[key].high = Math.max(map[key].high, item.main.temp_max);
      map[key].low = Math.min(map[key].low, item.main.temp_min);
    }
  });
  return Object.values(map).map(d => ({ ...d, high: Math.round(d.high), low: Math.round(d.low) }));
}

// =============================================
// ITINERARY GENERATOR
// =============================================
function renderItinerary() {
  const dest = document.getElementById("itinDest").value;
  const days = parseInt(document.getElementById("itinDays").value) || 5;
  const travelers = document.getElementById("itinTravelers").value;
  const budget = document.getElementById("itinBudget").value;
  const templates = ITINERARY_DATA[dest] || ITINERARY_DATA["default"];
  const plan = [...templates];
  while (plan.length < days) plan.push({ ...ITINERARY_DATA["default"][plan.length % ITINERARY_DATA["default"].length] });
  const finalPlan = plan.slice(0, days);
  document.getElementById("itineraryResult").innerHTML = `
    <div class="itin-header">
      <div>
        <h3>${dest}</h3>
        <p>${days} days · ${travelers} · ${budget} budget</p>
      </div>
      <button class="itin-save-btn" onclick="saveItinerary('${dest}', ${days}, '${travelers}', '${budget}')">
        <i class="fa-solid fa-bookmark"></i> Save
      </button>
    </div>
    ${finalPlan.map((day, i) => `
      <div class="itin-day">
        <div class="itin-day-num">${i + 1}</div>
        <div class="itin-day-content">
          <div class="itin-day-title">${day.title}</div>
          <div class="itin-day-desc">${day.desc}</div>
        </div>
        <img class="itin-day-img" src="${day.img}" alt="Day ${i + 1}" loading="lazy" />
      </div>
    `).join("")}
  `;
}

function saveItinerary(dest, days, travelers, budget) {
  state.savedItineraries.unshift({ dest, days, travelers, budget, savedAt: Date.now() });
  localStorage.setItem("gt_itins", JSON.stringify(state.savedItineraries));
  renderSavedPage();
  showToast("✅ Itinerary saved!");
}

// =============================================
// BUDGET CALCULATOR
// =============================================
function renderBudgetWidget() {
  const rows = [
    { icon: "fa-bed", label: "Accommodation", val: 450 },
    { icon: "fa-utensils", label: "Food", val: 250 },
    { icon: "fa-car", label: "Transport", val: 200 },
    { icon: "fa-ticket", label: "Activities", val: 100 },
  ];
  const el = document.getElementById("quickBudgetRows");
  if (el) el.innerHTML = rows.map(r => `
    <div class="budget-row">
      <div class="budget-row-left"><i class="fa-solid ${r.icon}"></i>${r.label}</div>
      <div class="budget-row-right">$${r.val}</div>
    </div>
  `).join("");
}

function calculateBudget() {
  const dest = document.getElementById("budgetDest").value;
  const days = parseInt(document.getElementById("budgetDays").value);
  const travelers = document.getElementById("budgetTravelers").value;
  const style = document.getElementById("budgetStyle").value;
  const currency = document.getElementById("budgetCurrency").value;
  const travelerMap = { "Solo": 1, "2 Adults": 2, "Family (4)": 4, "Group (6+)": 6 };
  const mult = travelerMap[travelers] || 1;
  const rates = BUDGET_RATES[dest] || BUDGET_RATES["default"];
  const [acc, food, trans, act] = rates[style] || rates["Medium"];
  const symbols = { "USD ($)": "$", "EUR (€)": "€", "INR (₹)": "₹", "GBP (£)": "£" };
  const conversions = { "USD ($)": 1, "EUR (€)": 0.92, "INR (₹)": 83.5, "GBP (£)": 0.79 };
  const sym = symbols[currency] || "$";
  const conv = conversions[currency] || 1;
  const totals = [acc * days * mult, food * days * mult, trans * days * mult, act * days * mult];
  const grand = totals.reduce((a, b) => a + b, 0);
  const misc = grand * 0.1;
  const fmt = n => sym + Math.round(n * conv).toLocaleString();
  const rows = [
    { icon: "fa-bed", label: "Accommodation", val: totals[0] },
    { icon: "fa-utensils", label: "Food & Dining", val: totals[1] },
    { icon: "fa-car", label: "Transport", val: totals[2] },
    { icon: "fa-ticket", label: "Activities", val: totals[3] },
    { icon: "fa-shield-halved", label: "Miscellaneous", val: misc },
  ];
  document.getElementById("budgetBreakdown").innerHTML = rows.map(r => `
    <div class="budget-row" style="padding:8px 0;border-bottom:1px solid var(--border);flex-direction:column;align-items:stretch;gap:4px">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div class="budget-row-left"><i class="fa-solid ${r.icon}"></i>${r.label}</div>
        <div class="budget-row-right">${fmt(r.val)}</div>
      </div>
      <div class="budget-bar-wrap">
        <div class="budget-bar" style="width:${Math.round(r.val / (grand + misc) * 100)}%"></div>
      </div>
    </div>
  `).join("");
  document.getElementById("budgetGrandTotal").textContent = fmt(grand + misc);
  document.getElementById("budgetDaysLabel").textContent = `(${days} Days)`;
  showToast(`💰 Budget calculated for ${dest}!`);
}

// =============================================
// TRAVEL GUIDE
// =============================================
function renderGuide(activeTag) {
  const list = activeTag === "All" ? GUIDE_ARTICLES : GUIDE_ARTICLES.filter(a => a.tag === activeTag);
  document.getElementById("guideGrid").innerHTML = list.map(a => `
    <div class="guide-card">
      <img class="guide-card-img" src="${a.img}" alt="${a.title}" loading="lazy" />
      <div class="guide-card-body">
        <div class="guide-tag">${a.tag}</div>
        <div class="guide-card-title">${a.title}</div>
        <div class="guide-card-desc">${a.desc}</div>
        <span class="guide-read-more">Read More →</span>
      </div>
    </div>
  `).join("");
}

// =============================================
// TOAST
// =============================================
function showToast(msg) {
  const toast = document.getElementById("toast");
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 3000);
}

// =============================================
// AUTOCOMPLETE
// =============================================
let autocompleteTimer = null;

function initAutocomplete() {
  const input = document.getElementById("globalSearch");
  if (!input) return;
  input.addEventListener("input", (e) => {
    clearTimeout(autocompleteTimer);
    const query = e.target.value.trim();
    if (query.length < 2) { removeDropdown(); return; }
    autocompleteTimer = setTimeout(() => showSuggestions(query), 300);
  });
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) removeDropdown();
  });
}

function showSuggestions(query) {
  removeDropdown();
  const q = query.toLowerCase();
  const matches = DESTINATIONS.filter(d =>
    d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
  ).slice(0, 5);
  if (!matches.length) return;
  const dropdown = document.createElement("div");
  dropdown.className = "autocomplete-dropdown";
  dropdown.id = "autocompleteDropdown";
  dropdown.innerHTML = matches.map(d => `
    <div class="autocomplete-item" onclick="openDestModal(${d.id}); removeDropdown()">
      <img class="autocomplete-img" src="${d.image}" alt="${d.name}" />
      <div class="autocomplete-info">
        <div class="autocomplete-name">${d.name}</div>
        <div class="autocomplete-meta">${d.country} · ${d.category}</div>
      </div>
      <div class="autocomplete-rating">★ ${d.rating}</div>
    </div>
  `).join("");
  const searchBox = document.querySelector(".search-box");
  searchBox?.parentNode?.insertBefore(dropdown, searchBox.nextSibling);
}

function removeDropdown() {
  document.getElementById("autocompleteDropdown")?.remove();
}

// =============================================
// SCROLL TO TOP
// =============================================
function initScrollTop() {
  const btn = document.createElement("button");
  btn.className = "scroll-top";
  btn.innerHTML = `<i class="fa-solid fa-arrow-up"></i>`;
  btn.onclick = () => window.scrollTo({ top: 0, behavior: "smooth" });
  document.body.appendChild(btn);
  window.addEventListener("scroll", () => btn.classList.toggle("visible", window.scrollY > 300));
}

// =============================================
// DYNAMIC SEARCH — ANY DESTINATION IN THE WORLD
// =============================================
async function searchAnyDestination(query) {
  if (!query.trim()) return;
  removeDropdown();
  const q = query.toLowerCase();
  const existing = DESTINATIONS.find(d =>
    d.name.toLowerCase().includes(q) || d.country.toLowerCase().includes(q)
  );
  if (existing) {
    openDestModal(existing.id);
    return;
  }
  // Reset filters
  const filterCategory = document.getElementById("filterCategory");
  const filterCountry = document.getElementById("filterCountry");
  if (filterCategory) filterCategory.value = "All Categories";
  if (filterCountry) filterCountry.value = "All Countries";
  showPage("destinations");
  await showDynamicSearchResult(query);
}

async function showDynamicSearchResult(query) {
  const grid = document.getElementById("destinationsGrid");
  if (!grid) return;

  grid.innerHTML = `
    <div style="grid-column:1/-1">
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.5rem;padding:0 0 1rem;border-bottom:1px solid var(--border)">
        <i class="fa-solid fa-magnifying-glass" style="color:var(--accent)"></i>
        <span style="font-size:1rem;font-weight:600;font-family:'Poppins',sans-serif">
          Search results for "<strong>${query}</strong>"
        </span>
      </div>
    </div>
    <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div></div>
    <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div></div>
    <div class="skeleton-card"><div class="skeleton skeleton-img"></div><div class="skeleton skeleton-line"></div><div class="skeleton skeleton-line-sm"></div></div>
  `;

  try {
    const [photos, weather] = await Promise.all([
      fetchUnsplashSearch(query),
      fetchWeatherSearch(query)
    ]);

    if (!photos.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1">
          <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.5rem;padding:0 0 1rem;border-bottom:1px solid var(--border)">
            <i class="fa-solid fa-magnifying-glass" style="color:var(--accent)"></i>
            <span style="font-size:1rem;font-weight:600;font-family:'Poppins',sans-serif">
              Search results for "<strong>${query}</strong>"
            </span>
          </div>
        </div>
        <div class="empty-state" style="grid-column:1/-1">
          <i class="fa-solid fa-map-location-dot"></i>
          <p>No results found for "${query}". Try a different name!</p>
        </div>
      `;
      return;
    }

    const cards = photos.slice(0, 6).map((photo, i) => `
      <div class="dest-card" onclick="openDynamicModal('${encodeURIComponent(query)}', '${photo.urls.regular}', '${photo.urls.full}', '${photo.user.name}')">
        <img class="dest-card-img" src="${photo.urls.regular}" alt="${query}" loading="lazy" />
        <div class="dest-card-overlay"></div>
        <div class="dest-card-info">
          <div class="dest-card-name">${query}</div>
          ${weather && i === 0 ? `<div class="dest-card-rating">${getWeatherIcon(weather.weather[0].id)} ${Math.round(weather.main.temp)}°C</div>` : '<div class="dest-card-rating">🌍 Explore</div>'}
          <span class="dest-card-tag">Discovery</span>
        </div>
      </div>
    `).join("");

    grid.innerHTML = `
      <div style="grid-column:1/-1">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:1.5rem;padding:0 0 1rem;border-bottom:1px solid var(--border)">
          <i class="fa-solid fa-magnifying-glass" style="color:var(--accent)"></i>
          <span style="font-size:1rem;font-weight:600;font-family:'Poppins',sans-serif">
            Search results for "<strong>${query}</strong>" — ${photos.length} photos found
          </span>
        </div>
        ${weather ? `
        <div class="widget-card" style="margin-bottom:1.5rem;max-width:400px">
          <div class="widget-title">
            <i class="fa-solid fa-cloud-sun"></i>
            <span>Current Weather in ${weather.name}, ${weather.sys.country}</span>
          </div>
          <div style="display:flex;align-items:center;gap:16px;margin-top:0.5rem">
            <span style="font-size:2.5rem">${getWeatherIcon(weather.weather[0].id)}</span>
            <div>
              <div style="font-size:1.8rem;font-weight:700;font-family:'Poppins',sans-serif">${Math.round(weather.main.temp)}°C</div>
              <div style="font-size:0.85rem;color:var(--text-secondary)">${weather.weather[0].description} · Humidity ${weather.main.humidity}%</div>
            </div>
          </div>
        </div>
        ` : ''}
      </div>
      ${cards}
    `;
  } catch (err) {
    grid.innerHTML = `
      <div class="empty-state" style="grid-column:1/-1">
        <i class="fa-solid fa-triangle-exclamation"></i>
        <p>Something went wrong. Please try again!</p>
      </div>
    `;
  }
}

async function fetchUnsplashSearch(query) {
  try {
    const res = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=9&orientation=landscape`,
      { headers: { Authorization: `Client-ID ${CONFIG.UNSPLASH_ACCESS_KEY}` } }
    );
    if (!res.ok) throw new Error("Unsplash error");
    const data = await res.json();
    return data.results || [];
  } catch (err) {
    return [];
  }
}

async function fetchWeatherSearch(query) {
  try {
    const res = await fetch(
      `${WEATHER_BASE}/weather?q=${encodeURIComponent(query)}&appid=${WEATHER_API_KEY}&units=metric`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (err) {
    return null;
  }
}

function openDynamicModal(encodedQuery, imgUrl, fullImgUrl, photographer) {
  const query = decodeURIComponent(encodedQuery);
  const modal = document.getElementById("destModal");
  const content = document.getElementById("destModalContent");
  const mapsUrl = `https://maps.google.com/maps?q=${encodedQuery}&output=embed&z=11`;

  content.innerHTML = `
    <div class="modal-hero">
      <img class="modal-hero-img" src="${fullImgUrl}" alt="${query}" />
      <button class="modal-close" onclick="closeModal()"><i class="fa-solid fa-xmark"></i></button>
      <div class="modal-hero-info">
        <h2>${query}</h2>
        <div class="rating">📍 Dynamic Search Result</div>
      </div>
    </div>
    <div class="modal-tabs">
      <button class="modal-tab-btn active" data-mtab="overview">Overview</button>
      <button class="modal-tab-btn" data-mtab="gallery">Gallery</button>
      <button class="modal-tab-btn" data-mtab="weather">Weather</button>
      <button class="modal-tab-btn" data-mtab="map">Map</button>
    </div>
    <div class="modal-body" style="padding-top:0">
      <div class="modal-tab-panel active" id="mtab-overview">
        <div class="modal-section">
          <h4>About</h4>
          <p>You searched for <strong>${query}</strong>. Explore real photos, live weather, and an interactive map of this destination using our API integrations.</p>
        </div>
        <div class="modal-section">
          <h4>Photo Credit</h4>
          <p>Photos by <strong>${photographer}</strong> on Unsplash</p>
        </div>
        <div class="modal-section">
          <h4>Explore More</h4>
          <div class="modal-tags">
            <a href="https://en.wikipedia.org/wiki/${encodedQuery}" target="_blank" class="modal-tag" style="cursor:pointer">📖 Wikipedia</a>
            <a href="https://www.google.com/search?q=${encodedQuery}+travel+guide" target="_blank" class="modal-tag" style="cursor:pointer">🔍 Travel Guide</a>
          </div>
        </div>
      </div>
      <div class="modal-tab-panel" id="mtab-gallery">
        <div id="galleryContainer">
          <div class="gallery-loading"><div class="spinner"></div><span>Loading photos of ${query}...</span></div>
        </div>
        <p style="font-size:0.68rem;color:var(--text-muted);margin-top:8px;text-align:right">
          Photos from <a href="https://unsplash.com" target="_blank" style="color:var(--accent)">Unsplash</a>
        </p>
      </div>
      <div class="modal-tab-panel" id="mtab-weather">
        <div id="dynamicWeatherResult">
          <div class="weather-loading"><div class="spinner"></div><span>Loading weather for ${query}...</span></div>
        </div>
      </div>
      <div class="modal-tab-panel" id="mtab-map">
        <div style="border-radius:var(--radius-md);overflow:hidden;height:280px;">
          <iframe width="100%" height="280"
            style="border:0;border-radius:var(--radius-md);"
            loading="lazy" allowfullscreen
            src="${mapsUrl}">
          </iframe>
        </div>
      </div>
      <div class="modal-actions" style="margin-top:1rem">
        <button class="btn-primary" onclick="showPage('itinerary')">
          <i class="fa-solid fa-map"></i> Plan Itinerary
        </button>
        <button class="btn-secondary" id="dynamicSaveBtn" onclick="saveDynamicDest('${query}', '${imgUrl}')">
          <i class="fa-regular fa-heart"></i> Save Trip
        </button>
        <button class="btn-secondary" onclick="closeModal()">
          <i class="fa-solid fa-xmark"></i> Close
        </button>
      </div>
    </div>
  `;

  content.querySelectorAll(".modal-tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      content.querySelectorAll(".modal-tab-btn").forEach(b => b.classList.remove("active"));
      content.querySelectorAll(".modal-tab-panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      const tabId = "mtab-" + btn.dataset.mtab;
      document.getElementById(tabId)?.classList.add("active");
      if (btn.dataset.mtab === "gallery") loadGallery(query);
      if (btn.dataset.mtab === "weather") loadDynamicWeather(query);
    });
  });

  modal.classList.add("open");
  document.body.style.overflow = "hidden";
}

async function loadDynamicWeather(query) {
  const el = document.getElementById("dynamicWeatherResult");
  if (!el) return;
  try {
    const res = await fetch(`${WEATHER_BASE}/weather?q=${encodeURIComponent(query)}&appid=${WEATHER_API_KEY}&units=metric`);
    if (!res.ok) throw new Error("City not found");
    const w = await res.json();
    const fRes = await fetch(`${WEATHER_BASE}/forecast?q=${encodeURIComponent(query)}&appid=${WEATHER_API_KEY}&units=metric&cnt=35`);
    const f = await fRes.json();
    const daily = getDailyForecasts(f.list);
    const icon = getWeatherIcon(w.weather[0].id);
    el.innerHTML = `
      <div class="weather-main-card">
        <div class="weather-city-name">${w.name}, ${w.sys.country}</div>
        <div class="weather-big-row" style="margin:1rem 0">
          <span class="weather-icon-xl">${icon}</span>
          <div>
            <div class="weather-temp-xl">${Math.round(w.main.temp)}°C</div>
            <div class="weather-desc-lg">${w.weather[0].description}</div>
          </div>
        </div>
        <div class="weather-stats">
          <div class="weather-stat"><div class="weather-stat-label">Humidity</div><div class="weather-stat-val">${w.main.humidity}%</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Wind</div><div class="weather-stat-val">${Math.round(w.wind.speed * 3.6)} km/h</div></div>
          <div class="weather-stat"><div class="weather-stat-label">Feels Like</div><div class="weather-stat-val">${Math.round(w.main.feels_like)}°C</div></div>
        </div>
        <div class="forecast-row">
          ${daily.slice(0, 5).map(d => `
            <div class="forecast-item">
              <div class="forecast-item-day">${d.day}</div>
              <div class="forecast-item-icon">${getWeatherIcon(d.code)}</div>
              <div class="forecast-item-high">${d.high}°</div>
              <div class="forecast-item-low">${d.low}°</div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  } catch (err) {
    el.innerHTML = `<div class="weather-loading">⚠️ Weather not found for "${query}".</div>`;
  }
}

// =============================================
// SAVE DYNAMIC DESTINATION
// =============================================
function saveDynamicDest(name, img) {
  const alreadySaved = state.savedDestinations.some(d => d.name === name);
  if (alreadySaved) {
    state.savedDestinations = state.savedDestinations.filter(d => d.name !== name);
    localStorage.setItem("gt_saved", JSON.stringify(state.savedDestinations));
    updateSavedBadge();
    renderSavedPage();
    const btn = document.getElementById("dynamicSaveBtn");
    if (btn) btn.innerHTML = '<i class="fa-regular fa-heart"></i> Save Trip';
    showToast("💔 " + name + " removed from saved trips");
    return;
  }
  const dynamicDest = {
    id: name.toLowerCase().replace(/\s+/g, '_'),
    name: name,
    image: img,
    heroImage: img,
    rating: "N/A",
    category: "Discovery",
    country: "",
    description: "Searched destination: " + name,
    attractions: [], food: [], tips: [], bestTime: "Year round"
  };
  state.savedDestinations.push(dynamicDest);
  localStorage.setItem("gt_saved", JSON.stringify(state.savedDestinations));
  updateSavedBadge();
  renderSavedPage();
  const btn = document.getElementById("dynamicSaveBtn");
  if (btn) btn.innerHTML = '<i class="fa-solid fa-heart"></i> Saved!';
  showToast("❤️ " + name + " saved to My Trips!");
}

// =============================================
// BIND ALL EVENTS — SINGLE PLACE, NO DUPLICATES
// =============================================
function bindEvents() {
  document.getElementById("themeToggle").addEventListener("click", () => {
    state.theme = state.theme === "light" ? "dark" : "light";
    applyTheme(state.theme);
  });

  document.getElementById("menuToggle").addEventListener("click", () => {
    document.getElementById("sidebar").classList.toggle("open");
  });

  document.querySelectorAll(".nav-item").forEach(item => {
    item.addEventListener("click", (e) => { e.preventDefault(); showPage(item.dataset.page); });
  });

  // *** FIXED: search now calls searchAnyDestination ***
  document.getElementById("globalSearch").addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      searchAnyDestination(e.target.value);
    }
    if (e.key === "Escape") removeDropdown();
  });

  document.getElementById("searchBtn").addEventListener("click", () => {
    searchAnyDestination(document.getElementById("globalSearch").value);
  });

  ["filterCountry", "filterCategory", "filterSort"].forEach(id => {
    document.getElementById(id)?.addEventListener("change", () => {
      renderDestinationsPage({
        region: document.getElementById("filterCountry").value,
        category: document.getElementById("filterCategory").value,
        sort: document.getElementById("filterSort").value,
        query: document.getElementById("destSearch").value,
      });
    });
  });

  document.getElementById("destSearch")?.addEventListener("input", (e) => {
    renderDestinationsPage({ query: e.target.value });
  });

  document.getElementById("quickItineraryBtn")?.addEventListener("click", () => {
    const dest = document.getElementById("quickDest").value;
    if (!dest) { showToast("Please select a destination first!"); return; }
    showPage("itinerary");
    document.getElementById("itinDest").value = dest;
  });

  document.getElementById("generateItinBtn")?.addEventListener("click", renderItinerary);

  document.getElementById("weatherSearchBtn")?.addEventListener("click", () => {
    fetchWeatherFull(document.getElementById("weatherCity").value);
  });
  document.getElementById("weatherCity")?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") fetchWeatherFull(e.target.value);
  });

  document.getElementById("calcBudgetBtn")?.addEventListener("click", calculateBudget);

  document.getElementById("destModal")?.addEventListener("click", (e) => {
    if (e.target === document.getElementById("destModal")) closeModal();
  });

  document.querySelectorAll("[data-tab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-tab]").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach(t => t.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(btn.dataset.tab)?.classList.add("active");
    });
  });

  document.querySelectorAll("[data-gtab]").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll("[data-gtab]").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderGuide(btn.dataset.gtab);
    });
  });

  document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

  initAutocomplete();
  initScrollTop();
}