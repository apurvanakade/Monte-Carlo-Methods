let pyodide;
let pyReady = false;
let updateTimeout;
let isUpdating = false;
let graphInfo = null;
let preparedCacheKey = null;

export async function initPyodide() {
    pyodide = await loadPyodide();

    await pyodide.loadPackage(["numpy", "matplotlib", "scipy", "micropip"]);
    await pyodide.runPythonAsync(`
import micropip
await micropip.install("networkx")
`);

    const computationCode = await fetch("./random walks on graphs/random_walks_on_graphs_computation.py").then((r) => r.text());
    await pyodide.runPythonAsync(computationCode);

    const visualizationCode = await fetch("./random walks on graphs/random_walks_on_graphs_visualization.py").then((r) => r.text());
    await pyodide.runPythonAsync(visualizationCode);

    await pyodide.runPythonAsync(`
simulator = RandomWalkOnGraphsSimulation()
visualizer = RandomWalkOnGraphsVisualizer()
`);

    const pyGraphInfo = await pyodide.runPythonAsync("simulator.get_graph_info()");
    graphInfo = pyGraphInfo.toJs({ dict_converter: Object.fromEntries });

    pyReady = true;
}

export function getGraphInfo() {
    return graphInfo;
}

function escapePythonString(value) {
    return String(value).replace(/\\/g, "\\\\").replace(/'/g, "\\'");
}

function buildCacheKey(graphName, startNodeIdx, maxTime) {
    return `${graphName}::${startNodeIdx}::${maxTime}`;
}

export async function precomputeData(graphName, startNodeIdx, maxTime = 200) {
    if (!pyReady) return;

    const key = buildCacheKey(graphName, startNodeIdx, maxTime);
    if (preparedCacheKey === key) {
        return;
    }

    const safeGraph = escapePythonString(graphName);
    await pyodide.runPythonAsync(`
simulator.warm_cache('${safeGraph}', ${startNodeIdx}, max_time=${maxTime})
`);
    preparedCacheKey = key;
}

export async function updatePlot(graphName, startNodeIdx, timeStep, maxTime = 200) {
    if (!pyReady || isUpdating) return null;

    isUpdating = true;

    try {
        await precomputeData(graphName, startNodeIdx, maxTime);
        const safeGraph = escapePythonString(graphName);
        const result = await pyodide.runPythonAsync(`
sim_data = simulator.run('${safeGraph}', ${startNodeIdx}, ${timeStep}, max_time=${maxTime})
image = visualizer.render(sim_data)
{
    'image': image,
    'total_variation': sim_data['total_variation'],
    'l2_distance': sim_data['l2_distance'],
    'spectral_gap': sim_data['spectral_gap'],
    'mixing_time': sim_data['mixing_time'],
    'max_time': sim_data['max_time']
}
        `);

        isUpdating = false;
        return result.toJs({ dict_converter: Object.fromEntries });
    } catch (err) {
        console.error("Error generating plot:", err);
        isUpdating = false;
        throw err;
    }
}

export function debouncedUpdate(graphName, startNodeIdx, timeStep, maxTime, callback) {
    clearTimeout(updateTimeout);

    updateTimeout = setTimeout(async () => {
        try {
            const data = await updatePlot(graphName, startNodeIdx, timeStep, maxTime);
            if (data && callback) {
                callback(data);
            }
        } catch (err) {
            console.error("Debounced update failed:", err);
        }
    }, 120);
}

export function renderImageToCanvas(canvas, imageData) {
    const ctx = canvas.getContext("2d");

    const height = imageData.length;
    const width = imageData[0].length;

    canvas.width = width;
    canvas.height = height;

    const canvasImageData = ctx.createImageData(width, height);
    const pixelData = canvasImageData.data;

    let pixelIndex = 0;
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            pixelData[pixelIndex++] = imageData[y][x][0];
            pixelData[pixelIndex++] = imageData[y][x][1];
            pixelData[pixelIndex++] = imageData[y][x][2];
            pixelData[pixelIndex++] = 255;
        }
    }

    ctx.putImageData(canvasImageData, 0, 0);
}

export function updateStats(stats) {
    document.getElementById("stat-tv").textContent = stats.total_variation.toFixed(6);
    document.getElementById("stat-l2").textContent = stats.l2_distance.toFixed(6);
    document.getElementById("stat-gap").textContent = stats.spectral_gap.toFixed(6);
    document.getElementById("stat-mixing").textContent = stats.mixing_time === null ? `> ${stats.max_time}` : String(stats.mixing_time);
}
