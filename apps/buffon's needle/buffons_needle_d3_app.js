import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let appData = null;

function drawNeedles(canvas, n) {
  const ctx = canvas.getContext("2d");
  const w = 760;
  const h = 520;
  canvas.width = w;
  canvas.height = h;

  const meta = appData.meta;
  const sx = w / meta.domain_w;
  const sy = h / meta.domain_h;

  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "#d1d5db";
  ctx.lineWidth = 1;
  for (let y = 0; y <= meta.domain_h; y += meta.line_spacing) {
    const py = h - y * sy;
    ctx.beginPath();
    ctx.moveTo(0, py);
    ctx.lineTo(w, py);
    ctx.stroke();
  }

  const x1 = appData.needles.x1;
  const y1 = appData.needles.y1;
  const x2 = appData.needles.x2;
  const y2 = appData.needles.y2;
  const cross = appData.needles.crossings;

  for (let i = 0; i < n; i++) {
    ctx.strokeStyle = cross[i] ? "#dc2626" : "#2563eb";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1[i] * sx, h - y1[i] * sy);
    ctx.lineTo(x2[i] * sx, h - y2[i] * sy);
    ctx.stroke();
  }
}

function fmt(v) {
  if (v === null || Number.isNaN(v)) return "-";
  return Number(v).toFixed(6);
}

function updateStats(n) {
  const s = appData.stats[String(n)];
  document.getElementById("stat-n").textContent = n.toLocaleString();
  document.getElementById("stat-crossings").textContent = s.crossings.toLocaleString();
  document.getElementById("stat-estimate").textContent = fmt(s.pi_estimate);
  document.getElementById("stat-true").textContent = Math.PI.toFixed(6);
  document.getElementById("stat-error").textContent = fmt(s.abs_error);
  document.getElementById("stat-stderr").textContent = fmt(s.std_error);
}

export async function initBuffonsNeedleApp() {
  appData = await d3.json("./buffon's needle/buffons_needle_data.json");

  const slider = document.getElementById("n-slider");
  const value = document.getElementById("n-value");
  const canvas = document.getElementById("canvas");

  slider.min = 1;
  slider.max = appData.meta.max_n;
  slider.step = 1;
  slider.value = appData.meta.default_n;

  function render() {
    const n = Number(slider.value);
    value.textContent = n.toLocaleString();
    drawNeedles(canvas, n);
    updateStats(n);
  }

  slider.addEventListener("input", render);
  render();
}
