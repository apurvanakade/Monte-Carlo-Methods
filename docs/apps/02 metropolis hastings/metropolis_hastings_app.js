/**
 * Metropolis-Hastings Sampling App
 * Handles Pyodide initialization and UI interactions
 */

let pyodide;
let pyReady = false;
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
    const computationCode = await fetch('metropolis_hastings_computation.py').then(r => r.text());
    await pyodide.runPythonAsync(computationCode);
    
    // Load visualization module
    const visualizationCode = await fetch('metropolis_hastings_visualization.py').then(r => r.text());
    await pyodide.runPythonAsync(visualizationCode);
    
    // Initialize Python objects
    await pyodide.runPythonAsync(`
sampler = MetropolisHastingsSampler()
visualizer = MetropolisHastingsVisualizer()
    `);
    
    pyReady = true;
}

/**
 * Generate plot and statistics for given parameters
 * @param {number} nSamples - Number of samples
 * @param {number} proposalWidth - Width of uniform proposal
 * @returns {object} Plot image and statistics
 */
export async function updatePlot(nSamples, proposalWidth) {
    if (!pyReady || isUpdating) return null;
    
    isUpdating = true;
    
    try {
        const result = await pyodide.runPythonAsync(`
sampler_data = sampler.run(${nSamples}, ${proposalWidth})
image = visualizer.render(sampler_data)
ess = visualizer.compute_ess(sampler_data['samples'])

# Return results
{
    'image': image,
    'acceptance_rate': sampler_data['acceptance_rate'],
    'n_accepted': sampler_data['n_accepted'],
    'sample_mean': sampler_data['sample_mean'],
    'sample_std': sampler_data['sample_std'],
    'ess': ess
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
 * @param {number} nSamples - Number of samples
 * @param {number} proposalWidth - Width of uniform proposal
 * @param {function} callback - Function to call when update is complete
 */
export function debouncedUpdate(nSamples, proposalWidth, callback) {
    clearTimeout(updateTimeout);
    
    updateTimeout = setTimeout(async () => {
        try {
            const data = await updatePlot(nSamples, proposalWidth);
            if (data && callback) {
                callback(data);
            }
        } catch (err) {
            console.error('Debounced update failed:', err);
        }
    }, 150); // Wait 150ms after slider stops moving
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
 * @param {object} stats - Statistics object
 * @param {number} nSamples - Total number of samples
 */
export function updateStats(stats, nSamples) {
    document.getElementById('stat-acceptance').textContent = (stats.acceptance_rate * 100).toFixed(1) + '%';
    document.getElementById('stat-accepted').textContent = `${stats.n_accepted} / ${nSamples - 1}`;
    document.getElementById('stat-ess').textContent = stats.ess.toFixed(1);
    document.getElementById('stat-mean').textContent = stats.sample_mean.toFixed(3);
    document.getElementById('stat-std').textContent = stats.sample_std.toFixed(3);
}
