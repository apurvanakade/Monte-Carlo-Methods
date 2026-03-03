"""
Monte Carlo π Estimation - Visualization Module

Handles rendering of simulation results to canvas.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg


class MonteCarloVisualizer:
    """Encapsulates visualization of Monte Carlo simulations."""
    
    def __init__(self, figsize=(6, 6), dpi=100):
        """
        Initialize visualization parameters.
        
        Args:
            figsize: Figure size as (width, height)
            dpi: Dots per inch for rendering
        """
        self.figsize = figsize
        self.dpi = dpi
    
    def render(self, simulation_data):
        """
        Render simulation results to image array.
        
        Args:
            simulation_data: Dictionary from MonteCarloSimulation.run()
            
        Returns:
            3D numpy array suitable for canvas rendering (width x height x 3 RGB)
        """
        x = simulation_data['x']
        y = simulation_data['y']
        inside_circle = simulation_data['inside_circle']
        n_samples = simulation_data['n_samples']
        pi_estimate = simulation_data['pi_estimate']
        radius = simulation_data['radius']
        
        # Create figure
        fig, ax = plt.subplots(figsize=self.figsize, dpi=self.dpi)
        
        # Draw circle
        theta = np.linspace(0, 2*np.pi, 100)
        ax.plot(radius*np.cos(theta), radius*np.sin(theta), 'k-', linewidth=2)
        
        # Draw square (bounding box)
        ax.plot([-radius, -radius, radius, radius, -radius], 
                [-radius, radius, radius, -radius, -radius], 
                'k-', linewidth=2)
        
        # Plot points (red inside, blue outside)
        colors = np.where(inside_circle, 'red', 'blue')
        ax.scatter(x, y, c=colors, s=2, alpha=0.6)
        
        # Format axes
        # ax.set_title(f'N = {n_samples:,} | π ≈ {pi_estimate:.4f}', 
                    # fontsize=14, fontweight='bold')
        ax.set_xticks([])
        ax.set_yticks([])
        ax.axis('equal')
        ax.grid(True, alpha=0.2)
        
        # Render to image array
        image_array = self._figure_to_array(fig)
        plt.close(fig)
        
        return image_array
    
    def _figure_to_array(self, fig):
        """
        Convert matplotlib figure to numpy array.
        
        Args:
            fig: Matplotlib figure object
            
        Returns:
            3D numpy array (width x height x 3 RGB)
        """
        canvas = FigureCanvasAgg(fig)
        canvas.draw()
        renderer = canvas.get_renderer()
        
        # Get raw RGB data
        raw_data = renderer.tostring_rgb()
        size = canvas.get_width_height()
        
        # Reshape to (width, height, 3)
        im = np.frombuffer(raw_data, dtype=np.uint8)
        im = im.reshape(*reversed(size), 3)
        
        return im
