/**
 * Configurator state machine + helpers (browser-side).
 *
 * The /ajtotervezo page boots this module, which wires the wizard steps,
 * the live preview swatch composition, the summary panel, and the lead
 * POST to /api/lead. Pure DOM + TypeScript — no framework.
 *
 * The Astro page renders the static option grids (every step's options
 * are baked into the HTML at build-time from configurator-catalogue.ts);
 * this script handles only step transitions, selection, and previews.
 */

export type StepId =
  | "frame" | "ext-type" | "ext-pattern" | "ext-colour"
  | "int-type" | "int-pattern" | "int-colour"
  | "lock" | "summary";

export type Selection = {
  frame?: { id: string; label: string };
  extType?: { id: string; label: string };
  extPattern?: { id: string; label: string };
  extColour?: { id: string; label: string };
  intType?: { id: string; label: string };
  intPattern?: { id: string; label: string };
  intColour?: { id: string; label: string };
  lock?: { brand: { id: string; label: string }; mabisz?: { id: string; label: string; surcharge: number } };
};

const STEP_ORDER: StepId[] = [
  "frame", "ext-type", "ext-pattern", "ext-colour",
  "int-type", "int-pattern", "int-colour", "lock", "summary",
];

const BASE_PRICE = 330_000;
const formatHUF = (n: number) => `${n.toLocaleString("hu-HU").replace(/,/g, " ")} Ft`;

export function initConfigurator(root: HTMLElement): void {
  const selection: Selection = {};
  let currentStep: StepId = "frame";
  let view: "ext" | "int" = "ext";

  // ──────────────────────────────────────────────
  // Element lookups
  // ──────────────────────────────────────────────
  const stepPanels = Array.from(root.querySelectorAll<HTMLElement>("[data-step]"));
  const stepDots = Array.from(root.querySelectorAll<HTMLElement>("[data-step-dot]"));
  const previewExt = root.querySelector<HTMLElement>("[data-preview='ext']");
  const previewInt = root.querySelector<HTMLElement>("[data-preview='int']");
  const previewFrame = root.querySelectorAll<HTMLElement>("[data-preview-frame]");
  const summaryItems: Record<string, HTMLElement> = {};
  root.querySelectorAll<HTMLElement>("[data-summary-item]").forEach((el) => {
    const key = el.dataset.summaryItem!;
    summaryItems[key] = el;
  });
  const priceLabel = root.querySelector<HTMLElement>("[data-price]");
  const stepCounters = Array.from(root.querySelectorAll<HTMLElement>("[data-step-counter]"));
  const backBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-action='back']"));
  const nextBtns = Array.from(root.querySelectorAll<HTMLButtonElement>("[data-action='next']"));
  const viewToggle = root.querySelectorAll<HTMLButtonElement>("[data-view-toggle]");
  const leadForm = root.querySelector<HTMLFormElement>("[data-lead-form]");
  const leadStatus = root.querySelector<HTMLElement>("[data-lead-status]");
  const saveBtn = root.querySelector<HTMLButtonElement>("[data-action='save-design']");

  // ──────────────────────────────────────────────
  // Step navigation
  // ──────────────────────────────────────────────
  function showStep(id: StepId) {
    currentStep = id;
    stepPanels.forEach((p) => {
      p.classList.toggle("is-active", p.dataset.step === id);
    });
    stepDots.forEach((d) => {
      const dotId = d.dataset.stepDot as StepId;
      const dotIdx = STEP_ORDER.indexOf(dotId);
      const curIdx = STEP_ORDER.indexOf(id);
      d.classList.toggle("is-active", dotIdx === curIdx);
      d.classList.toggle("is-done", dotIdx < curIdx);
    });
    const idx = STEP_ORDER.indexOf(id) + 1;
    stepCounters.forEach((c) => { c.textContent = `${idx} / ${STEP_ORDER.length}`; });
    backBtns.forEach((b) => { b.disabled = STEP_ORDER.indexOf(id) === 0; });
    const last = STEP_ORDER.indexOf(id) === STEP_ORDER.length - 1;
    nextBtns.forEach((n) => {
      n.textContent = last ? "Felmérés foglalása →" : "Tovább →";
      n.disabled = !isStepComplete(id) && !last;
    });
    // Pattern step shows the right catalogue based on the cladding-type choice
    if (id === "ext-pattern") syncPatternCatalogue("ext");
    if (id === "ext-colour") syncColourCatalogue("ext");
    if (id === "int-pattern") syncPatternCatalogue("int");
    if (id === "int-colour") syncColourCatalogue("int");
    // Sync inside/outside preview default per step
    if (id.startsWith("ext-")) setView("ext");
    if (id.startsWith("int-")) setView("int");

    // Scroll into view on mobile
    root.querySelector<HTMLElement>(".cfg-stage")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function isStepComplete(id: StepId): boolean {
    switch (id) {
      case "frame":       return !!selection.frame;
      case "ext-type":    return !!selection.extType;
      case "ext-pattern": return !!selection.extPattern;
      case "ext-colour":  return !!selection.extColour;
      case "int-type":    return !!selection.intType;
      case "int-pattern": return !!selection.intPattern;
      case "int-colour":  return !!selection.intColour;
      case "lock":        return !!selection.lock && !!selection.lock.mabisz;
      case "summary":     return true;
    }
  }

  function goNext() {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx < STEP_ORDER.length - 1) showStep(STEP_ORDER[idx + 1]);
    else {
      // On summary the "Next" CTA submits the lead form
      leadForm?.requestSubmit();
    }
  }

  function goBack() {
    const idx = STEP_ORDER.indexOf(currentStep);
    if (idx > 0) showStep(STEP_ORDER[idx - 1]);
  }

  backBtns.forEach((b) => b.addEventListener("click", goBack));
  nextBtns.forEach((n) => n.addEventListener("click", goNext));

  // Step dot click — only allow jumping to completed earlier steps
  stepDots.forEach((d) => {
    d.addEventListener("click", () => {
      const target = d.dataset.stepDot as StepId;
      const targetIdx = STEP_ORDER.indexOf(target);
      const curIdx = STEP_ORDER.indexOf(currentStep);
      if (targetIdx <= curIdx) showStep(target);
    });
  });

  // ──────────────────────────────────────────────
  // Option selection
  // ──────────────────────────────────────────────
  root.querySelectorAll<HTMLButtonElement>("[data-option]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const step = btn.dataset.optionStep as StepId;
      const id = btn.dataset.option!;
      const label = btn.dataset.label || btn.textContent?.trim() || id;
      const swatch = btn.dataset.swatch || "";
      const imageUrl = btn.dataset.imageUrl || "";

      // Visually mark selected within the panel
      const panel = btn.closest("[data-step]");
      panel?.querySelectorAll<HTMLButtonElement>("[data-option]").forEach((b) => {
        b.classList.toggle("is-selected", b === btn);
        b.setAttribute("aria-pressed", b === btn ? "true" : "false");
      });

      switch (step) {
        case "frame":
          selection.frame = { id, label };
          applyFrameSwatch(swatch);
          break;
        case "ext-type":
          selection.extType = { id, label };
          // changing type resets pattern + colour downstream
          selection.extPattern = undefined;
          selection.extColour = undefined;
          break;
        case "ext-pattern":
          selection.extPattern = { id, label };
          applyDoorSwatch("ext", swatch, imageUrl);
          break;
        case "ext-colour":
          selection.extColour = { id, label };
          applyDoorSwatch("ext", swatch, imageUrl);
          break;
        case "int-type":
          selection.intType = { id, label };
          selection.intPattern = undefined;
          selection.intColour = undefined;
          // "Mint a külső" — copy the exterior pattern/colour into interior
          if (id === "same") {
            selection.intPattern = selection.extPattern;
            selection.intColour = selection.extColour;
            // First apply the exterior pattern image to the interior leaf.
            const extPatternBtn = root.querySelector<HTMLButtonElement>(`[data-option-step='ext-pattern'][data-option='${selection.extPattern?.id}']`);
            applyDoorSwatch("int", extPatternBtn?.dataset.swatch || "", extPatternBtn?.dataset.imageUrl || "");
            // Then layer the exterior colour underneath as the multiply-blend tint.
            const extColourBtn = root.querySelector<HTMLButtonElement>(`[data-option-step='ext-colour'][data-option='${selection.extColour?.id}']`);
            if (extColourBtn) applyDoorSwatch("int", extColourBtn.dataset.swatch || "");
          }
          break;
        case "int-pattern":
          selection.intPattern = { id, label };
          applyDoorSwatch("int", swatch, imageUrl);
          break;
        case "int-colour":
          selection.intColour = { id, label };
          applyDoorSwatch("int", swatch, imageUrl);
          break;
      }

      updateSummary();
      nextBtns.forEach((n) => { n.disabled = !isStepComplete(currentStep); });
    });
  });

  // Lock brand + MABISZ class are radio-style and live in the same panel
  root.querySelectorAll<HTMLInputElement>("[data-lock-brand]").forEach((input) => {
    input.addEventListener("change", () => {
      const brandId = input.value;
      const brandLabel = input.dataset.label || brandId;
      selection.lock = { brand: { id: brandId, label: brandLabel }, mabisz: selection.lock?.mabisz };
      // Show only the matching MABISZ class group
      root.querySelectorAll<HTMLElement>("[data-lock-classes]").forEach((g) => {
        g.classList.toggle("is-hidden", g.dataset.lockClasses !== brandId);
      });
      updateSummary();
      nextBtns.forEach((n) => { n.disabled = !isStepComplete(currentStep); });
    });
  });

  root.querySelectorAll<HTMLInputElement>("[data-lock-mabisz]").forEach((input) => {
    input.addEventListener("change", () => {
      if (!selection.lock) return;
      selection.lock.mabisz = {
        id: input.value,
        label: input.dataset.label || input.value,
        surcharge: Number(input.dataset.surcharge || 0),
      };
      updateSummary();
      nextBtns.forEach((n) => { n.disabled = !isStepComplete(currentStep); });
    });
  });

  // ──────────────────────────────────────────────
  // View toggle (Solidor-style outside/inside)
  // ──────────────────────────────────────────────
  function setView(v: "ext" | "int") {
    view = v;
    previewExt?.classList.toggle("is-visible", v === "ext");
    previewInt?.classList.toggle("is-visible", v === "int");
    viewToggle.forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.viewToggle === v);
      btn.setAttribute("aria-pressed", btn.dataset.viewToggle === v ? "true" : "false");
    });
  }
  viewToggle.forEach((btn) => {
    btn.addEventListener("click", () => setView(btn.dataset.viewToggle as "ext" | "int"));
  });

  // ──────────────────────────────────────────────
  // Pattern / colour catalogue — show appropriate set per cladding type
  // ──────────────────────────────────────────────
  function syncPatternCatalogue(side: "ext" | "int") {
    const sel = side === "ext" ? selection.extType : selection.intType;
    const typeId = sel?.id === "same" ? selection.extType?.id : sel?.id;
    const stepKey = side === "ext" ? "ext-pattern" : "int-pattern";
    const panel = root.querySelector<HTMLElement>(`[data-step='${stepKey}']`);
    if (!panel) return;
    panel.querySelectorAll<HTMLElement>("[data-pattern-group]").forEach((g) => {
      g.classList.toggle("is-hidden", g.dataset.patternGroup !== typeId);
    });
  }

  function syncColourCatalogue(side: "ext" | "int") {
    const sel = side === "ext" ? selection.extType : selection.intType;
    const typeId = sel?.id === "same" ? selection.extType?.id : sel?.id;
    const stepKey = side === "ext" ? "ext-colour" : "int-colour";
    const panel = root.querySelector<HTMLElement>(`[data-step='${stepKey}']`);
    if (!panel) return;
    panel.querySelectorAll<HTMLElement>("[data-colour-group]").forEach((g) => {
      g.classList.toggle("is-hidden", g.dataset.colourGroup !== typeId);
    });
  }

  // ──────────────────────────────────────────────
  // Live preview painting
  // ──────────────────────────────────────────────
  function applyFrameSwatch(swatch: string) {
    if (!swatch) return;
    previewFrame.forEach((el) => { el.style.background = swatch; });
  }

  /**
   * Paint the door leaf for the given side.
   *
   * Two distinct sources combine into the leaf surface:
   *   • pattern image (set by step "ext-pattern" / "int-pattern") — supplies the
   *     photographed wood grain or milled pattern as a background-image.
   *   • tint colour (set by step "ext-colour" / "int-colour") — supplies a
   *     background-color underneath the image.
   *
   * `background-blend-mode: multiply` (declared in CSS) combines the two so that
   * a chosen RAL colour tints the (mostly-white) milled photo, and wood-lacquer
   * tones deepen the wood photo without losing the grain.
   *
   * When called from a colour step, `imageUrl` is undefined — we preserve the
   * existing image. When called from a pattern step, `swatch` may be empty but
   * we still want the image to apply on top of any prior colour.
   */
  function applyDoorSwatch(side: "ext" | "int", swatch: string, imageUrl?: string) {
    const target = side === "ext" ? previewExt : previewInt;
    const leaf = target?.querySelector<HTMLElement>("[data-preview-leaf]");
    if (!leaf) return;

    if (imageUrl) {
      leaf.style.backgroundImage = `url("${imageUrl}")`;
      leaf.style.backgroundSize = "cover";
      leaf.style.backgroundPosition = "center";
      leaf.style.backgroundRepeat = "no-repeat";
    }

    if (swatch) {
      // Solid RAL colour: tints the underlying image via background-blend-mode.
      // Gradient swatch (wood pattern hint): used only when no image is present
      // (e.g. before image loads, or as a colour-step preview with no pattern).
      if (swatch.startsWith("linear-gradient") && leaf.style.backgroundImage && leaf.style.backgroundImage !== "none") {
        // Skip — gradient under image would clash with multiply blend.
      } else {
        leaf.style.backgroundColor = swatch.startsWith("linear-gradient")
          ? swatch.match(/#[0-9a-fA-F]{6}/)?.[0] ?? swatch
          : swatch;
      }
    }
  }

  // ──────────────────────────────────────────────
  // Summary + price
  // ──────────────────────────────────────────────
  function updateSummary() {
    const set = (key: string, value: string) => {
      if (summaryItems[key]) summaryItems[key].textContent = value || "—";
    };
    set("frame",       selection.frame?.label || "");
    set("ext-type",    selection.extType?.label || "");
    set("ext-pattern", selection.extPattern?.label || "");
    set("ext-colour",  selection.extColour?.label || "");
    set("int-type",    selection.intType?.label || "");
    set("int-pattern", selection.intPattern?.label || "");
    set("int-colour",  selection.intColour?.label || "");
    set("lock", selection.lock
      ? `${selection.lock.brand.label}${selection.lock.mabisz ? " · " + selection.lock.mabisz.label : ""}`
      : "");

    const surcharge = selection.lock?.mabisz?.surcharge ?? 0;
    const total = BASE_PRICE + surcharge;
    if (priceLabel) priceLabel.textContent = `${formatHUF(total)}-tól`;
  }

  // ──────────────────────────────────────────────
  // Lead form submission
  // ──────────────────────────────────────────────
  leadForm?.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!leadForm) return;
    const fd = new FormData(leadForm);
    fd.append("source", "ajtotervezo");
    fd.append("configuration", JSON.stringify(selection));
    // Honeypot
    if ((fd.get("_honey") as string)?.length) return;

    if (leadStatus) {
      leadStatus.textContent = "Küldés folyamatban...";
      leadStatus.className = "cfg-lead-status is-loading";
    }
    try {
      const res = await fetch("/api/lead", { method: "POST", body: fd });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.ok) {
        if (leadStatus) {
          leadStatus.textContent = "Köszönjük! Munkanapon belül visszahívjuk a megadott számon.";
          leadStatus.className = "cfg-lead-status is-ok";
        }
        leadForm.reset();
      } else {
        const msg = (json && json.error) || "Sajnos hiba történt. Kérjük, próbálja újra, vagy hívjon minket közvetlenül.";
        if (leadStatus) {
          leadStatus.textContent = msg;
          leadStatus.className = "cfg-lead-status is-error";
        }
      }
    } catch (err) {
      if (leadStatus) {
        leadStatus.textContent = "Hálózati hiba. Kérjük, próbálja újra, vagy hívjon minket közvetlenül.";
        leadStatus.className = "cfg-lead-status is-error";
      }
    }
  });

  // "Mentem a tervet" placeholder for v1
  saveBtn?.addEventListener("click", () => {
    saveBtn.classList.add("is-soon");
    saveBtn.setAttribute("aria-label", "Hamarosan elérhető");
    const tip = saveBtn.querySelector<HTMLElement>(".cfg-tooltip");
    if (tip) tip.classList.add("is-visible");
    setTimeout(() => tip?.classList.remove("is-visible"), 2400);
  });

  // ──────────────────────────────────────────────
  // Boot
  // ──────────────────────────────────────────────
  showStep("frame");
  updateSummary();
}
