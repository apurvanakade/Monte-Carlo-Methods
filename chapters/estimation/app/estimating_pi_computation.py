"""
Monte Carlo π Estimation - Computation Module

Handles the mathematical simulation of random point generation
and π estimation without any visualization.
"""

import numpy as np


class MonteCarloSimulation:
    """Encapsulates Monte Carlo π estimation computation."""
    
    def __init__(self, seed=0, radius=1):
        """
        Initialize simulation parameters.
        
        Args:
            seed: Random seed for reproducibility
            radius: Radius of the circle
        """
        np.random.seed(seed)
        self.radius = radius
    
    def run(self, n_samples):
        """
        Run Monte Carlo simulation.
        
        Args:
            n_samples: Number of random points to generate
            
        Returns:
            Dictionary with simulation results
        """
        # Generate random points in [-r, r] × [-r, r]
        x = np.random.uniform(-self.radius, self.radius, n_samples)
        y = np.random.uniform(-self.radius, self.radius, n_samples)
        
        # Calculate distances from origin
        distances = np.sqrt(x**2 + y**2)
        
        # Count points inside circle (distance <= radius)
        inside_circle = distances <= self.radius
        n_inside = np.sum(inside_circle)
        
        # Estimate π: (area of circle) / (area of square) = (π*r²) / (2r)² = π/4
        # Therefore: π ≈ 4 * (points inside) / (total points)
        pi_estimate = 4 * n_inside / n_samples
        
        # Calculate error metrics
        abs_error = abs(pi_estimate - np.pi)
        std_error = np.sqrt(pi_estimate * (4 - pi_estimate) / n_samples)
        
        return {
            'x': x,
            'y': y,
            'inside_circle': inside_circle,
            'n_samples': n_samples,
            'n_inside': int(n_inside),
            'pi_estimate': float(pi_estimate),
            'abs_error': float(abs_error),
            'std_error': float(std_error),
            'radius': self.radius
        }
