"""
Buffon's Needle π Estimation - Visualization Module

Handles rendering of needle simulation results to canvas.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg


class BuffonsNeedleVisualizer:
    """Encapsulates visualization of Buffon's Needle simulations."""
    
    def __init__(self, figsize=(8, 6), dpi=100):
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
            simulation_data: Dictionary from BuffonsNeedleSimulation.run()
            
        Returns:
            3D numpy array suitable for canvas rendering (width x height x 3 RGB)
        """
        y_centers = simulation_data['y_centers']
        angles = simulation_data['angles']
        crossings = simulation_data['crossings']
        n_needles = simulation_data['n_needles']
        pi_estimate = simulation_data['pi_estimate']
        needle_length = simulation_data['needle_length']
        line_spacing = simulation_data['line_spacing']
        n_crossings = simulation_data['n_crossings']
        
        # Create figure
        fig, ax = plt.subplots(figsize=self.figsize, dpi=self.dpi)
        
        # Draw parallel lines
        ax.axhline(y=0, color='black', linewidth=2)
        ax.axhline(y=line_spacing, color='black', linewidth=2)
        
        # Draw needles
        needle_half_length = needle_length / 2
        for i in range(min(n_needles, 500)):  # Limit to 500 visible needles for performance
            y_center = y_centers[i]
            angle = angles[i]
            
            # Calculate needle endpoints
            dx = needle_half_length * np.cos(angle)
            dy = needle_half_length * np.sin(angle)
            
            x_start = 0
            y_start = y_center - dy
            x_end = 1
            y_end = y_center + dy
            
            # Color: red if crossing, blue if not
            color = 'red' if crossings[i] else 'blue'
            ax.plot([x_start, x_end], [y_start, y_end], color=color, linewidth=1, alpha=0.5)
        
        # Format axes
        ax.set_xlim(-0.1, 1.1)
        ax.set_ylim(-0.2, line_spacing + 0.2)
        ax.set_aspect('equal')
        ax.set_xticks([])
        ax.set_ylabel('Distance between lines')
        ax.grid(True, alpha=0.2, axis='y')
        
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
        
        # Flip vertically to correct orientation
        im = np.flipud(im)
        
        return im
