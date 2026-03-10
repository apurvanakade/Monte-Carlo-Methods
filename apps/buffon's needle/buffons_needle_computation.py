"""
Buffon's Needle π Estimation - Computation Module

Simulates dropping needles randomly on a surface with parallel lines
to estimate π based on the probability of needle-line intersections.
"""

import numpy as np


class BuffonsNeedleSimulation:
    """Encapsulates Buffon's Needle π estimation computation."""
    
    def __init__(self, seed=0, needle_length=1.0, line_spacing=1.0):
        """
        Initialize simulation parameters.
        
        Args:
            seed: Random seed for reproducibility
            needle_length: Length of each needle (L)
            line_spacing: Distance between parallel lines (d)
        """
        np.random.seed(seed)
        self.needle_length = needle_length
        self.line_spacing = line_spacing
    
    def run(self, n_needles):
        """
        Run Buffon's Needle simulation.
        
        Args:
            n_needles: Number of needles to drop
            
        Returns:
            Dictionary with simulation results
        """
        # Drop needle centers uniformly in [0, line_spacing]
        y_centers = np.random.uniform(0, self.line_spacing, n_needles)
        
        # Needle angles uniformly in [0, 2π] for all directions
        # (though only [0, π] is needed mathematically due to symmetry,
        # we use full range for better visualization)
        angles = np.random.uniform(0, 2 * np.pi, n_needles)
        
        # Calculate needle endpoints
        needle_half_length = self.needle_length / 2
        y_top = y_centers + needle_half_length * np.sin(angles)
        y_bottom = y_centers - needle_half_length * np.sin(angles)
        
        # Ensure y_top >= y_bottom for all needles
        y_max = np.maximum(y_top, y_bottom)
        y_min = np.minimum(y_top, y_bottom)
        
        # Count crossings: needle crosses if it spans across a line
        # Crosses bottom line (y=0) if y_min <= 0 and y_max >= 0
        # Crosses top line (y=d) if y_min <= d and y_max >= d
        crosses_bottom = (y_min <= 0) & (y_max >= 0)
        crosses_top = (y_min <= self.line_spacing) & (y_max >= self.line_spacing)
        crossings = crosses_bottom | crosses_top
        n_crossings = np.sum(crossings)
        
        # Estimate π using Buffon's formula: π ≈ 2*L / (d * (N/crossings))
        # Rearranged: π ≈ 2*L*N / (d*crossings)
        if n_crossings > 0:
            pi_estimate = (2 * self.needle_length * n_needles) / (self.line_spacing * n_crossings)
        else:
            pi_estimate = 0  # No crossings yet
        
        # Calculate error metrics
        abs_error = abs(pi_estimate - np.pi) if n_crossings > 0 else float('inf')
        
        # Standard error approximation for Buffon's needle
        # Using: SE ≈ π̂ * sqrt((n - crossings) / (n * crossings))
        if n_crossings > 0 and n_crossings < n_needles:
            std_error = pi_estimate * np.sqrt((n_needles - n_crossings) / (n_needles * n_crossings))
        else:
            std_error = float('inf')
        
        return {
            'y_centers': y_centers,
            'angles': angles,
            'crossings': crossings,
            'n_needles': n_needles,
            'n_crossings': int(n_crossings),
            'pi_estimate': float(pi_estimate),
            'abs_error': float(abs_error),
            'std_error': float(std_error),
            'needle_length': self.needle_length,
            'line_spacing': self.line_spacing
        }
