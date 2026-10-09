// Browser behaviour coverage for the built UMD bundle and the documentation demo.
//
// Runs the real bundle in headless Chromium (Playwright) and asserts only
// consumer-visible behaviour: DOM state, accessibility attributes, focus,
// tooltips, and callbacks. It never inspects private fields or source text.
//
// Requires `npm run build` — `dist/umd/body-muscles.umd.js` is loaded directly.
// The demo section serves `docs/` over a local HTTP server and maps the
// git-ignored `docs/lib/body-muscles.umd.js` to the freshly built bundle, so it
// never writes a build artifact into the working tree. External CDN requests are
// blocked, keeping the run hermetic; the demo's chart logic does not need them.
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const bundle = readFileSync(path.join(root, "dist", "umd", "body-muscles.umd.js"), "utf8");
const docsDir = path.join(root, "docs");

const browser = await chromium.launch();
let passed = 0;
const failures = [];

async function test(name, run) {
  const page = await browser.newPage();
  try {
    await run(page);
    passed++;
    console.log(`ok   ${name}`);
  } catch (error) {
    failures.push({ name, error });
    console.log(`FAIL ${name}`);
  } finally {
    await page.close();
  }
}

/** Load a blank page and inject the built bundle. */
async function mount(page) {
  await page.setContent(
    '<!doctype html><html lang="en"><body><div id="host" style="width:400px;height:600px"></div></body></html>',
  );
  await page.addScriptTag({ content: bundle });
}

/** Read the harness-visible state of the first chart on the page. */
const chartFacts = (page) =>
  page.evaluate(() => {
    const regions = [...document.querySelectorAll(".body-chart-muscle")];
    const svg = document.querySelector(".body-chart-svg");
    return {
      svgRole: svg?.getAttribute("role") ?? null,
      svgLabel: svg?.getAttribute("aria-label") ?? null,
      svgAriaHidden: svg?.getAttribute("aria-hidden") ?? null,
      svgTransition: svg?.style.transition ?? null,
      wrappers: document.querySelectorAll(".body-chart-container").length,
      regions: regions.length,
      regionRoles: [...new Set(regions.map((r) => r.getAttribute("role")))],
      tabStops: regions.filter((r) => r.getAttribute("tabindex") === "0").length,
      tabIndexes: [...new Set(regions.map((r) => r.getAttribute("tabindex")))],
      pressed: regions.map((r) => r.getAttribute("aria-pressed")),
      viewLabels: document.querySelectorAll(".body-chart-view-label").length,
      tooltips: document.querySelectorAll(".body-chart-tooltip").length,
      describedBy: regions.filter((r) => r.hasAttribute("aria-describedby")).length,
    };
  });

// ── Library: semantics ───────────────────────────────────

await test("interactive chart is one tab stop of toggle-button regions", async (page) => {
  await mount(page);
  const expected = await page.evaluate(() => {
    const { BodyChart, ViewSide, FRONT_MUSCLES } = window.BodyMuscles;
    new BodyChart(document.getElementById("host"), { view: ViewSide.FRONT, bodyState: {} });
    return FRONT_MUSCLES.length;
  });
  const facts = await chartFacts(page);
  assert.equal(facts.regions, expected, "renders every anterior region");
  assert.equal(facts.svgRole, "group", "interactive chart is not an image");
  assert.ok(facts.svgLabel, "chart exposes an accessible name");
  assert.equal(facts.svgAriaHidden, null, "chart is not hidden from assistive technology");
  assert.deepEqual(facts.regionRoles, ["button"], "regions are buttons");
  assert.equal(facts.tabStops, 1, "exactly one region is in the tab order");
  assert.ok(
    facts.pressed.every((value) => value === "true" || value === "false"),
    "every region exposes aria-pressed",
  );
});

await test("display-only chart exposes no focusable regions", async (page) => {
  await mount(page);
  const facts = await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    window.clicks = 0;
    const chart = new BodyChart(document.getElementById("host"), {
      view: ViewSide.FRONT,
      bodyState: {},
      interactive: false,
      onMuscleClick: () => window.clicks++,
    });
    const region = document.querySelector(".body-chart-muscle");
    region.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    region.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true }));
    const facts = {
      svgRole: document.querySelector(".body-chart-svg").getAttribute("role"),
      clicks: window.clicks,
      focusable: document.querySelectorAll(".body-chart-muscle[tabindex]").length,
      roles: document.querySelectorAll(".body-chart-muscle[role]").length,
      tooltips: document.querySelectorAll(".body-chart-tooltip").length,
    };
    chart.destroy();
    return facts;
  });
  assert.equal(facts.svgRole, "img", "display-only chart is a single graphic");
  assert.equal(facts.focusable, 0, "no region is focusable");
  assert.equal(facts.roles, 0, "no region claims a button role");
  assert.equal(facts.tooltips, 0, "no tooltip is rendered");
  assert.equal(facts.clicks, 0, "callbacks never fire");
});

// ── Library: keyboard and selection ──────────────────────

await test("keyboard moves between regions and activates the focused one", async (page) => {
  await mount(page);
  await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    window.state = {};
    window.clicks = [];
    window.chart = new BodyChart(document.getElementById("host"), {
      view: ViewSide.FRONT,
      bodyState: window.state,
      onMuscleClick: (id) => {
        window.clicks.push(id);
        window.state[id] = { intensity: 0, selected: !window.state[id]?.selected };
        window.chart.update({ bodyState: window.state });
      },
    });
  });

  const labels = await page.$$eval(".body-chart-muscle", (regions) =>
    regions.map((region) => region.getAttribute("aria-label")),
  );
  const focusedLabel = () =>
    page.evaluate(() => document.activeElement.getAttribute("aria-label"));

  await page.keyboard.press("Tab");
  assert.equal(await focusedLabel(), labels[0], "Tab enters on the first region");

  await page.keyboard.press("ArrowRight");
  assert.equal(await focusedLabel(), labels[1], "ArrowRight moves to the next region");

  await page.keyboard.press("End");
  assert.equal(await focusedLabel(), labels.at(-1), "End jumps to the last region");

  await page.keyboard.press("Home");
  assert.equal(await focusedLabel(), labels[0], "Home returns to the first region");

  await page.keyboard.press("ArrowLeft");
  assert.equal(await focusedLabel(), labels.at(-1), "ArrowLeft wraps to the last region");

  const pressed = () =>
    page.evaluate(() => document.activeElement.getAttribute("aria-pressed"));
  assert.equal(await pressed(), "false", "region starts unpressed");
  await page.keyboard.press("Enter");
  assert.equal(await pressed(), "true", "Enter activates and reports the new selection");
  assert.equal(
    await page.evaluate(() => window.clicks.length),
    1,
    "activation fires onMuscleClick once",
  );

  await page.keyboard.press(" ");
  assert.equal(await pressed(), "false", "Space toggles the selection back");
  assert.equal(await page.evaluate(() => document.activeElement.getAttribute("tabindex")), "0");
  const facts = await chartFacts(page);
  assert.equal(facts.tabStops, 1, "focus stays on the single tab stop");
});

await test("focus survives in-place updates and Escape dismisses the tooltip", async (page) => {
  await mount(page);
  await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    window.chart = new BodyChart(document.getElementById("host"), {
      view: ViewSide.FRONT,
      bodyState: {},
      tooltipFormatter: (muscle, state) => `${muscle.name} @ ${state ? state.intensity : 0}`,
    });
  });

  await page.locator(".body-chart-muscle").first().focus();
  await page.evaluate(() => {
    document.activeElement.dataset.focusProbe = "region";
  });
  const probe = () =>
    page.evaluate(() => ({
      probe: document.activeElement?.dataset?.focusProbe ?? null,
      isRegion: document.activeElement?.classList?.contains("body-chart-muscle") ?? false,
    }));

  await page.evaluate(() => window.chart.update({ bodyState: { head: { intensity: 6, selected: true } } }));
  const afterUpdate = await probe();
  assert.equal(afterUpdate.probe, "region", "an in-place update does not steal focus");
  assert.equal(afterUpdate.isRegion, true, "focus is still on the same region");

  assert.equal(await page.locator(".body-chart-tooltip").isVisible(), true, "tooltip shows on focus");
  assert.equal(
    await page.locator(".body-chart-tooltip").textContent(),
    "Head @ 6",
    "tooltip reflects the current state",
  );

  await page.keyboard.press("Escape");
  assert.equal(await page.locator(".body-chart-tooltip").isVisible(), false, "Escape hides it");
  assert.equal((await probe()).probe, "region", "Escape keeps focus on the region");
});

// ── Library: mutable options ─────────────────────────────

await test("update applies every option without a view change", async (page) => {
  await mount(page);
  const facts = await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    const chart = new BodyChart(document.getElementById("host"), { view: ViewSide.FRONT, bodyState: {} });
    const out = {};

    chart.update({ className: "customer-chart" });
    out.className = document.querySelector(".body-chart-container").className;

    chart.update({ ariaLabel: "Muscle heat map" });
    out.ariaLabel = document.querySelector(".body-chart-svg").getAttribute("aria-label");

    for (let i = 0; i < 3; i++) chart.update({ showViewLabel: i % 2 === 0 });
    chart.update({ showViewLabel: true });
    out.viewLabelsAfterToggling = document.querySelectorAll(".body-chart-view-label").length;

    for (let i = 0; i < 3; i++) chart.update({ showTooltip: i % 2 === 0 });
    chart.update({ showTooltip: false });
    out.tooltipsWhenOff = document.querySelectorAll(".body-chart-tooltip").length;
    out.describedByWhenOff = document.querySelectorAll(".body-chart-muscle[aria-describedby]").length;
    chart.update({ showTooltip: true });
    out.tooltipsWhenOn = document.querySelectorAll(".body-chart-tooltip").length;

    chart.update({ enableTransitions: false });
    out.transitionOff = document.querySelector(".body-chart-svg").style.transition;
    chart.update({ enableTransitions: true });
    out.transitionOn = document.querySelector(".body-chart-svg").style.transition;

    // `undefined` must not clobber a resolved option.
    chart.update({ bodyState: { head: { intensity: 4, selected: true } }, ariaLabel: undefined });
    out.ariaLabelAfterUndefined = document.querySelector(".body-chart-svg").getAttribute("aria-label");
    out.intensityFill = document
      .querySelector('.body-chart-muscle[aria-label^="Head"]')
      .getAttribute("fill");

    chart.destroy();
    return out;
  });

  assert.equal(facts.className, "body-chart-container customer-chart");
  assert.equal(facts.ariaLabel, "Muscle heat map");
  assert.equal(facts.viewLabelsAfterToggling, 1, "repeated toggling leaves one label");
  assert.equal(facts.tooltipsWhenOff, 0, "disabling removes the tooltip");
  assert.equal(facts.describedByWhenOff, 0, "disabling clears stale aria-describedby");
  assert.equal(facts.tooltipsWhenOn, 1, "enabling recreates exactly one tooltip");
  assert.equal(facts.transitionOff, "");
  assert.match(facts.transitionOn, /200ms/);
  assert.equal(facts.ariaLabelAfterUndefined, "Muscle heat map", "undefined is ignored");
  assert.equal(facts.intensityFill, "#fb923c", "intensity 4 maps to its palette colour");
});

await test("callbacks are replaced and a visible tooltip refreshes in place", async (page) => {
  await mount(page);
  const facts = await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    const out = { clicks: [], hovers: [] };
    const chart = new BodyChart(document.getElementById("host"), {
      view: ViewSide.FRONT,
      bodyState: {},
      tooltipFormatter: (muscle, state) => `${muscle.name} @ ${state ? state.intensity : 0}`,
      onMuscleClick: (id) => out.clicks.push(`a:${id}`),
      onMuscleHover: (id) => out.hovers.push(`a:${id}`),
    });

    chart.update({
      onMuscleClick: (id) => out.clicks.push(`b:${id}`),
      onMuscleHover: (id) => out.hovers.push(`b:${id}`),
    });

    const region = document.querySelector('.body-chart-muscle[aria-label^="Head"]');
    region.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    region.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, clientX: 40, clientY: 40 }));
    out.tooltipOnHover = document.querySelector(".body-chart-tooltip").textContent;

    const state = { head: { intensity: 8, selected: true } };
    chart.update({ bodyState: state });
    out.tooltipAfterState = document.querySelector(".body-chart-tooltip").textContent;
    state.head.intensity = 3;
    chart.update({ bodyState: state });
    out.tooltipAfterMutation = document.querySelector(".body-chart-tooltip").textContent;

    chart.update({ tooltipFormatter: (muscle) => `${muscle.name}!` });
    out.tooltipAfterFormatter = document.querySelector(".body-chart-tooltip").textContent;

    chart.destroy();
    return out;
  });

  assert.deepEqual(facts.clicks, ["b:head"], "the replacement click handler is used");
  assert.deepEqual(facts.hovers, ["b:head"], "the replacement hover handler is used");
  assert.equal(facts.tooltipOnHover, "Head @ 0");
  assert.equal(facts.tooltipAfterState, "Head @ 8", "state changes reach the open tooltip");
  assert.equal(facts.tooltipAfterMutation, "Head @ 3", "reused state mappings reach the open tooltip");
  assert.equal(facts.tooltipAfterFormatter, "Head!", "formatter changes reach the open tooltip");
});

// ── Library: transitions, teardown, isolation ────────────

await test("view changes keep a single chart with the right regions", async (page) => {
  await mount(page);
  const facts = await page.evaluate(() => {
    const { BodyChart, ViewSide, FRONT_MUSCLES, BACK_MUSCLES } = window.BodyMuscles;
    const chart = new BodyChart(document.getElementById("host"), { view: ViewSide.FRONT, bodyState: {} });
    const out = { expected: {}, seen: {}, wrappers: 0, svgs: 0, tooltips: 0, tabStops: 0 };
    out.expected.FRONT = FRONT_MUSCLES.length;
    out.expected.BACK = BACK_MUSCLES.length;
    out.expected.BOTH = FRONT_MUSCLES.length + BACK_MUSCLES.length;

    for (const view of ["BOTH", "BACK", "FRONT", "BOTH", "FRONT"]) {
      chart.update({ view: ViewSide[view] });
      out.seen[view] = document.querySelectorAll(".body-chart-muscle").length;
    }
    out.wrappers = document.querySelectorAll(".body-chart-container").length;
    out.svgs = document.querySelectorAll(".body-chart-svg").length;
    out.tooltips = document.querySelectorAll(".body-chart-tooltip").length;
    out.tabStops = document.querySelectorAll('.body-chart-muscle[tabindex="0"]').length;
    chart.destroy();
    return out;
  });

  assert.equal(facts.seen.FRONT, facts.expected.FRONT);
  assert.equal(facts.seen.BACK, facts.expected.BACK);
  assert.equal(facts.seen.BOTH, facts.expected.BOTH);
  assert.equal(facts.wrappers, 1, "repeated view changes do not stack charts");
  assert.equal(facts.svgs, 1);
  assert.equal(facts.tooltips, 1);
  assert.equal(facts.tabStops, 1);
});

await test("destroy removes the chart and its listeners", async (page) => {
  await mount(page);
  const facts = await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    window.clicks = 0;
    const chart = new BodyChart(document.getElementById("host"), {
      view: ViewSide.FRONT,
      bodyState: {},
      onMuscleClick: () => window.clicks++,
    });
    const region = document.querySelector(".body-chart-muscle");
    chart.destroy();
    const afterDestroy = {
      containers: host.querySelectorAll(".body-chart-container").length,
      tooltips: document.querySelectorAll(".body-chart-tooltip").length,
    };
    region.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    afterDestroy.clicksAfterDestroy = window.clicks;
    return afterDestroy;
  });

  assert.equal(facts.containers, 0, "the chart is removed from the DOM");
  assert.equal(facts.tooltips, 0, "the tooltip is removed");
  assert.equal(facts.clicksAfterDestroy, 0, "listeners are detached");
});

await test("multiple instances stay independent", async (page) => {
  await mount(page);
  const facts = await page.evaluate(() => {
    const { BodyChart, ViewSide } = window.BodyMuscles;
    const host = document.getElementById("host");
    const second = document.createElement("div");
    host.after(second);

    const a = new BodyChart(host, {
      view: ViewSide.FRONT,
      bodyState: { head: { intensity: 9, selected: true } },
    });
    const b = new BodyChart(second, {
      view: ViewSide.FRONT,
      bodyState: { head: { intensity: 1, selected: false } },
    });

    const fill = (root, label) =>
      root.querySelector(`.body-chart-muscle[aria-label^="${label}"]`).getAttribute("fill");
    const out = {
      aHead: fill(host, "Head"),
      bHead: fill(second, "Head"),
      aSelected: host.querySelector('.body-chart-muscle[aria-label^="Head"]').getAttribute("aria-pressed"),
      bSelected: second.querySelector('.body-chart-muscle[aria-label^="Head"]').getAttribute("aria-pressed"),
      distinctTooltipIds:
        new Set([...document.querySelectorAll(".body-chart-tooltip")].map((el) => el.id)).size,
      tooltips: document.querySelectorAll(".body-chart-tooltip").length,
    };
    a.destroy();
    b.destroy();
    return out;
  });

  assert.notEqual(facts.aHead, facts.bHead, "each chart renders its own state");
  assert.equal(facts.aSelected, "true");
  assert.equal(facts.bSelected, "false");
  assert.equal(facts.tooltips, 2, "each chart owns a tooltip");
  assert.equal(facts.distinctTooltipIds, 2, "tooltip ids do not collide");
});

// ── Demo: the controls a visitor actually uses ───────────

function startDocsServer() {
  const server = createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url, "http://127.0.0.1").pathname);
    const relative = pathname === "/" ? "index.html" : pathname.slice(1);
    const filePath = path.join(docsDir, relative);
    if (!filePath.startsWith(docsDir)) {
      response.writeHead(403).end();
      return;
    }
    // The demo loads a git-ignored build artifact; serve the bundle we just built.
    let body;
    try {
      body = relative.endsWith("lib/body-muscles.umd.js") ? bundle : readFileSync(filePath);
    } catch {
      response.writeHead(404).end();
      return;
    }
    const type = relative.endsWith(".css")
      ? "text/css"
      : relative.endsWith(".js")
        ? "text/javascript"
        : "text/html";
    response.writeHead(200, { "content-type": type }).end(body);
  });
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port }));
  });
}

const { server: docsServer, port: docsPort } = await startDocsServer();

async function openDemo(page) {
  await page.route("**/*", (route) =>
    new URL(route.request().url()).hostname === "127.0.0.1" ? route.continue() : route.abort(),
  );
  await page.goto(`http://127.0.0.1:${docsPort}/index.html`, { waitUntil: "domcontentloaded" });
  await page.waitForSelector(".body-chart-muscle");
}

await test("demo selected-muscle slider survives repeated keyboard increments", async (page) => {
  await openDemo(page);
  // Select a region through the chart so the card is populated.
  await page.locator(".body-chart-muscle").first().focus();
  await page.keyboard.press("Enter");

  const name = await page.locator("#selectedName").textContent();
  const label = await page.evaluate(
    () => document.getElementById("intensitySlider").labels?.[0]?.textContent ?? "",
  );
  assert.ok(label.includes(name), `slider is labelled with its region, got "${label}"`);

  await page.locator("#intensitySlider").focus();
  for (const expected of ["1", "2", "3"]) {
    await page.keyboard.press("ArrowRight");
    assert.equal(
      await page.locator("#intensitySlider").inputValue(),
      expected,
      "each arrow press changes the value",
    );
    assert.equal(
      await page.evaluate(() => document.activeElement === document.getElementById("intensitySlider")),
      true,
      "focus stays on the slider",
    );
  }
  assert.equal(await page.locator("#selectedIntensity").textContent(), "3 / 10");
});

await test("demo muscle rows keep their slider mounted and label every control", async (page) => {
  await openDemo(page);
  await page.locator(".group-chip").nth(3).click();

  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".muscle-item")].map((row) => ({
      checkbox: row.querySelector(".muscle-item-toggle")?.type,
      checkboxLabel: row.querySelector(".muscle-item-toggle")?.getAttribute("aria-label"),
      sliderLabel: row.querySelector(".muscle-item-slider")?.getAttribute("aria-label"),
    })),
  );
  assert.ok(rows.length > 0, "the group renders muscle rows");
  assert.ok(rows.every((row) => row.checkbox === "checkbox"), "row toggles are native checkboxes");
  assert.ok(rows.every((row) => row.checkboxLabel && row.sliderLabel), "every control is labelled");

  await page.locator(".muscle-item-slider").first().focus();
  for (const expected of ["1", "2", "3"]) {
    await page.keyboard.press("ArrowRight");
    const focused = await page.evaluate(() => {
      const slider = document.activeElement;
      return {
        value: slider.value,
        label: slider.closest(".muscle-item")?.querySelector(".muscle-item-value")?.textContent,
      };
    });
    assert.equal(focused.value, expected, "the row slider keeps increments");
    assert.equal(focused.label, focused.value, "the numeric label follows the slider");
  }
});

await test("demo deselecting a row hands focus to a neighbouring control", async (page) => {
  await openDemo(page);
  await page.locator(".group-chip").nth(3).click();

  const before = await page.evaluate(() => document.querySelectorAll(".muscle-item").length);
  await page.locator(".muscle-item-toggle").first().focus();
  await page.keyboard.press("Space");

  const after = await page.evaluate(() => ({
    rows: document.querySelectorAll(".muscle-item").length,
    inList: !!document.activeElement.closest("#groupMusclesList"),
    onBody: document.activeElement === document.body,
  }));
  assert.equal(after.rows, before - 1, "the deselected row is removed");
  assert.equal(after.onBody, false, "focus is not dropped to the document");
  assert.equal(after.inList, true, "focus moves to a control still in the list");
});

await test("demo deselecting the final row focuses its group chip", async (page) => {
  await openDemo(page);
  await page.locator(".body-chart-muscle").first().focus();
  await page.keyboard.press("Enter");
  await page.locator(".muscle-item-toggle").focus();
  await page.keyboard.press("Space");

  assert.equal(await page.locator("#groupMusclesCard").isVisible(), false);
  assert.equal(await page.locator("#statSelected").textContent(), "0");
  assert.equal(
    await page.evaluate(() => document.activeElement.textContent),
    "Head & Neck",
    "focus moves to a visible group chip before the panel disappears",
  );
  await page.keyboard.press("Space");
  assert.equal(
    await page.getByRole("button", { name: "Head & Neck", exact: true }).getAttribute("aria-pressed"),
    "true",
    "the focused fallback remains keyboard-operable",
  );
});

await browser.close();
docsServer.close();

console.log(`\n${passed} passed, ${failures.length} failed`);
if (failures.length > 0) {
  for (const { name, error } of failures) {
    console.error(`\n${name}\n${error.stack ?? error}`);
  }
  process.exit(1);
}
