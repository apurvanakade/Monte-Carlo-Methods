import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let appData = null;

function drawPoints(canvas, n) {
  const ctx = canvas.getContext("2d");
  const size = 640;
  canvas.width = size;
  canvas.height = size;

  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, size, size);

  // unit circle boundary
  ctx.strokeStyle = "#111827";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(size / 2, size / 2, size / 2 - 10, 0, 2 * Math.PI);
  ctx.stroke();

  const xs = appData.points.x;
  const ys = appData.points.y;
  const inside = appData.points.inside;

  for (let i = 0; i < n; i++) {
    const px = ((xs[i] + 1) / 2) * size;
    const py = (1 - (ys[i] + 1) / 2) * size;
    ctx.fillStyle = inside[i] ? "#2563eb" : "#f97316";
    ctx.fillRect(px, py, 2, 2);
  }
}

function updateStats(n) {
  const stats = appData.stats[String(n)];
  document.getElementById("stat-n").textContent = n.toLocaleString();
  document.getElementById("stat-inside").textContent = stats.n_inside.toLocaleString();
  document.getElementById("stat-estimate").textContent = stats.pi_estimate.toFixed(6);
  document.getElementById("stat-true").textContent = Math.PI.toFixed(6);
  document.getElementById("stat-error").textContent = stats.abs_error.toFixed(6);
  document.getElementById("stat-stderr").textContent = stats.std_error.toFixed(6);
}

export async function initEstimatingPiApp() {
  appData = await d3.json("./estimating pi/estimating_pi_data.json");

  const slider = document.getElementById("n-slider");
  const value = document.getElementById("n-value");
  const canvas = document.getElementById("canvas");

  slider.min = appData.meta.min_n;
  slider.max = appData.meta.max_n;
  slider.step = appData.meta.step;
  slider.value = appData.meta.default_n;

  function render() {
    const n = Number(slider.value);
    value.textContent = n.toLocaleString();
    drawPoints(canvas, n);
    updateStats(n);
  }

  slider.addEventListener("input", render);
  render();
}
