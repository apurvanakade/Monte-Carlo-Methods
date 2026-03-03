/**
 * Monte Carlo π Estimation App
 * Handles Pyodide initialization and UI interactions
 */

let pyodide;
let pyReady = false;
let simulator;
let visualizer;
let updateTimeout;
let isUpdating = false;

/**
 * Initialize Pyodide and load required packages and modules
 */
export async function initPyodide() {
    pyodide = await loadPyodide();
    
    // Install required packages
    await pyodide.loadPackage(['numpy', 'matplotlib']);
    
    // Load computation module
    const computationCode = await fetch('estimating_pi_computation.py').then(r => r.text());
    await pyodide.runPythonAsync(computationCode);
    
    // Load visualization module
    const visualizationCode = await fetch('estimating_pi_visualization.py').then(r => r.text());
    await pyodide.runPythonAsync(visualizationCode);
    
    // Initialize Python objects
    await pyodide.runPythonAsync(`
simulator = MonteCarloSimulation()
visualizer = MonteCarloVisualizer()
    `);
    
    pyReady = true;
}

/**
 * Generate plot and statistics for given sample size
 * @param {number} N - Number of samples
 * @returns {object} Plot image and statistics
 */
export async function updatePlot(N) {
    if (!pyReady || isUpdating) return null;
    
    isUpdating = true;
    
    try {
        const result = await pyodide.runPythonAsync(`
sim_data = simulator.run(${N})
image = visualizer.render(sim_data)

# Return everything except the large x,y arrays
{
    'image': image,
    'n_inside': sim_data['n_inside'],
    'pi_estimate': sim_data['pi_estimate'],
    'abs_error': sim_data['abs_error'],
    'std_error': sim_data['std_error']
}
        `);
        
        isUpdating = false;
        return result.toJs({ dict_converter: Object.fromEntries });
    } catch (err) {
        console.error('Error generating plot:', err);
        isUpdating = false;
        throw err;
    }
}

/**
 * Debounced update with smooth transition
 * @param {number} N - Number of samples
 * @param {function} callback - Function to call when update is complete
 */
export function debouncedUpdate(N, callback) {
    clearTimeout(updateTimeout);
    
    updateTimeout = setTimeout(async () => {
        try {
            const data = await updatePlot(N);
            if (data && callback) {
                callback(data);
            }
        } catch (err) {
            console.error('Debounced update failed:', err);
        }
    }, 100); // Wait 100ms after slider stops moving
}

/**
 * Render image array to canvas
 * @param {HTMLCanvasElement} canvas - Target canvas element
 * @param {Array} imageData - 3D numpy array (width x height x 3)
 */
export function renderImageToCanvas(canvas, imageData) {
    const ctx = canvas.getContext('2d');
    
    canvas.width = imageData.length;
    canvas.height = imageData[0].length;
    
    const canvasImageData = ctx.createImageData(canvas.width, canvas.height);
    const pixelData = canvasImageData.data;
    
    let pixelIndex = 0;
    for (let y = 0; y < canvas.height; y++) {
        for (let x = 0; x < canvas.width; x++) {
            pixelData[pixelIndex++] = imageData[x][y][0];
            pixelData[pixelIndex++] = imageData[x][y][1];
            pixelData[pixelIndex++] = imageData[x][y][2];
            pixelData[pixelIndex++] = 255;
        }
    }
    
    ctx.putImageData(canvasImageData, 0, 0);
}

/**
 * Update statistics display
 * @param {object} stats - Statistics object
 * @param {number} N - Sample size
 */
export function updateStats(stats, N) {
    document.getElementById('stat-n').textContent = N.toLocaleString();
    document.getElementById('stat-inside').textContent = stats.n_inside.toLocaleString();
    document.getElementById('stat-estimate').textContent = stats.pi_estimate.toFixed(6);
    document.getElementById('stat-true').textContent = Math.PI.toFixed(6);
    document.getElementById('stat-error').textContent = stats.abs_error.toFixed(6);
    document.getElementById('stat-stderr').textContent = stats.std_error.toFixed(6);
}
