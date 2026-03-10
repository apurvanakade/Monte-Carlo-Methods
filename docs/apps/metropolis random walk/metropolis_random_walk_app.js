/**
 * Metropolis Random Walk App
 * Handles Pyodide initialization and UI interactions
 */

let pyodide;
let pyReady = false;
let updateTimeout;
let isUpdating = false;
let cachedD = null;
const MAX_SAMPLES = 1000;

/**
 * Initialize Pyodide and load required packages and modules
 */
export async function initPyodide() {
    pyodide = await loadPyodide();
    
    // Install required packages
    await pyodide.loadPackage(['numpy', 'matplotlib']);
    
    // Load computation module
    const computationCode = await fetch('./metropolis random walk/metropolis_random_walk_computation.py').then(r => r.text());
    await pyodide.runPythonAsync(computationCode);
    
    // Load visualization module
    const visualizationCode = await fetch('./metropolis random walk/metropolis_random_walk_visualization.py').then(r => r.text());
    await pyodide.runPythonAsync(visualizationCode);
    
    // Initialize Python objects
    await pyodide.runPythonAsync(`
sampler = MetropolisRandomWalk()
visualizer = MetropolisRandomWalkVisualizer()
cached_sampler_data = None
    `);
    
    pyReady = true;
}

/**
 * Generate new samples with max samples and cache them
 * @param {number} d - Side length of square proposal
 * @param {number} x0 - Starting x coordinate
 * @param {number} y0 - Starting y coordinate
 */
export async function generateSamples(d, x0, y0) {
    if (!pyReady || isUpdating) return false;
    
    isUpdating = true;
    
    try {
        await pyodide.runPythonAsync(`
cached_sampler_data = sampler.run(${MAX_SAMPLES}, ${d}, x0=${x0}, y0=${y0})
        `);
        cachedD = d;
        isUpdating = false;
        return true;
    } catch (err) {
        console.error('Error generating samples:', err);
        isUpdating = false;
        throw err;
    }
}

/**
 * Render cached samples up to nDisplay
 * @param {number} nDisplay - Number of samples to display
 * @returns {object} Plot image and statistics
 */
export async function renderCached(nDisplay) {
    if (!pyReady || isUpdating) return null;
    
    isUpdating = true;
    
    try {
        const result = await pyodide.runPythonAsync(`
if cached_sampler_data is None:
    raise ValueError("No cached data available")
    
render_result = visualizer.render(cached_sampler_data, n_display=${nDisplay})
render_result
        `);
        
        isUpdating = false;
        return result.toJs({ dict_converter: Object.fromEntries });
    } catch (err) {
        console.error('Error rendering:', err);
        isUpdating = false;
        throw err;
    }
}

/**
 * Full update: generate samples if needed and render
 * @param {number} nDisplay - Number of samples to display
 * @param {number} d - Side length of square proposal
 * @param {number} x0 - Starting x coordinate
 * @param {number} y0 - Starting y coordinate
 * @param {boolean} forceResample - Force resampling even if d unchanged
 * @returns {object} Plot image and statistics
 */
export async function updatePlot(nDisplay, d, x0, y0, forceResample = false) {
    if (!pyReady || isUpdating) return null;
    
    // Check if we need to resample
    if (forceResample || cachedD !== d) {
        await generateSamples(d, x0, y0);
    }
    
    return await renderCached(nDisplay);
}

/**
 * Debounced update for d or starting point changes (requires resampling)
 */
export function debouncedResample(nDisplay, d, x0, y0, callback) {
    clearTimeout(updateTimeout);
    
    updateTimeout = setTimeout(async () => {
        try {
            const data = await updatePlot(nDisplay, d, x0, y0, true);
            if (data && callback) {
                callback(data);
            }
        } catch (err) {
            console.error('Debounced resample failed:', err);
        }
    }, 150);
}

/**
 * Fast update for n slider changes (no resampling)
 */
export async function updateNDisplay(nDisplay, callback) {
    try {
        const data = await renderCached(nDisplay);
        if (data && callback) {
            callback(data);
        }
    } catch (err) {
        console.error('Update n display failed:', err);
    }
}

/**
 * Render image array to canvas
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {Array} imageData - 3D numpy array (height x width x 3)
 */
export function renderImageToCanvas(canvas, imageData) {
    const ctx = canvas.getContext('2d');
    
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

/**
 * Update statistics display
 * @param {object} stats - Statistics object with n_display, acceptance_rate, n_accepted, ess_x, ess_y
 */
export function updateStats(stats) {
    document.getElementById('stat-acceptance').textContent = (stats.acceptance_rate * 100).toFixed(1) + '%';
    document.getElementById('stat-accepted').textContent = `${stats.n_accepted} / ${stats.n_display - 1}`;
    document.getElementById('stat-ess-x').textContent = stats.ess_x.toFixed(1);
    document.getElementById('stat-ess-y').textContent = stats.ess_y.toFixed(1);
}
