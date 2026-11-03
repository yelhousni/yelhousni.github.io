(() => {
  "use strict";
  const key = "homepage-desktop-theme";
  const themes = ["classic", "sand", "terminal"];
  const normalize = (theme) => theme === "gray" ? "sand" : themes.includes(theme) ? theme : "classic";
  // Apply the saved palette before the stylesheet paints the page.
  let selected = "classic";
  try { selected = normalize(localStorage.getItem(key)); } catch { /* Storage is optional. */ }
  document.documentElement.dataset.theme = selected;

  document.addEventListener("DOMContentLoaded", () => {
    const root = document.querySelector(".theme-switcher");
    if (!root) return;
    const toggle = root.querySelector(".theme-toggle");
    const panel = root.querySelector("#theme-panel");
    const radios = [...root.querySelectorAll('[name="desktop-theme"]')];
    const note = root.querySelector("#theme-note");
    const sync = () => {
      document.documentElement.dataset.theme = selected;
      radios.forEach((radio) => { radio.checked = radio.value === selected; });
    };
    const close = (restoreFocus = false) => {
      panel.hidden = true;
      toggle.setAttribute("aria-expanded", "false");
      if (restoreFocus) toggle.focus({ preventScroll: true });
    };
    toggle.addEventListener("click", () => {
      if (!panel.hidden) { close(true); return; }
      panel.hidden = false;
      toggle.setAttribute("aria-expanded", "true");
      radios.find((radio) => radio.checked).focus({ preventScroll: true });
    });
    root.querySelector(".theme-close").addEventListener("click", () => close(true));
    radios.forEach((radio) => radio.addEventListener("change", () => {
      if (!radio.checked) return;
      selected = normalize(radio.value);
      sync();
      try {
        localStorage.setItem(key, selected);
        note.textContent = "Your choice is saved on this device.";
      } catch {
        note.textContent = "Theme applied for this visit. Browser storage is unavailable.";
      }
    }));
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !panel.hidden) {
        event.preventDefault();
        close(true);
      }
    });
    document.addEventListener("click", (event) => {
      if (!root.contains(event.target)) close();
    });
    document.addEventListener("focusin", (event) => {
      if (!root.contains(event.target)) close();
    });
    window.addEventListener("storage", (event) => {
      if (event.key === key || event.key === null) {
        selected = normalize(event.newValue);
        sync();
      }
    });
    sync();
    root.hidden = false;
  });
})();
