import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let appData = null;
let runIndex = {};

function regionPath(ctx, sx, sy, h) {
  ctx.strokeStyle = "#9ca3af";
  ctx.lineWidth = 2;

  const c1x = sx(-1), c2x = sx(1), cy = sy(0), r = Math.abs(sx(0) - sx(1));

  ctx.beginPath();
  ctx.arc(c1x, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(c2x, cy, r, 0, 2 * Math.PI);
  ctx.stroke();

}

function getRun(d, startLabel) {
  const dk = String(Number(d).toFixed(1));
  const idx = runIndex[`${dk}|${startLabel}`] ?? 0;
  return appData.chains[dk][startLabel][idx];
}

function drawPath(canvas, run, n, d) {
  const ctx = canvas.getContext("2d");
  const w = 760;
  const h = 520;
  canvas.width = w;
  canvas.height = h;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, w, h);

  const sx = d3.scaleLinear().domain([-2.4, 2.4]).range([40, w - 40]);
  const sy = d3.scaleLinear().domain([-1.8, 1.8]).range([h - 30, 30]);

  regionPath(ctx, sx, sy, h);

  const lastX = run.x[n - 1];
  const lastY = run.y[n - 1];
  const squareLeft = sx(lastX - d / 2);
  const squareRight = sx(lastX + d / 2);
  const squareTop = sy(lastY + d / 2);
  const squareBottom = sy(lastY - d / 2);

  // Show the local uniform proposal support around the current point.
  ctx.fillStyle = "rgba(250, 204, 21, 0.22)";
  ctx.strokeStyle = "rgba(202, 138, 4, 0.82)";
  ctx.lineWidth = 1.4;
  ctx.fillRect(squareLeft, squareTop, squareRight - squareLeft, squareBottom - squareTop);
  ctx.strokeRect(squareLeft, squareTop, squareRight - squareLeft, squareBottom - squareTop);

  // Keep the trajectory subtle so point markers are easier to read.
  ctx.strokeStyle = "rgba(37, 99, 235, 0.25)";
  ctx.lineWidth = 1.0;
  ctx.beginPath();
  ctx.moveTo(sx(run.x[0]), sy(run.y[0]));
  for (let i = 1; i < n; i++) {
    ctx.lineTo(sx(run.x[i]), sy(run.y[i]));
  }
  ctx.stroke();

  // Draw dark sample markers on top of the light trajectory.
  ctx.fillStyle = "#111827";
  for (let i = 0; i < n; i++) {
    ctx.beginPath();
    ctx.arc(sx(run.x[i]), sy(run.y[i]), 1.6, 0, 2 * Math.PI);
    ctx.fill();
  }

  const accepted =
    Array.isArray(run.accepted) && run.accepted.length > 0
      ? run.accepted
      : run.x.map((_, i) => (i > 0 && run.accepted_cum[i] === run.accepted_cum[i - 1] ? 0 : 1));
  const proposalX = Array.isArray(run.proposal_x) ? run.proposal_x : [];
  const proposalY = Array.isArray(run.proposal_y) ? run.proposal_y : [];

  ctx.strokeStyle = "#dc2626";
  ctx.lineWidth = 1.8;
  const cross = 4;
  for (let i = 1; i < n; i++) {
    if (accepted[i] !== 0) continue;
    const px = proposalX[i];
    const py = proposalY[i];
    if (px === null || py === null || !Number.isFinite(px) || !Number.isFinite(py)) continue;
    const cx = sx(px);
    const cy = sy(py);
    ctx.beginPath();
    ctx.moveTo(cx - cross, cy - cross);
    ctx.lineTo(cx + cross, cy + cross);
    ctx.moveTo(cx - cross, cy + cross);
    ctx.lineTo(cx + cross, cy - cross);
    ctx.stroke();
  }

  ctx.fillStyle = "#dc2626";
  ctx.beginPath();
  ctx.arc(sx(lastX), sy(lastY), 4, 0, 2 * Math.PI);
  ctx.fill();
}

function updateStats(run, n) {
  const accepted = run.accepted_cum[n - 1];
  const rate = n <= 1 ? 0 : accepted / (n - 1);
  document.getElementById("stat-acceptance").textContent = `${(100 * rate).toFixed(1)}%`;
  document.getElementById("stat-accepted").textContent = `${accepted} / ${Math.max(0, n - 1)}`;
  document.getElementById("stat-ess-x").textContent = Number(run.ess_x[n - 1]).toFixed(1);
  document.getElementById("stat-ess-y").textContent = Number(run.ess_y[n - 1]).toFixed(1);
}

function runningAverage(vals, n) {
  const out = new Array(n);
  let s = 0;
  for (let i = 0; i < n; i++) {
    s += vals[i];
    out[i] = s / (i + 1);
  }
  return out;
}

function acf(vals, n, maxLag = 100) {
  const series = vals.slice(0, n);
  const mean = d3.mean(series);
  const centered = series.map((v) => v - mean);
  const denom = d3.sum(centered.map((v) => v * v));
  const lagMax = Math.min(maxLag, n - 1);
  const out = new Array(lagMax + 1).fill(0);
  if (denom <= 1e-12) {
    out[0] = 1;
    return out;
  }
  out[0] = 1;
  for (let lag = 1; lag <= lagMax; lag++) {
    let num = 0;
    for (let t = lag; t < n; t++) {
      num += centered[t] * centered[t - lag];
    }
    out[lag] = num / denom;
  }
  return out;
}

function renderRunningAverages(svg, run, n) {
  const width = 520;
  const height = 280;
  const margin = { top: 18, right: 20, bottom: 34, left: 46 };
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const rx = runningAverage(run.x, n);
  const ry = runningAverage(run.y, n);
  const all = rx.concat(ry);

  const x = d3.scaleLinear().domain([1, n]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([d3.min(all), d3.max(all)]).nice().range([height - margin.bottom, margin.top]);

  const line = d3.line().x((_, i) => x(i + 1)).y((d) => y(d));
  svg.append("path").datum(rx).attr("fill", "none").attr("stroke", "#2563eb").attr("stroke-width", 2).attr("d", line);
  svg.append("path").datum(ry).attr("fill", "none").attr("stroke", "#dc2626").attr("stroke-width", 2).attr("d", line);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  const legend = svg.append("g").attr("transform", `translate(${width - 110}, ${margin.top + 6})`);
  legend.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0).attr("stroke", "#2563eb").attr("stroke-width", 2);
  legend.append("text").attr("x", 24).attr("y", 4).attr("font-size", 11).text("x avg");
  legend.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 16).attr("y2", 16).attr("stroke", "#dc2626").attr("stroke-width", 2);
  legend.append("text").attr("x", 24).attr("y", 20).attr("font-size", 11).text("y avg");
}

function renderACF(svg, run, n) {
  const width = 520;
  const height = 280;
  const margin = { top: 18, right: 20, bottom: 34, left: 46 };
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const acfX = acf(run.x, n, 100);
  const acfY = acf(run.y, n, 100);
  const lagMax = acfX.length - 1;

  const x = d3.scaleLinear().domain([0, lagMax]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([-0.2, 1]).range([height - margin.bottom, margin.top]);
  const line = d3.line().x((_, i) => x(i)).y((d) => y(d));

  svg.append("line").attr("x1", x(0)).attr("x2", x(lagMax)).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", "#9ca3af").attr("stroke-width", 1);
  svg.append("path").datum(acfX).attr("fill", "none").attr("stroke", "#2563eb").attr("stroke-width", 2).attr("d", line);
  svg.append("path").datum(acfY).attr("fill", "none").attr("stroke", "#dc2626").attr("stroke-width", 2).attr("d", line);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));

  const legend = svg.append("g").attr("transform", `translate(${width - 110}, ${margin.top + 6})`);
  legend.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0).attr("stroke", "#2563eb").attr("stroke-width", 2);
  legend.append("text").attr("x", 24).attr("y", 4).attr("font-size", 11).text("ACF x");
  legend.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 16).attr("y2", 16).attr("stroke", "#dc2626").attr("stroke-width", 2);
  legend.append("text").attr("x", 24).attr("y", 20).attr("font-size", 11).text("ACF y");
}

export async function initMetropolisRandomWalkApp() {
  appData = await d3.json("./metropolis random walk/metropolis_random_walk_data.json");

  const dSlider = document.getElementById("d-slider");
  const nSlider = document.getElementById("n-slider");
  const startSelect = document.getElementById("start-select");
  const dValue = document.getElementById("d-value");
  const nValue = document.getElementById("n-value");
  const canvas = document.getElementById("canvas");

  appData.meta.starts.forEach((s) => {
    const opt = document.createElement("option");
    opt.value = s.label;
    opt.textContent = s.label;
    startSelect.appendChild(opt);
  });

  dSlider.min = appData.meta.d_values[0];
  dSlider.max = appData.meta.d_values[appData.meta.d_values.length - 1];
  dSlider.step = 0.1;
  dSlider.value = appData.meta.default_d;

  nSlider.min = appData.meta.n_min;
  nSlider.max = appData.meta.n_max;
  nSlider.step = appData.meta.n_step;
  nSlider.value = appData.meta.default_n;

  startSelect.value = appData.meta.default_start;

  function render() {
    const d = Number(dSlider.value);
    const n = Number(nSlider.value);
    const start = startSelect.value;

    dValue.textContent = d.toFixed(1);
    nValue.textContent = n.toLocaleString();

    const run = getRun(d, start);
    drawPath(canvas, run, n, d);
    renderRunningAverages(d3.select("#mrw-running-svg"), run, n);
    renderACF(d3.select("#mrw-acf-svg"), run, n);
    updateStats(run, n);
  }

  function cycleRun() {
    const d = Number(dSlider.value).toFixed(1);
    const start = startSelect.value;
    const key = `${d}|${start}`;
    runIndex[key] = ((runIndex[key] ?? 0) + 1) % appData.meta.runs_per_combo;
    render();
  }

  dSlider.addEventListener("input", render);
  nSlider.addEventListener("input", render);
  startSelect.addEventListener("change", render);
  document.getElementById("resample-btn").addEventListener("click", cycleRun);

  render();
}
