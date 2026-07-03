const screenEl = document.querySelector("#screen");
const hudLabel = document.querySelector("#hudLabel");
const chapterLabel = document.querySelector("#chapterLabel");
const fxCanvas = document.querySelector("#fxCanvas");
const princessTemplate = document.querySelector("#princessTemplate");
const ctx = fxCanvas.getContext("2d");

const state = {
  route: "boot",
  selectedDate: 12,
  selectedTime: "19:30",
  plan: null,
  sushiAsks: 0,
  particles: [],
  hearts: [],
  reduced: window.matchMedia("(prefers-reduced-motion: reduce)").matches
};

const sleep = (ms) => new Promise((resolve) => window.setTimeout(resolve, state.reduced ? 10 : ms));
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

function setAppHeight() {
  document.documentElement.style.setProperty("--app-height", `${window.innerHeight}px`);
}

function resizeCanvas() {
  setAppHeight();
  const ratio = Math.min(window.devicePixelRatio || 1, 2);
  fxCanvas.width = Math.floor(window.innerWidth * ratio);
  fxCanvas.height = Math.floor(window.innerHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

window.addEventListener("resize", resizeCanvas, { passive: true });
window.addEventListener("orientationchange", resizeCanvas, { passive: true });
resizeCanvas();

function setHud(label, chapter = "Chapter 2") {
  hudLabel.textContent = label;
  chapterLabel.textContent = chapter;
}

function princess(mood = "happy") {
  const node = princessTemplate.content.firstElementChild.cloneNode(true);
  node.classList.add(mood);
  return node.outerHTML;
}

function hero() {
  return `
    <div class="hero" aria-hidden="true">
      <div class="cape"></div>
      <div class="head">
        <div class="cowl-ear left"></div><div class="cowl-ear right"></div>
        <div class="mask-eye left"></div><div class="mask-eye right"></div>
      </div>
      <div class="torso"><div class="sigil"></div></div>
    </div>`;
}

async function transition(render) {
  const current = screenEl.querySelector(".scene");
  if (current) {
    current.classList.add("exit");
    await sleep(360);
  }
  render();
}

function mount(html, hud = "DatingOS v2.0") {
  setHud(hud);
  screenEl.classList.toggle("boot-screen", state.route === "boot");
  screenEl.scrollTop = 0;
  screenEl.scrollLeft = 0;
  if (typeof screenEl.scrollTo === "function") {
    screenEl.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }
  screenEl.innerHTML = html;
  bindActions();
}

function bindActions() {
  screenEl.querySelectorAll("[data-go]").forEach((button) => {
    button.addEventListener("click", () => go(button.dataset.go));
  });
  screenEl.querySelectorAll("[data-plan]").forEach((button) => {
    button.addEventListener("click", () => {
      state.plan = button.dataset.plan;
      button.classList.add("selected");
      go(button.dataset.next);
    });
  });
  screenEl.querySelectorAll("[data-date]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedDate = Number(button.dataset.date);
      renderCalendar();
    });
  });
  screenEl.querySelectorAll("[data-time]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedTime = button.dataset.time;
      renderCalendar();
    });
  });
}

async function go(route) {
  state.route = route;
  const routes = {
    results: renderResults,
    menu: renderMenu,
    coffee: renderCoffee,
    coffeeTravel: renderCoffeeTravel,
    grill: renderGrill,
    sushi: renderSushi,
    sideSunset: () => renderSideQuest("sunset"),
    sideHowl: () => renderSideQuest("howl"),
    calendar: renderCalendar,
    final: renderFinal
  };
  await transition(routes[route] || renderMenu);
}

async function typeLine(container, text, progress) {
  const row = document.createElement("div");
  row.className = "terminal-line";
  row.textContent = "> ";
  const cursor = document.createElement("span");
  cursor.className = "cursor";
  row.appendChild(cursor);
  container.appendChild(row);

  for (const char of text) {
    row.insertBefore(document.createTextNode(char), cursor);
    progress.tick();
    await sleep(18 + Math.random() * 18);
  }
  cursor.remove();
  await sleep(130);
}

function createProgress(totalTicks) {
  const fill = document.querySelector("#bootFill");
  const label = document.querySelector("#bootPercent");
  let ticks = 0;
  return {
    tick() {
      ticks += 1;
      const pct = clamp(Math.round((ticks / totalTicks) * 94), 0, 94);
      fill.style.width = `${pct}%`;
      label.textContent = `${pct}%`;
    },
    async complete() {
      for (let pct = Number(label.textContent.replace("%", "")); pct <= 100; pct += 2) {
        fill.style.width = `${pct}%`;
        label.textContent = `${pct}%`;
        await sleep(18);
      }
    }
  };
}

async function renderBoot() {
  mount(`
    <div class="scene">
      <article class="glass boot-card">
        <div class="boot-top">
          <div class="boot-logo"><span class="logo-glyph">♥</span><span>DatingOS v2.0</span></div>
          <span class="status-pill">BOOTING</span>
        </div>
        <div class="terminal" id="terminal"></div>
        <div class="boot-progress">
          <div class="boot-meter"><span>Loading</span><strong id="bootPercent">0%</strong></div>
          <div class="loader"><span id="bootFill"></span></div>
        </div>
        <div class="boot-continue" id="bootContinue"><button class="primary" data-go="results">Devam Et</button></div>
      </article>
    </div>`, "Boot sequence");

  const lines = [
    "Searching memories...",
    "Coffee detected.",
    "Lemonade detected.",
    "Laugh counter exceeded.",
    "Eye contact recorded.",
    "Compatibility Engine Started.",
    "Analysis Completed."
  ];
  const totalChars = lines.join("").length + 18;
  const progress = createProgress(totalChars);
  const terminal = document.querySelector("#terminal");

  for (const [index, line] of lines.entries()) {
    await typeLine(terminal, line, progress);
    if (index === 3) burst(10, "spark");
  }
  await progress.complete();

  const ready = document.createElement("div");
  ready.className = "terminal-line ready";
  ready.innerHTML = "> SYSTEM READY <span class=\"cursor\"></span>";
  terminal.appendChild(ready);
  document.querySelector(".status-pill").textContent = "READY";
  document.querySelector("#bootContinue").classList.add("show");

}

function animateNumber(el, target, suffix = "") {
  const start = performance.now();
  const duration = 1000;
  function frame(now) {
    const t = clamp((now - start) / duration, 0, 1);
    const eased = 1 - Math.pow(1 - t, 3);
    el.textContent = `${Math.round(target * eased)}${suffix}`;
    if (t < 1) requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

function renderResults() {
  const stats = [["😊 Gülümseme",100],["☕ Kahve",100],["🍋 Limonata",100],["💬 Sohbet",98],["👀 Göz Teması",90],["😅 Gerginlik",20]];
  mount(`
    <div class="scene">
      <div class="character-zone">${princess("happy")}</div>
      <section class="glass panel">
        <p class="kicker">İlk Buluşma Sonuçları</p><h2>1. Buluşma Başarıyla Tamamlandı</h2>
        <div class="result-grid">
          ${stats.map(([name,value]) => `<div class="stat"><span class="stat-name">${name}</span><strong class="stat-value" data-value="${value}">%0</strong><div class="stat-track"><div class="stat-bar" data-width="${value}"></div></div></div>`).join("")}
        </div>
      </section>
      <div class="score glass"><span>Genel Sonuç</span><strong>10/10</strong></div>
      <p class="dialogue glass">Analiz net: kahve çalıştı, limonata sistemi serinletti, gülüş modülü ise sınırları aştı. Chapter 2 için hazırım.</p>
      <button class="primary" data-go="menu">Devam Et</button>
    </div>`, "Analysis completed");

  requestAnimationFrame(() => {
    document.querySelectorAll(".stat-bar").forEach((bar) => { bar.style.width = `${bar.dataset.width}%`; });
    document.querySelectorAll(".stat-value").forEach((value) => animateNumber(value, Number(value.dataset.value), "%"));
  });
}

function renderMenu() {
  state.sushiAsks = 0;
  mount(`
    <div class="scene">
      <div class="character-zone">${princess("skeptical")}</div>
      <section class="glass panel">
        <p class="kicker">Görev Seçimi</p><h2>İkinci buluşma rotası seç</h2>
        <div class="choice-grid" style="margin-top:18px">
          <button class="choice" data-plan="Kahve" data-next="coffee"><span>☕</span><b>Kahve</b></button>
          <button class="choice" data-plan="Mangal" data-next="grill"><span>🥩</span><b>Sana mangal yapayım</b></button>
          <button class="choice" data-plan="Suşi" data-next="sushi"><span>🍣</span><b>Suşi yiyelim 🤮</b></button>
          <button class="choice" data-go="sideSunset"><span>🌅</span><b>Güneşin batışını izleyelim<small>Mini sahne</small></b></button>
          <button class="choice" data-go="sideHowl"><span>🐺</span><b>Kurtlar İçin Uluma Dersi 101<small>Mini sahne</small></b></button>
        </div>
      </section>
    </div>`, "Mission select");
}

function renderSideQuest(type) {
  const isSunset = type === "sunset";
  mount(`
    <div class="scene">
      <section class="glass panel">
        <p class="kicker">${isSunset ? "Yan Görev" : "Ses Kalibrasyonu"}</p>
        <h2>${isSunset ? "Gün batımı modu açıldı" : "Uluma dersi başladı"}</h2>
        <div class="micro-scene">${isSunset ? `<div class="sunset"></div>` : `<div class="howl"><div class="moon"></div><div class="sound-wave"></div><div class="sound-wave"></div><div class="abstract-wolf"></div></div>`}</div>
        <p class="lead">${isSunset ? "Mor gökyüzü, pembe ufuk, dramatik sessizlik. Sistem bunu romantik ama ana görev dışı olarak işaretledi." : "Auuuu protokolü başarıyla test edildi. Komşularla diplomatik kriz çıkmadan menüye dönüyoruz."}</p>
      </section>
      <button class="primary" data-go="menu">Seçim Ekranına Dön</button>
    </div>`, isSunset ? "Sunset preview" : "Howl lesson");
}

function renderCoffee() {
  mount(`
    <div class="scene">
      <div class="character-zone">${princess("excited")}</div>
      <section class="glass panel">
        <p class="kicker">Kahve Modülü</p><h2>Çekirdek profili seç</h2>
        <div class="choice-grid" style="margin-top:18px">
          <button class="choice" data-plan="Türk Kahvesi" data-next="coffeeTravel"><span>☕</span><b>Türk Kahvesi</b></button>
          <button class="choice" data-plan="Kolombiya" data-next="coffeeTravel"><span>🌎</span><b>Kolombiya</b></button>
          <button class="choice" data-plan="Etiyopya" data-next="coffeeTravel"><span>✨</span><b>Etiyopya</b></button>
        </div>
      </section>
    </div>`, "Coffee module");
}

function renderCoffeeTravel() {
  mount(`
    <div class="scene">
      <section class="glass panel">
        <p class="kicker">${state.plan}</p><h2 class="cinema-line">En kaliteli çekirdekler uzaklardan geliyor...</h2>
        <div class="micro-scene"><div class="coffee-beans"><div class="bean"></div><div class="bean"></div><div class="bean"></div><div class="steam s1"></div><div class="steam s2"></div><div class="steam s3"></div><div class="cup"></div></div></div>
        <p class="lead">Kavrulma derecesi: sinematik. Koku yoğunluğu: hafızaya kaydedildi.</p>
      </section>
      <button class="primary" data-go="calendar">Takvime Geç</button>
    </div>`, "Coffee route");
  burst(16, "spark");
}

function renderGrill() {
  mount(`
    <div class="scene">
      <section class="glass panel">
        <p class="kicker">Mangal Protokolü</p><h2>Rol dağılımı seç</h2>
        <div class="micro-scene"><div class="grill"><div class="grill-base"></div><div class="ember"></div><div class="ember"></div><div class="ember"></div><div class="flame f1"></div><div class="flame f2"></div><div class="flame f3"></div><div class="skewer"><div class="meat"></div><div class="meat"></div><div class="meat"></div></div></div></div>
        <div class="choice-grid">
          <button class="choice" data-plan="Salata" data-next="calendar"><span>🥗</span><b>Salatayı ben yapacağım<small>Vitamin departmanı aktif</small></b></button>
          <button class="choice" data-plan="Keyif" data-next="calendar"><span>😎</span><b>Keyfime bakacağım<small>Denetleme koltuğu ayrıldı</small></b></button>
          <button class="choice" data-plan="Et çevirme" data-next="calendar"><span>🔥</span><b>Eti sen çevir<small>Maşa teslim edildi</small></b></button>
        </div>
      </section>
    </div>`, "Grill route");
}

function renderSushi() {
  const prompts = ["Gerçekten istiyor musun?", "Emin misin? Sistem halen kaçış kapısı sunuyor.", "Bir kez daha soruyorum: suşi mi?"];
  mount(`
    <div class="scene">
      <section class="glass panel">
        <p class="kicker">Suşi Güvenlik Duvarı</p><h2>${prompts[state.sushiAsks] || "Ana menüye dönüyoruz."}</h2>
        <div class="micro-scene"><div class="sushi-loop"><div class="sushi-roll"></div><div class="warning-mark">!</div></div></div>
        <div class="choice-grid two"><button class="mini-choice" id="sushiYes">Evet</button><button class="mini-choice" data-go="menu">Vazgeç</button></div>
      </section>
    </div>`, "Sushi firewall");
  document.querySelector("#sushiYes").addEventListener("click", () => {
    state.sushiAsks += 1;
    if (state.sushiAsks >= 3) { burst(18, "spark"); go("menu"); return; }
    renderSushi();
  });
}

function renderCalendar() {
  const days = Array.from({ length: 21 }, (_, index) => index + 8);
  const times = ["18:00", "18:30", "19:00", "19:30", "20:00", "20:30"];
  mount(`
    <div class="scene">
      <section class="glass panel calendar">
        <div class="calendar-head"><div><p class="kicker">Takvim</p><h2>Planı zamana sabitle</h2></div><span class="month-pill">Temmuz</span></div>
        <div class="days">
          ${["Pzt","Sal","Çar","Per","Cum","Cmt","Paz"].map((day) => `<div class="day day-label">${day}</div>`).join("")}
          ${days.map((day) => `<button class="day ${state.selectedDate === day ? "selected" : ""}" data-date="${day}">${day}</button>`).join("")}
        </div>
        <div class="times">${times.map((time) => `<button class="time ${state.selectedTime === time ? "selected" : ""}" data-time="${time}">${time}</button>`).join("")}</div>
        <p class="lead">Seçili rota: ${state.plan || "Chapter 2"}. Tarih: Temmuz ${state.selectedDate}, saat ${state.selectedTime}.</p>
      </section>
      <button class="primary" data-go="final">Onayla</button>
    </div>`, "Calendar lock");
}

function renderFinal() {
  mount(`
    <div class="scene">
      <div class="duo-zone">${hero()}${princess("excited")}</div>
      <section class="glass panel">
        <p class="kicker">Final</p><h2>İkinci Buluşma Planlandı</h2><p class="lead" style="margin-top:12px">Chapter 2 Completed</p>
      </section>
      <button class="primary" data-go="menu">Yeni Rota Dene</button>
    </div>`, "Chapter completed");
  burst(110, "confetti");
  hearts(34);
}

function burst(count, type) {
  if (state.reduced) return;
  const colors = ["#ff2f9a", "#ff78c3", "#8b4dff", "#f7edff", "#7dffd2", "#ffcf6b"];
  for (let i = 0; i < count; i += 1) {
    state.particles.push({
      x: window.innerWidth * (.22 + Math.random() * .56),
      y: window.innerHeight * (.2 + Math.random() * .18),
      vx: (Math.random() - .5) * 7,
      vy: -Math.random() * 5 - 2,
      size: type === "confetti" ? 5 + Math.random() * 9 : 3 + Math.random() * 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 80 + Math.random() * 60,
      spin: Math.random() * Math.PI,
      gravity: type === "confetti" ? .09 : .12,
      type
    });
  }
}

function hearts(count) {
  if (state.reduced) return;
  for (let i = 0; i < count; i += 1) {
    state.hearts.push({
      x: Math.random() * window.innerWidth,
      y: window.innerHeight + Math.random() * 70,
      vy: -1.1 - Math.random() * 1.7,
      size: 12 + Math.random() * 18,
      life: 180 + Math.random() * 90,
      phase: Math.random() * 10,
      alpha: .7 + Math.random() * .25
    });
  }
}

function drawHeart(x, y, size, alpha) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#ff78c3";
  ctx.beginPath();
  ctx.moveTo(12, 21);
  ctx.bezierCurveTo(2, 13, 2, 6, 7, 4);
  ctx.bezierCurveTo(10, 3, 12, 5, 12, 7);
  ctx.bezierCurveTo(12, 5, 15, 3, 18, 4);
  ctx.bezierCurveTo(23, 6, 22, 13, 12, 21);
  ctx.fill();
  ctx.restore();
}

function animateFx() {
  ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
  state.particles = state.particles.filter((p) => p.life > 0);
  for (const p of state.particles) {
    p.life -= 1; p.x += p.vx; p.y += p.vy; p.vy += p.gravity; p.spin += .08;
    ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.globalAlpha = Math.min(1, p.life / 42); ctx.fillStyle = p.color;
    if (p.type === "confetti") ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * .56);
    else { ctx.beginPath(); ctx.arc(0, 0, p.size, 0, Math.PI * 2); ctx.fill(); }
    ctx.restore();
  }
  state.hearts = state.hearts.filter((h) => h.life > 0);
  for (const h of state.hearts) {
    h.life -= 1; h.y += h.vy; h.x += Math.sin((h.life + h.phase) / 20) * .55;
    drawHeart(h.x, h.y, h.size, Math.min(h.alpha, h.life / 55));
  }
  requestAnimationFrame(animateFx);
}

animateFx();
renderBoot();






