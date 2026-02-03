/**
 * Monte Carlo π Estimation App
 * Handles UI interactions and rendering
 */

class PiEstimatorApp {
    constructor() {
        this.pyodide = null;
        this.isUpdating = false;
        this.updateTimeout = null;
    }

    async init() {
        try {
            // Wait for Pyodide loader if not ready
            if (typeof initSharedPyodide === 'undefined') {
                await new Promise(resolve => {
                    window.addEventListener('pyodide-loaded', resolve, { once: true });
                });
            }

            // Initialize Pyodide with required packages
            this.pyodide = await initSharedPyodide(['numpy', 'matplotlib']);
            
            // Load Python computation module
            const response = await fetch('app/monte_carlo_pi.py');
            const pythonCode = await response.text();
            await this.pyodide.runPythonAsync(pythonCode);
            
            // Setup UI
            this.setupUI();
            
            // Initial render
            await this.updateVisualization(1000);
            
        } catch (err) {
            console.error('Error initializing app:', err);
            document.getElementById('pi-loading').innerHTML = 
                '<p style="color: red;">Failed to load. Please refresh.</p>';
        }
    }

    setupUI() {
        document.getElementById('pi-loading').style.display = 'none';
        document.getElementById('pi-viz').style.display = 'block';
        
        document.getElementById('pi-n-slider').addEventListener('input', (e) => {
            this.handleSliderChange(e);
        });
    }

    handleSliderChange(e) {
        const n = parseInt(e.target.value);
        document.getElementById('pi-n-value').textContent = n.toLocaleString();
        
        clearTimeout(this.updateTimeout);
        this.updateTimeout = setTimeout(() => this.updateVisualization(n), 150);
    }

    async updateVisualization(n) {
        if (this.isUpdating) return;
        this.isUpdating = true;
        
        try {
            const result = await this.pyodide.runPythonAsync(`generate_plot(${n})`);
            const data = result.toJs({ dict_converter: Object.fromEntries });
            
            this.renderToCanvas(data.image);
            this.updateTable(data);
        } catch (err) {
            console.error('Error updating visualization:', err);
        } finally {
            this.isUpdating = false;
        }
    }

    renderToCanvas(img) {
        const canvas = document.getElementById('pi-canvas');
        const ctx = canvas.getContext('2d');
        
        // Set internal resolution
        canvas.width = img[0].length;
        canvas.height = img.length;
        
        // Render image data
        const imageData = ctx.createImageData(canvas.width, canvas.height);
        let idx = 0;
        for (let y = 0; y < canvas.height; y++) {
            for (let x = 0; x < canvas.width; x++) {
                imageData.data[idx++] = img[y][x][0];
                imageData.data[idx++] = img[y][x][1];
                imageData.data[idx++] = img[y][x][2];
                imageData.data[idx++] = 255;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    updateTable(data) {
        document.getElementById('pi-points-inside').textContent = 
            data.points_inside.toLocaleString();
        document.getElementById('pi-total-points').textContent = 
            data.total_points.toLocaleString();
        const ratio = data.points_inside / data.total_points;
        document.getElementById('pi-ratio').textContent = 
            ratio.toFixed(4);
        document.getElementById('pi-estimate').textContent = 
            data.pi_estimate.toFixed(4);
    }
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const app = new PiEstimatorApp();
        app.init();
    });
} else {
    const app = new PiEstimatorApp();
    app.init();
}
