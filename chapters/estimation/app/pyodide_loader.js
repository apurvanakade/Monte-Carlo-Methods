/**
 * Pyodide Loader - Shared initialization for interactive Python apps
 * This script handles loading Pyodide and avoiding RequireJS conflicts
 */
(function() {
    // Avoid RequireJS conflict with Pyodide's AMD module system
    var saveDefine = window.define;
    window.define = undefined;
    
    // Load Pyodide asynchronously
    var pyodideScript = document.createElement('script');
    pyodideScript.src = 'https://cdn.jsdelivr.net/pyodide/v0.23.4/full/pyodide.js';
    
    pyodideScript.onload = function() {
        // Restore RequireJS after Pyodide loads
        window.define = saveDefine;
        
        // Initialize shared Pyodide instance
        window.initSharedPyodide = async function(packages = []) {
            if (!window.sharedPyodide) {
                window.sharedPyodide = await loadPyodide();
                if (packages.length > 0) {
                    await window.sharedPyodide.loadPackage(packages);
                }
            }
            return window.sharedPyodide;
        };
        
        // Signal that Pyodide loader is ready
        window.dispatchEvent(new Event('pyodide-loaded'));
    };
    
    pyodideScript.onerror = function() {
        console.error('Failed to load Pyodide');
    };
    
    document.head.appendChild(pyodideScript);
})();
