import * as d3 from "https://cdn.jsdelivr.net/npm/d3@7/+esm";

let appData = null;
let graphName = null;
let startIdx = 0;
let timeStep = 0;
let timerId = null;

const colorScale = d3.scaleSequential(d3.interpolateRdYlBu).domain([1, 0]);

function vertexFill(prob) {
  const c = d3.color(colorScale(prob));
  return c ? c.brighter(1.2).formatHex() : "#dbeafe";
}

function stopAnimation() {
  if (timerId !== null) {
    clearInterval(timerId);
    timerId = null;
  }
}

function getCurrentGraph() {
  return appData.graphs[graphName];
}

function getCurrentSeries() {
  return getCurrentGraph().starts[String(startIdx)];
}

function clampStart(graph, value) {
  return Math.max(0, Math.min(graph.n_nodes - 1, value));
}

function renderGraph(svg, graph) {
  const width = 720;
  const height = 480;
  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const xExtent = d3.extent(graph.positions, (d) => d[0]);
  const yExtent = d3.extent(graph.positions, (d) => d[1]);
  const x = d3.scaleLinear().domain(xExtent).range([50, width - 50]);
  const y = d3.scaleLinear().domain(yExtent).range([height - 40, 40]);

  const nodePos = graph.positions.map((p) => [x(p[0]), y(p[1])]);

  svg
    .append("g")
    .selectAll("line")
    .data(graph.edges)
    .join("line")
    .attr("x1", (d) => nodePos[d[0]][0])
    .attr("y1", (d) => nodePos[d[0]][1])
    .attr("x2", (d) => nodePos[d[1]][0])
    .attr("y2", (d) => nodePos[d[1]][1])
    .attr("stroke", "#9aa6b2")
    .attr("stroke-opacity", 0.5)
    .attr("stroke-width", 1.4);

  const radius = graph.n_nodes <= 20 ? 11 : graph.n_nodes <= 40 ? 8 : 6;

  svg
    .append("g")
    .attr("class", "rw-nodes")
    .selectAll("circle")
    .data(d3.range(graph.n_nodes))
    .join("circle")
    .attr("cx", (d) => nodePos[d][0])
    .attr("cy", (d) => nodePos[d][1])
    .attr("r", radius)
    .attr("stroke", "#111")
    .attr("stroke-width", 0.9)
    .attr("fill", "#ddd");

  if (graph.n_nodes <= 30) {
    svg
      .append("g")
      .selectAll("text")
      .data(d3.range(graph.n_nodes))
      .join("text")
      .attr("x", (d) => nodePos[d][0])
      .attr("y", (d) => nodePos[d][1] + 3)
      .attr("text-anchor", "middle")
      .attr("font-size", 9)
      .attr("fill", "#1f2937")
      .text((d) => d);
  }
}

function renderTvChart(svg, graph, series) {
  const width = 520;
  const height = 260;
  const margin = { top: 20, right: 15, bottom: 35, left: 45 };

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const x = d3.scaleLinear().domain([0, appData.max_time]).range([margin.left, width - margin.right]);
  const y = d3.scaleLinear().domain([0, Math.max(0.11, d3.max(series.tv))]).nice().range([height - margin.bottom, margin.top]);

  const line = d3
    .line()
    .x((_, i) => x(i))
    .y((d) => y(d));

  svg.append("path").datum(series.tv).attr("fill", "none").attr("stroke", "#1f77b4").attr("stroke-width", 2).attr("d", line);
  svg
    .append("line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", y(0.1))
    .attr("y2", y(0.1))
    .attr("stroke", "#d62728")
    .attr("stroke-dasharray", "6 4");

  if (series.mixing_time !== null) {
    svg
      .append("line")
      .attr("x1", x(series.mixing_time))
      .attr("x2", x(series.mixing_time))
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom)
      .attr("stroke", "#2ca02c")
      .attr("stroke-dasharray", "4 4");
  }

  svg.append("circle").attr("class", "rw-tv-dot").attr("r", 5).attr("fill", "#111827");

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).ticks(8));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
}

function renderSpectrum(svg, graph) {
  const values = graph.eigenvalues.map((v) => Math.abs(v));
  const width = 980;
  const height = 230;
  const margin = { top: 18, right: 15, bottom: 35, left: 45 };

  svg.attr("viewBox", `0 0 ${width} ${height}`);
  svg.selectAll("*").remove();

  const x = d3.scaleBand().domain(d3.range(values.length)).range([margin.left, width - margin.right]).padding(0.15);
  const y = d3.scaleLinear().domain([0, 1]).range([height - margin.bottom, margin.top]);

  svg
    .append("g")
    .selectAll("rect")
    .data(values)
    .join("rect")
    .attr("x", (_, i) => x(i))
    .attr("y", (d) => y(d))
    .attr("width", x.bandwidth())
    .attr("height", (d) => y(0) - y(d))
    .attr("fill", (_, i) => (i === 0 ? "#ef4444" : "#3b82f6"))
    .attr("opacity", 0.85);

  svg.append("g").attr("transform", `translate(0,${height - margin.bottom})`).call(d3.axisBottom(x).tickValues([]));
  svg.append("g").attr("transform", `translate(${margin.left},0)`).call(d3.axisLeft(y));
}

function updateDynamicUI() {
  const graph = getCurrentGraph();
  const series = getCurrentSeries();

  const probs = series.distributions[timeStep];

  d3
    .selectAll(".rw-nodes circle")
    .data(probs)
    .attr("fill", (d) => vertexFill(d))
    .attr("stroke", (_, i) => (i === startIdx ? "#f97316" : "#111"))
    .attr("stroke-width", (_, i) => (i === startIdx ? 2.8 : 0.9));

  const tvSvg = d3.select("#rw-tv-svg");
  const width = 520;
  const height = 260;
  const margin = { top: 20, right: 15, bottom: 35, left: 45 };
  const x = d3.scaleLinear().domain([0, appData.max_time]).range([margin.left, width - margin.right]);
  const y = d3
    .scaleLinear()
    .domain([0, Math.max(0.11, d3.max(series.tv))])
    .nice()
    .range([height - margin.bottom, margin.top]);

  tvSvg.select(".rw-tv-dot").attr("cx", x(timeStep)).attr("cy", y(series.tv[timeStep]));

  document.getElementById("stat-tv").textContent = series.tv[timeStep].toFixed(6);
  document.getElementById("stat-l2").textContent = series.l2[timeStep].toFixed(6);
  document.getElementById("stat-gap").textContent = graph.spectral_gap.toFixed(6);
  document.getElementById("stat-mixing").textContent =
    series.mixing_time === null ? `> ${appData.max_time}` : String(series.mixing_time);
  document.getElementById("stat-max").textContent = series.max_prob[timeStep].toFixed(6);
}

function rebuildForGraphOrStart() {
  const graph = getCurrentGraph();
  const series = getCurrentSeries();

  renderGraph(d3.select("#rw-graph-svg"), graph);
  renderTvChart(d3.select("#rw-tv-svg"), graph, series);
  renderSpectrum(d3.select("#rw-spectrum-svg"), graph);
  updateDynamicUI();
}

function bindControls() {
  const graphSelect = document.getElementById("graph-select");
  const startSlider = document.getElementById("start-slider");
  const startValue = document.getElementById("start-value");
  const timeSlider = document.getElementById("time-slider");
  const timeValue = document.getElementById("time-value");

  graphSelect.addEventListener("change", () => {
    stopAnimation();
    graphName = graphSelect.value;
    const graph = getCurrentGraph();
    startIdx = clampStart(graph, startIdx);
    startSlider.max = graph.n_nodes - 1;
    startSlider.value = startIdx;
    startValue.textContent = String(startIdx);
    timeStep = 0;
    timeSlider.value = 0;
    timeValue.textContent = "0";
    rebuildForGraphOrStart();
  });

  startSlider.addEventListener("input", () => {
    stopAnimation();
    const graph = getCurrentGraph();
    startIdx = clampStart(graph, Number(startSlider.value));
    startValue.textContent = String(startIdx);
    rebuildForGraphOrStart();
  });

  timeSlider.addEventListener("input", () => {
    timeStep = Number(timeSlider.value);
    timeValue.textContent = String(timeStep);
    updateDynamicUI();
  });

  document.getElementById("play-btn").addEventListener("click", () => {
    if (timerId !== null) return;
    timerId = setInterval(() => {
      if (timeStep >= appData.max_time) {
        timeStep = 0;
      } else {
        timeStep += 1;
      }
      timeSlider.value = timeStep;
      timeValue.textContent = String(timeStep);
      updateDynamicUI();
    }, 120);
  });

  document.getElementById("pause-btn").addEventListener("click", () => {
    stopAnimation();
  });
}

export async function initRandomWalksApp() {
  appData = await d3.json("./random walks on graphs/random_walks_on_graphs_data.json");

  const graphSelect = document.getElementById("graph-select");
  for (const name of Object.keys(appData.graphs)) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    graphSelect.appendChild(opt);
  }

  graphName = appData.default_graph;
  startIdx = appData.default_start;
  timeStep = appData.default_time;

  graphSelect.value = graphName;

  const graph = getCurrentGraph();
  const startSlider = document.getElementById("start-slider");
  startSlider.max = graph.n_nodes - 1;
  startSlider.value = startIdx;
  document.getElementById("start-value").textContent = String(startIdx);

  const timeSlider = document.getElementById("time-slider");
  timeSlider.max = appData.max_time;
  timeSlider.value = timeStep;
  document.getElementById("time-value").textContent = String(timeStep);

  bindControls();
  rebuildForGraphOrStart();
}
