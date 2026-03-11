let d3 = null;

async function loadD3() {
  const candidates = [
    "https://cdn.jsdelivr.net/npm/d3@7/+esm",
    "https://esm.sh/d3@7"
  ];

  let lastErr = null;
  for (const url of candidates) {
    try {
      return await import(url);
    } catch (err) {
      lastErr = err;
    }
  }
  throw lastErr || new Error("Unable to load d3 module.");
}

function normalSample(rng) {
  const u1 = Math.max(1e-12, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

function makeRng(seed) {
  let state = seed >>> 0;
  return function rng() {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function generateGibbsPath({ rho, nSteps, seed, x0 = 2.5, y0 = -2.5 }) {
  const rng = makeRng(seed);
  const sigma = Math.sqrt(1 - rho * rho);

  const x = [x0];
  const y = [y0];
  const intermX = [x0];
  const intermY = [y0];

  for (let t = 1; t <= nSteps; t++) {
    const prevY = y[t - 1];
    const newX = rho * prevY + sigma * normalSample(rng);
    const newY = rho * newX + sigma * normalSample(rng);

    intermX.push(newX);
    intermY.push(prevY);
    x.push(newX);
    y.push(newY);
  }

  return { x, y, intermX, intermY };
}

function acf(values, maxLag = 40) {
  const n = values.length;
  if (n < 2) return [1];

  const mean = d3.mean(values);
  const centered = values.map((v) => v - mean);
  const denom = d3.sum(centered.map((v) => v * v));
  const lagMax = Math.min(maxLag, n - 1);
  const out = new Array(lagMax + 1).fill(0);

  if (!Number.isFinite(denom) || denom < 1e-12) {
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

function computeEss(values) {
  const n = values.length;
  if (n < 2) return n;
  const rhos = acf(values, Math.min(n - 1, 300));
  let sumRho = 0;
  for (let k = 1; k < rhos.length; k++) {
    if (rhos[k] <= 0) break;
    sumRho += rhos[k];
  }
  return n / Math.max(1, 1 + 2 * sumRho);
}

function updateStats(statsId, chain, n) {
  const el = document.getElementById(statsId);
  if (!el) return;
  const xSeries = chain.x.slice(1, n + 1);
  const ySeries = chain.y.slice(1, n + 1);
  const essX = computeEss(xSeries);
  const essY = computeEss(ySeries);
  const deffX = n / Math.max(essX, 0.001);
  const deffY = n / Math.max(essY, 0.001);
  el.innerHTML =
    `<span>ESS x: <strong>${essX.toFixed(1)}</strong></span>` +
    `<span>ESS y: <strong>${essY.toFixed(1)}</strong></span>` +
    `<span>DEFF x: <strong>${deffX.toFixed(2)}</strong></span>` +
    `<span>DEFF y: <strong>${deffY.toFixed(2)}</strong></span>`;
}

function drawTrajectory(svgSelector, chain, n) {
  const svg = d3.select(svgSelector);
  const width = 560;
  const height = 460;
  const margin = { top: 14, right: 14, bottom: 36, left: 42 };

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const xVals = chain.x.slice(0, n + 1).concat(chain.intermX.slice(0, n + 1));
  const yVals = chain.y.slice(0, n + 1).concat(chain.intermY.slice(0, n + 1));

  const xExtent = d3.extent(xVals);
  const yExtent = d3.extent(yVals);
  const xCenter = 0.5 * (xExtent[0] + xExtent[1]);
  const yCenter = 0.5 * (yExtent[0] + yExtent[1]);
  const xHalf = 0.5 * (xExtent[1] - xExtent[0]);
  const yHalf = 0.5 * (yExtent[1] - yExtent[0]);
  const half = Math.max(xHalf, yHalf, 1.0);

  const xScale = d3
    .scaleLinear()
    .domain([xCenter - half, xCenter + half])
    .nice()
    .range([margin.left, width - margin.right]);
  const yScale = d3
    .scaleLinear()
    .domain([yCenter - half, yCenter + half])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const contourDomain = d3.range(-3.4, 3.41, 0.15);
  const contourPoints = [];
  for (const xv of contourDomain) {
    for (const yv of contourDomain) {
      contourPoints.push([xv, yv]);
    }
  }

  svg.append("g")
    .selectAll("circle")
    .data(contourPoints)
    .join("circle")
    .attr("cx", (d) => xScale(d[0]))
    .attr("cy", (d) => yScale(d[1]))
    .attr("r", 0.8)
    .attr("fill", "#e5e7eb")
    .attr("opacity", 0.45);

  const line = d3.line().x((d) => xScale(d[0])).y((d) => yScale(d[1]));

  const tailSteps = 5;
  const startStep = Math.max(1, n - tailSteps + 1);
  for (let t = startStep; t <= n; t++) {
    const age = n - t;
    const alpha = 0.25 + 0.75 * (1 - age / tailSteps);
    const seg = [
      [chain.x[t - 1], chain.y[t - 1]],
      [chain.intermX[t], chain.intermY[t]],
      [chain.x[t], chain.y[t]]
    ];

    svg.append("path")
      .datum(seg)
      .attr("fill", "none")
      .attr("stroke", "#9ca3af")
      .attr("stroke-width", 2.0)
      .attr("opacity", alpha)
      .attr("d", line);
  }

  const interm = d3
    .range(startStep, n + 1)
    .map((t) => ({ x: chain.intermX[t], y: chain.intermY[t], age: n - t }));
  const finals = d3.range(1, n + 1).map((t) => ({ x: chain.x[t], y: chain.y[t] }));

  svg.append("g")
    .selectAll("circle")
    .data(interm)
    .join("circle")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", 2.2)
    .attr("fill", "#f97316")
    .attr("opacity", (d) => 0.25 + 0.75 * (1 - d.age / tailSteps));

  svg.append("g")
    .selectAll("circle")
    .data(finals)
    .join("circle")
    .attr("cx", (d) => xScale(d.x))
    .attr("cy", (d) => yScale(d.y))
    .attr("r", 2.2)
    .attr("fill", "#2563eb")
    .attr("opacity", 0.85);

  const lastX = chain.x[n];
  const lastY = chain.y[n];
  svg.append("circle")
    .attr("cx", xScale(lastX))
    .attr("cy", yScale(lastY))
    .attr("r", 4.2)
    .attr("fill", "#dc2626");

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(7));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(7));

  svg.append("text")
    .attr("x", width / 2)
    .attr("y", height - 6)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .text("x");

  svg.append("text")
    .attr("x", 14)
    .attr("y", height / 2)
    .attr("text-anchor", "middle")
    .attr("font-size", 11)
    .attr("transform", `rotate(-90, 14, ${height / 2})`)
    .text("y");
}

function drawAcf(svgSelector, chain, n) {
  const svg = d3.select(svgSelector);
  const width = 560;
  const height = 320;
  const margin = { top: 14, right: 14, bottom: 36, left: 42 };

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const xSeries = chain.x.slice(1, n + 1);
  const ySeries = chain.y.slice(1, n + 1);
  const acfX = acf(xSeries, 45);
  const acfY = acf(ySeries, 45);
  const lagMax = acfX.length - 1;

  const xScale = d3.scaleLinear().domain([0, lagMax]).range([margin.left, width - margin.right]);
  const yScale = d3.scaleLinear().domain([-0.25, 1]).range([height - margin.bottom, margin.top]);
  const line = d3.line().x((_, i) => xScale(i)).y((d) => yScale(d));

  svg.append("line")
    .attr("x1", xScale(0))
    .attr("x2", xScale(lagMax))
    .attr("y1", yScale(0))
    .attr("y2", yScale(0))
    .attr("stroke", "#9ca3af")
    .attr("stroke-width", 1);

  svg.append("path")
    .datum(acfX)
    .attr("fill", "none")
    .attr("stroke", "#2563eb")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.append("path")
    .datum(acfY)
    .attr("fill", "none")
    .attr("stroke", "#f97316")
    .attr("stroke-width", 2)
    .attr("d", line);

  svg.append("g")
    .attr("transform", `translate(0,${height - margin.bottom})`)
    .call(d3.axisBottom(xScale).ticks(8));

  svg.append("g")
    .attr("transform", `translate(${margin.left},0)`)
    .call(d3.axisLeft(yScale).ticks(6));

  const legend = svg.append("g").attr("transform", `translate(${width - 110}, ${margin.top + 6})`);
  legend.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 0).attr("y2", 0).attr("stroke", "#2563eb").attr("stroke-width", 2);
  legend.append("text").attr("x", 24).attr("y", 4).attr("font-size", 11).text("ACF x");
  legend.append("line").attr("x1", 0).attr("x2", 18).attr("y1", 16).attr("y2", 16).attr("stroke", "#f97316").attr("stroke-width", 2);
  legend.append("text").attr("x", 24).attr("y", 20).attr("font-size", 11).text("ACF y");
}

export async function initGibbsSamplingApp() {
  const status = document.getElementById("gibbs-status");
  const stepsSlider = document.getElementById("steps-slider");
  const stepsValue = document.getElementById("steps-value");
  const resampleBtn = document.getElementById("resample-btn");

  try {
    d3 = await loadD3();
  } catch (err) {
    if (status) {
      status.style.display = "block";
      status.textContent = "Could not load visualization library (d3). Check your connection and refresh.";
    }
    throw err;
  }

  const maxSteps = Number(stepsSlider.max);

  let baseSeed = 20260311;
  let chainRho0 = generateGibbsPath({ rho: 0.0, nSteps: maxSteps, seed: baseSeed + 1 });
  let chainRho7 = generateGibbsPath({ rho: 0.9, nSteps: maxSteps, seed: baseSeed + 2 });

  function render() {
    const n = Number(stepsSlider.value);
    stepsValue.textContent = String(n);

    drawTrajectory("#gibbs-rho0-traj", chainRho0, n);
    drawTrajectory("#gibbs-rho7-traj", chainRho7, n);
    drawAcf("#gibbs-rho0-acf", chainRho0, n);
    drawAcf("#gibbs-rho7-acf", chainRho7, n);
    updateStats("stats-rho0", chainRho0, n);
    updateStats("stats-rho7", chainRho7, n);
  }

  function resample() {
    baseSeed = (baseSeed + 7919) % 2147483647;
    chainRho0 = generateGibbsPath({ rho: 0.0, nSteps: maxSteps, seed: baseSeed + 1 });
    chainRho7 = generateGibbsPath({ rho: 0.9, nSteps: maxSteps, seed: baseSeed + 2 });
    render();
  }

  stepsSlider.addEventListener("input", render);
  resampleBtn.addEventListener("click", resample);

  render();
}
