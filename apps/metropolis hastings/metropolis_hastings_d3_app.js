import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let appData = null;
let runIndexByD = {};

function normalPdf(x) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
}

function getRun(d) {
  const di = String(Number(d).toFixed(1));
  const idx = runIndexByD[di] ?? 0;
  return appData.chains[di][idx];
}

function renderTrace(svg, samples, proposals, accepted, acceptedCum, n) {
  const width = 760;
  const height = 320;
  const margin = { top: 16, right: 18, bottom: 34, left: 46 };

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const ys = samples.slice(0, n);
  const safeProposals = Array.isArray(proposals) ? proposals : [];
  const pYs = safeProposals.slice(0, n).filter((v) => v !== null && Number.isFinite(v));
  const allY = ys.concat(pYs);
  const yMin = Math.min(-4, d3.min(allY));
  const yMax = Math.max(4, d3.max(allY));

  const x = d3.scaleLinear().domain([1, n]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([yMin, yMax]).nice().range([height - margin.bottom, margin.top]);

  const line = d3.line().x((_, i) => x(i + 1)).y((d) => y(d));
  svg.append("path").datum(ys).attr("fill", "none").attr("stroke", "#2563eb").attr("stroke-width", 1.8).attr("d", line);

  const points = ys.map((value, i) => ({
    t: i + 1,
    value,
  }));

  svg
    .append("g")
    .selectAll("circle")
    .data(points)
    .join("circle")
    .attr("cx", (d) => x(d.t))
    .attr("cy", (d) => y(d.value))
    .attr("r", 2.8)
    .attr("fill", "#ffffff")
    .attr("stroke", "#1d4ed8")
    .attr("stroke-width", 1.2);

  const safeAccepted =
    Array.isArray(accepted) && accepted.length > 0
      ? accepted
      : ys.map((_, i) => (i > 0 && acceptedCum[i] === acceptedCum[i - 1] ? 0 : 1));

  const rejectedProps = safeProposals
    .slice(0, n)
    .map((p, i) => ({ t: i + 1, p, rejected: i > 0 && safeAccepted[i] === 0 }))
    .filter((d) => d.rejected && d.p !== null && Number.isFinite(d.p));

  const crossSize = 4.5;
  svg
    .append("g")
    .selectAll("path")
    .data(rejectedProps)
    .join("path")
    .attr("d", (d) => {
      const px = x(d.t);
      const py = y(d.p);
      return `M ${px - crossSize} ${py - crossSize} L ${px + crossSize} ${py + crossSize} M ${px - crossSize} ${py + crossSize} L ${px + crossSize} ${py - crossSize}`;
    })
    .attr("fill", "none")
    .attr("stroke", "#dc2626")
    .attr("stroke-width", 1.8)
    .attr("stroke-linecap", "round");

  const legend = svg.append("g").attr("transform", `translate(${width - 215}, ${margin.top + 10})`);
  legend.append("circle").attr("cx", 0).attr("cy", 0).attr("r", 3).attr("fill", "#fff").attr("stroke", "#1d4ed8").attr("stroke-width", 1.2);
  legend.append("text").attr("x", 10).attr("y", 4).attr("font-size", 11).attr("fill", "#1f2937").text("Sample points");
  legend
    .append("path")
    .attr("d", "M -4 14 L 4 22 M -4 22 L 4 14")
    .attr("fill", "none")
    .attr("stroke", "#dc2626")
    .attr("stroke-width", 1.8)
    .attr("stroke-linecap", "round");
  legend.append("text").attr("x", 10).attr("y", 22).attr("font-size", 11).attr("fill", "#1f2937").text("Rejected proposals (x)");

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
}

function renderHistogram(svg, samples, n) {
  const width = 760;
  const height = 320;
  const margin = { top: 16, right: 18, bottom: 34, left: 46 };
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const vals = samples.slice(0, n);
  const x = d3.scaleLinear().domain([-4, 4]).range([margin.left, width - margin.right]);
  const bins = d3.bin().domain(x.domain()).thresholds(32)(vals);

  const densityScale = d3
    .scaleLinear()
    .domain([0, d3.max(bins, (b) => b.length / n / (bins[0].x1 - bins[0].x0)) * 1.15])
    .nice()
    .range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .selectAll("rect")
    .data(bins)
    .join("rect")
    .attr("x", (d) => x(d.x0) + 1)
    .attr("y", (d) => densityScale(d.length / n / (d.x1 - d.x0)))
    .attr("width", (d) => Math.max(0, x(d.x1) - x(d.x0) - 1))
    .attr("height", (d) => densityScale(0) - densityScale(d.length / n / (d.x1 - d.x0)))
    .attr("fill", "#60a5fa")
    .attr("opacity", 0.8);

  const pdfX = d3.range(-4, 4.01, 0.05);
  const line = d3
    .line()
    .x((d) => x(d))
    .y((d) => densityScale(normalPdf(d)));

  svg.append("path").datum(pdfX).attr("fill", "none").attr("stroke", "#dc2626").attr("stroke-width", 2).attr("d", line);
  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(densityScale));
}

function updateStats(run, n) {
  const accepted = run.accepted_cum[n - 1];
  const rate = n <= 1 ? 0 : accepted / (n - 1);
  document.getElementById("stat-acceptance").textContent = `${(100 * rate).toFixed(1)}%`;
  document.getElementById("stat-accepted").textContent = `${accepted} / ${Math.max(0, n - 1)}`;
  document.getElementById("stat-ess").textContent = Number(run.esses[n - 1]).toFixed(1);
  document.getElementById("stat-mean").textContent = Number(run.means[n - 1]).toFixed(3);
  document.getElementById("stat-std").textContent = Number(run.stds[n - 1]).toFixed(3);
}

export async function initMetropolisHastingsApp() {
  appData = await d3.json("./metropolis hastings/metropolis_hastings_data.json");

  appData.meta.d_values.forEach((d) => {
    runIndexByD[String(d.toFixed(1))] = 0;
  });

  const dSlider = document.getElementById("d-slider");
  const nSlider = document.getElementById("n-slider");
  const dValue = document.getElementById("d-value");
  const nValue = document.getElementById("n-value");
  const resample = document.getElementById("resample-btn");

  dSlider.min = appData.meta.d_values[0];
  dSlider.max = appData.meta.d_values[appData.meta.d_values.length - 1];
  dSlider.step = 0.5;
  dSlider.value = appData.meta.default_d;

  nSlider.min = appData.meta.n_min;
  nSlider.max = appData.meta.n_max;
  nSlider.step = 1;
  nSlider.value = appData.meta.default_n;

  function render() {
    const d = Number(dSlider.value).toFixed(1);
    const n = Number(nSlider.value);
    dValue.textContent = Number(d).toFixed(1);
    nValue.textContent = n.toLocaleString();

    const run = getRun(d);
    renderTrace(d3.select("#mh-trace-svg"), run.samples, run.proposals, run.accepted, run.accepted_cum, n);
    renderHistogram(d3.select("#mh-hist-svg"), run.samples, n);
    updateStats(run, n);
  }

  dSlider.addEventListener("input", render);
  nSlider.addEventListener("input", render);
  resample.addEventListener("click", () => {
    const d = Number(dSlider.value).toFixed(1);
    runIndexByD[d] = (runIndexByD[d] + 1) % appData.meta.runs_per_d;
    render();
  });

  render();
}
