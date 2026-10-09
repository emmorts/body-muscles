// Site-wide interface behaviour: theme, tabs, copy buttons, contents rail.
// Every enhancement is progressive: without JavaScript the content stays readable.

const root = document.documentElement;
const announcer = document.getElementById("announcer");

/** Announce a short status message to assistive technology. */
export function announce(message) {
  announcer.textContent = "";
  requestAnimationFrame(() => {
    announcer.textContent = message;
  });
}

/** Copy text, then mark `button` as copied for two seconds. */
export async function copyText(text, button, message = "Copied to clipboard") {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    announce("Copy failed. Select the text and copy it manually.");
    return;
  }
  announce(message);
  if (!button) return;
  button.dataset.copied = "";
  clearTimeout(button.copyTimer);
  button.copyTimer = setTimeout(() => delete button.dataset.copied, 2000);
}

// ── Theme ────────────────────────────────────────────────────────────────
const THEME_KEY = "body-muscles-theme";

export function initTheme() {
  const toggle = document.getElementById("themeToggle");
  const system = matchMedia("(prefers-color-scheme: dark)");

  const apply = (theme) => {
    root.dataset.theme = theme;
    toggle.setAttribute("aria-pressed", String(theme === "dark"));
  };

  toggle.setAttribute("aria-label", "Dark theme");
  apply(root.dataset.theme === "dark" ? "dark" : "light");

  toggle.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    apply(next);
    try {
      localStorage.setItem(THEME_KEY, next);
    } catch {}
  });

  // Follow the system until the visitor makes an explicit choice.
  system.addEventListener("change", (event) => {
    let stored = null;
    try {
      stored = localStorage.getItem(THEME_KEY);
    } catch {}
    if (!stored) apply(event.matches ? "dark" : "light");
  });
}

// ── Tabs (WAI-ARIA tabs pattern with automatic activation) ──────────────
export function initTabs() {
  document.querySelectorAll("[data-tabs]").forEach((container, groupIndex) => {
    const tabs = [...container.querySelectorAll(':scope > [role="tablist"] > [role="tab"]')];
    const panels = [...container.querySelectorAll(':scope > [role="tabpanel"]')];

    tabs.forEach((tab, index) => {
      tab.id = `tabs-${groupIndex}-tab-${index}`;
      panels[index].id = `tabs-${groupIndex}-panel-${index}`;
      tab.setAttribute("aria-controls", panels[index].id);
      panels[index].setAttribute("aria-labelledby", tab.id);
    });

    const select = (selected, moveFocus) => {
      tabs.forEach((tab, index) => {
        const active = index === selected;
        tab.setAttribute("aria-selected", String(active));
        tab.tabIndex = active ? 0 : -1;
        panels[index].hidden = !active;
      });
      if (moveFocus) tabs[selected].focus();
    };

    tabs.forEach((tab, index) => {
      tab.addEventListener("click", () => select(index, false));
      tab.addEventListener("keydown", (event) => {
        const last = tabs.length - 1;
        const target = {
          ArrowRight: index === last ? 0 : index + 1,
          ArrowLeft: index === 0 ? last : index - 1,
          Home: 0,
          End: last,
        }[event.key];
        if (target === undefined) return;
        event.preventDefault();
        select(target, true);
      });
    });

    select(0, false);
  });
}

// ── Code blocks: copy buttons and keyboard-scrollable overflow ──────────
const COPY_ICONS = `
  <svg class="icon-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" aria-hidden="true">
    <rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" />
  </svg>
  <svg class="icon-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="m5 12 5 5 9-10" />
  </svg>`;

export function initCodeBlocks() {
  window.hljs?.highlightAll();

  for (const block of document.querySelectorAll(".code, .install")) {
    const source = block.querySelector("pre, code");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-button code-copy";
    button.setAttribute("aria-label", block.classList.contains("install") ? "Copy install command" : "Copy code");
    button.innerHTML = COPY_ICONS;
    button.addEventListener("click", () => copyText(source.textContent.trim(), button));
    block.append(button);
  }

  // Overflowing listings must be reachable for keyboard scrolling.
  const observer = new ResizeObserver((entries) => {
    for (const { target } of entries) {
      if (target.hasAttribute("aria-labelledby")) continue;
      if (target.scrollWidth > target.clientWidth) target.tabIndex = 0;
      else target.removeAttribute("tabindex");
    }
  });
  document.querySelectorAll(".code pre").forEach((pre) => observer.observe(pre));
}

// ── Contents rail: current section and collapsible narrow layout ────────
export function initContents() {
  const toc = document.querySelector(".toc");
  const details = toc.querySelector("details");
  const links = [...toc.querySelectorAll("a[href^='#']")];
  const sections = links.map((link) => document.querySelector(link.hash)).filter(Boolean);
  const wide = matchMedia("(min-width: 60.0625rem)");

  const syncLayout = () => {
    details.open = wide.matches;
  };
  syncLayout();
  wide.addEventListener("change", syncLayout);
  toc.addEventListener("click", (event) => {
    if (event.target.closest("a") && !wide.matches) details.open = false;
  });

  // The current entry is the last section whose top has scrolled past the
  // reading line just below the sticky header.
  const markCurrent = () => {
    const line = parseFloat(getComputedStyle(root).scrollPaddingTop) || 0;
    let current = null;
    for (const section of sections) {
      if (section.getBoundingClientRect().top - line <= 1) current = section;
    }
    for (const link of links) {
      if (link.hash === `#${current?.id}`) link.setAttribute("aria-current", "location");
      else link.removeAttribute("aria-current");
    }
  };
  let frame = 0;
  addEventListener(
    "scroll",
    () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(markCurrent);
    },
    { passive: true },
  );
  markCurrent();
}

// ── Version badge, written by `npm run docs:build` ──────────────────────
export async function initSiteMeta() {
  try {
    const response = await fetch("lib/site.json");
    if (!response.ok) return;
    const { version } = await response.json();
    for (const el of document.querySelectorAll("[data-site-version]")) {
      el.textContent = `v${version}`;
      el.hidden = false;
    }
  } catch {}
}
