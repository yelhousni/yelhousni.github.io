(() => {
  "use strict";
  const dialog = document.querySelector("#rss-dialog");
  if (!dialog || typeof dialog.showModal !== "function") return;
  const field = dialog.querySelector("#rss-feed-url");
  const copy = dialog.querySelector("#rss-copy");
  const status = dialog.querySelector("#rss-status");
  let opener = null;
  let session = 0;

  document.querySelectorAll("[data-rss-subscribe]").forEach((link) => {
    link.setAttribute("aria-haspopup", "dialog");
    link.setAttribute("aria-controls", dialog.id);
    link.addEventListener("click", (event) => {
      if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      opener = link;
      session++;
      status.textContent = "";
      copy.disabled = false;
      dialog.showModal();
      copy.focus({ preventScroll: true });
    });
  });
  dialog.querySelector("#rss-close").addEventListener("click", () => dialog.close());
  dialog.addEventListener("keydown", (event) => {
    if (event.key !== "Tab") return;
    const controls = [...dialog.querySelectorAll("button:not(:disabled), input, a[href]")];
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
  dialog.addEventListener("close", () => {
    session++;
    if (opener?.isConnected) opener.focus({ preventScroll: true });
  });
  dialog.addEventListener("click", (event) => {
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.close();
  });
  field.addEventListener("click", () => field.select());
  copy.addEventListener("click", async () => {
    const current = session;
    copy.disabled = true;
    try {
      await navigator.clipboard.writeText(field.value);
      if (dialog.open && current === session) status.textContent = "Copied! Paste the URL into your RSS reader.";
    } catch {
      if (!dialog.open || current !== session) return;
      field.focus({ preventScroll: true });
      field.select();
      status.textContent = "Select and copy the address above, then paste it into your RSS reader.";
    } finally {
      if (current === session) copy.disabled = false;
    }
  });
})();
