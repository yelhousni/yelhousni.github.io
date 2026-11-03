(() => {
  "use strict";

  const canvas = document.querySelector("#desktop-canvas");
  const context = canvas?.getContext("2d");
  if (!context || !window.PointerEvent) return;

  const tools = document.querySelector("#paint-tools");
  const toggle = document.querySelector(".paint-toggle");
  const enabled = document.querySelector("#paint-enabled");
  const desktopOnly = document.querySelector("#paint-desktop-only");
  const undo = document.querySelector("#paint-undo");
  const clear = document.querySelector("#paint-clear");
  const size = document.querySelector("#paint-size");
  const announcement = document.querySelector("#paint-announcement");
  const strokes = [];
  let current = null;
  let pointerId = null;
  let color = "#ffffff";
  let tool = "pencil";
  let scale = 1;
  let resizeFrame = 0;

  const updateButtons = () => {
    undo.disabled = clear.disabled = strokes.length === 0;
  };

  const drawSegment = (stroke, from, to) => {
    context.globalCompositeOperation =
      stroke.tool === "eraser" ? "destination-out" : "source-over";
    context.strokeStyle = context.fillStyle = stroke.color;
    context.lineWidth = stroke.width;
    context.lineCap = context.lineJoin = "round";
    context.beginPath();
    if (!from) {
      context.arc(to.x, to.y, stroke.width / 2, 0, Math.PI * 2);
      context.fill();
    } else {
      context.moveTo(from.x, from.y);
      context.lineTo(to.x, to.y);
      context.stroke();
    }
  };

  const redraw = () => {
    context.clearRect(0, 0, canvas.width / scale, canvas.height / scale);
    strokes.forEach((stroke) => {
      stroke.points.forEach((point, index) => {
        drawSegment(stroke, stroke.points[index - 1], point);
      });
    });
  };

  const resize = () => {
    scale = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * scale);
    canvas.height = Math.round(window.innerHeight * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
    redraw();
  };

  const finishStroke = () => {
    if (pointerId !== null && canvas.hasPointerCapture(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
    current = null;
    pointerId = null;
    updateButtons();
  };

  const setEnabled = () => {
    finishStroke();
    canvas.classList.toggle("is-drawing-enabled", enabled.checked);
    if (!enabled.checked) restoreWindows();
  };

  const restoreWindows = () => {
    desktopOnly.checked = false;
    document.body.classList.remove("paint-desktop-only");
  };

  const selectTool = (name) => {
    tool = name;
    canvas.dataset.tool = name;
    tools.querySelectorAll("[data-paint-tool]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.paintTool === name));
    });
  };

  const setToolsOpen = (open) => {
    tools.hidden = !open;
    toggle.setAttribute("aria-expanded", String(open));
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (!enabled.checked || event.button !== 0 || !event.isPrimary || current) return;
    event.preventDefault();
    current = {
      tool,
      color,
      width: Number(size.value),
      points: [{ x: event.clientX, y: event.clientY }],
    };
    strokes.push(current);
    pointerId = event.pointerId;
    canvas.setPointerCapture(pointerId);
    drawSegment(current, null, current.points[0]);
    updateButtons();
  });

  const extendStroke = (event) => {
    if (!current || event.pointerId !== pointerId) return;
    const events = event.getCoalescedEvents?.() || [];
    (events.length ? events : [event]).forEach((sample) => {
      const previous = current.points[current.points.length - 1];
      const point = { x: sample.clientX, y: sample.clientY };
      if (Math.hypot(point.x - previous.x, point.y - previous.y) < 1) return;
      current.points.push(point);
      drawSegment(current, previous, point);
    });
  };
  canvas.addEventListener("pointermove", extendStroke);
  canvas.addEventListener("pointerup", (event) => {
    if (event.pointerId !== pointerId) return;
    extendStroke(event);
    finishStroke();
  });
  canvas.addEventListener("pointercancel", (event) => {
    if (event.pointerId === pointerId) finishStroke();
  });
  canvas.addEventListener("lostpointercapture", (event) => {
    if (event.pointerId === pointerId) finishStroke();
  });
  window.addEventListener("blur", finishStroke);
  window.addEventListener("resize", () => {
    cancelAnimationFrame(resizeFrame);
    resizeFrame = requestAnimationFrame(resize);
  });

  toggle.addEventListener("click", () => setToolsOpen(tools.hidden));
  document.querySelector("#paint-close").addEventListener("click", () => {
    setToolsOpen(false);
    toggle.focus();
  });
  tools.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      setToolsOpen(false);
      toggle.focus();
    }
  });
  enabled.addEventListener("change", setEnabled);
  desktopOnly.addEventListener("change", () => {
    document.body.classList.toggle("paint-desktop-only", desktopOnly.checked);
    if (desktopOnly.checked) {
      enabled.checked = true;
      setEnabled();
    }
  });
  document.querySelector(".task-current").addEventListener("click", restoreWindows);

  tools.querySelectorAll("[data-paint-tool]").forEach((button) => {
    button.addEventListener("click", () => {
      selectTool(button.dataset.paintTool);
      enabled.checked = true;
      setEnabled();
    });
  });
  tools.querySelectorAll("[data-paint-color]").forEach((button) => {
    button.addEventListener("click", () => {
      color = button.dataset.paintColor;
      tools.querySelectorAll("[data-paint-color]").forEach((swatch) => {
        swatch.setAttribute("aria-pressed", String(swatch === button));
      });
      selectTool("pencil");
      enabled.checked = true;
      setEnabled();
    });
  });
  undo.addEventListener("click", () => {
    finishStroke();
    strokes.pop();
    redraw();
    updateButtons();
    announcement.textContent = "Last stroke undone.";
  });
  clear.addEventListener("click", () => {
    finishStroke();
    strokes.length = 0;
    redraw();
    updateButtons();
    announcement.textContent = "Drawing cleared.";
  });

  // Mouse users can draw immediately. Touch users opt in to keep scrolling natural.
  enabled.checked = window.matchMedia("(pointer: fine)").matches;
  setEnabled();
  selectTool("pencil");
  canvas.hidden = false;
  toggle.hidden = false;
  document.body.classList.add("paint-ready");
  const hint = document.querySelector(".taskbar-note");
  if (hint) hint.textContent = "Drag on the background to draw · Paint for colors";
  resize();
})();
