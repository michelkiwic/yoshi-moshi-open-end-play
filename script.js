const root = document.documentElement;
const bubbles = document.querySelector(".bubbles");
const sections = [...document.querySelectorAll("[data-ui]")];
const menuToggle = document.querySelector(".menu-toggle");
const menuClose = document.querySelector(".menu-close");
const menuLinks = [...document.querySelectorAll(".menu-panel a")];
const tracks = [...document.querySelectorAll(".copy-track")];
const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let bubbleSerial = 0;
let lastTouchY = 0;
let scrollPulseUntil = 0;
let scrollPulseActive = false;

if ("scrollRestoration" in history) {
  history.scrollRestoration = "manual";
}

function setTheme(section) {
  root.style.setProperty("--ui-color", section.dataset.ui || "#111111");
  root.style.setProperty("--bubble-color", section.dataset.bubble || section.dataset.ui || "#111111");
}

const themeObserver = new IntersectionObserver(
  (entries) => {
    const visible = entries
      .filter((entry) => entry.isIntersecting)
      .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

    if (visible) {
      setTheme(visible.target);
    }
  },
  {
    root: null,
    threshold: [0.35, 0.55, 0.75],
  }
);

sections.forEach((section) => themeObserver.observe(section));
setTheme(sections[0]);

function toggleMenu(force) {
  const isOpen = typeof force === "boolean" ? force : !document.body.classList.contains("menu-is-open");
  document.body.classList.toggle("menu-is-open", isOpen);
  menuToggle.setAttribute("aria-expanded", String(isOpen));
}

function scrollToHash() {
  if (!location.hash) return;
  const target = document.querySelector(location.hash);
  if (!target) return;

  target.scrollIntoView({ block: "start", behavior: "auto" });
  renderedScrollY = window.scrollY;
  updateScrollLayers(renderedScrollY);
}

menuToggle.addEventListener("click", () => toggleMenu());
menuClose.addEventListener("click", () => toggleMenu(false));
menuLinks.forEach((link) =>
  link.addEventListener("click", (event) => {
    const hash = link.getAttribute("href");
    toggleMenu(false);

    if (hash?.startsWith("#")) {
      event.preventDefault();
      const target = document.querySelector(hash);
      if (target) {
        history.pushState(null, "", hash);
        target.scrollIntoView({ block: "start", behavior: "smooth" });
      }
    }
  })
);

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    toggleMenu(false);
  }
});

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function updateScrollText() {
  updateScrollLayers(window.scrollY);
}

function updateScrollLayers(scrollY) {
  const viewport = window.innerHeight;
  const narrow = window.innerWidth <= 900;
  const textStart = narrow ? 0.18 : 0.34;
  const textStopTop = narrow ? 82 : 96;
  const textPhaseEnd = 0.42;

  tracks.forEach((track) => {
    const section = track.closest(".category");
    const stage = track.closest(".category-stage");
    const copy = track.closest(".category-copy");
    const stagePaddingTop = Number.parseFloat(getComputedStyle(stage).paddingTop) || 0;
    const textBaseTop = stagePaddingTop + (copy.offsetHeight - track.offsetHeight) / 2;
    const textEnd = (textStopTop - textBaseTop) / viewport;
    const scrollable = Math.max(1, section.offsetHeight - viewport);
    const progress = clamp((scrollY - section.offsetTop) / scrollable, 0, 1);
    const textPhase = clamp(progress / textPhaseEnd, 0, 1);
    const lift = (textStart + (textEnd - textStart) * textPhase) * viewport;
    const parallaxLabels = section.querySelector(".parallax-labels");
    track.style.transform = `translate3d(0, ${lift}px, 0)`;

    if (parallaxLabels) {
      const labelPhase = clamp((progress - textPhaseEnd) / (1 - textPhaseEnd), 0, 1);
      const labelAY = (0.92 - labelPhase * 1.05) * viewport;
      const labelBY = (0.78 - labelPhase * 1.23) * viewport;
      parallaxLabels.style.setProperty("--label-a-y", `${labelAY}px`);
      parallaxLabels.style.setProperty("--label-b-y", `${labelBY}px`);
    }
  });
}

let renderedScrollY = window.scrollY;

function watchScrollPosition() {
  const currentScrollY = window.scrollY;

  if (Math.abs(currentScrollY - renderedScrollY) > 0.5) {
    renderedScrollY = currentScrollY;
    updateScrollLayers(renderedScrollY);
  }

  requestAnimationFrame(watchScrollPosition);
}

function syncScrollLayers() {
  if (reduceMotion) {
    updateScrollText();
    return;
  }

  renderedScrollY = window.scrollY;
  updateScrollLayers(renderedScrollY);
  keepScrollLayersAwake(260);
}

function pulseScrollLayers() {
  renderedScrollY = window.scrollY;
  updateScrollLayers(renderedScrollY);

  if (performance.now() < scrollPulseUntil) {
    requestAnimationFrame(pulseScrollLayers);
    return;
  }

  scrollPulseActive = false;
}

function keepScrollLayersAwake(duration = 700) {
  if (reduceMotion) return;

  scrollPulseUntil = Math.max(scrollPulseUntil, performance.now() + duration);
  if (scrollPulseActive) return;

  scrollPulseActive = true;
  requestAnimationFrame(pulseScrollLayers);
}

function noteScrollIntent(deltaY) {
  keepScrollLayersAwake();
}

window.addEventListener("scroll", syncScrollLayers, { passive: true });
window.addEventListener("wheel", (event) => noteScrollIntent(event.deltaY), { passive: true });
window.addEventListener(
  "touchstart",
  (event) => {
    lastTouchY = event.touches[0]?.clientY || 0;
  },
  { passive: true }
);
window.addEventListener(
  "touchmove",
  (event) => {
    const touchY = event.touches[0]?.clientY || lastTouchY;
    noteScrollIntent(lastTouchY - touchY);
    lastTouchY = touchY;
  },
  { passive: true }
);
window.addEventListener("resize", () => {
  renderedScrollY = window.scrollY;
  updateScrollLayers(renderedScrollY);
});
window.addEventListener("hashchange", scrollToHash);
updateScrollText();
scrollToHash();
if (!reduceMotion) {
  requestAnimationFrame(watchScrollPosition);
}

function createBubble() {
  if (reduceMotion || !bubbles) return;

  const activeCount = bubbles.querySelectorAll(".bubble").length;
  if (activeCount > 10) return;

  const bubble = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  const size = Math.round(28 + Math.random() * 82);
  const left = Math.round(Math.random() * 100);
  const drift = Math.round(-80 + Math.random() * 160);
  const duration = (5.6 + Math.random() * 5.2).toFixed(2);

  bubble.classList.add("bubble");
  bubble.setAttribute("viewBox", "0 0 66 66");
  bubble.style.setProperty("--bubble-size", `${size}px`);
  bubble.style.setProperty("--bubble-left", `${left}%`);
  bubble.style.setProperty("--bubble-drift", `${drift}px`);
  bubble.style.setProperty("--bubble-duration", `${duration}s`);
  use.setAttribute("href", bubbleSerial % 2 === 0 ? "#bubble-template" : "#bubble-template-inverted");
  bubbleSerial += 1;
  bubble.appendChild(use);
  bubbles.appendChild(bubble);

  bubble.addEventListener("animationend", () => bubble.remove(), { once: true });
}

if (!reduceMotion) {
  setInterval(createBubble, 820);
  for (let i = 0; i < 4; i += 1) {
    setTimeout(createBubble, i * 180);
  }
}
