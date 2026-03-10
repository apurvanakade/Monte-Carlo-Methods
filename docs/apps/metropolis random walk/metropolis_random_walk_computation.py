"""
Metropolis Random Walk - Computation Module

Implements Metropolis algorithm for sampling uniformly from
a non-convex 2D region using a random walk.
"""

import numpy as np


class MetropolisRandomWalk:
    """Samples uniformly from a non-convex 2D region using Metropolis algorithm."""
    
    def __init__(self, seed=None):
        """
        Initialize sampler.
        
        Args:
            seed: Random seed for reproducibility (None for random)
        """
        if seed is not None:
            np.random.seed(seed)
    
    @staticmethod
    def in_region(x, y):
        """
        Check if point (x, y) is inside the non-convex target region.
        
        The region is two circular regions connected by a narrow bottleneck,
        creating an interesting non-convex shape for exploring mixing.
        
        Args:
            x, y: Coordinates to check
            
        Returns:
            Boolean indicating if point is in the region
        """
        # Left circle: center (-1, 0), radius 0.7
        in_left = (x + 1)**2 + y**2 <= 0.7**2
        
        # Right circle: center (1, 0), radius 0.7
        in_right = (x - 1)**2 + y**2 <= 0.7**2
        
        # Bottleneck: narrow rectangle connecting the circles
        in_bottleneck = (np.abs(x) <= 0.4) & (np.abs(y) <= 0.15)
        
        return in_left | in_right | in_bottleneck
    
    def find_starting_point(self, max_attempts=1000):
        """
        Find a valid starting point inside the region.
        
        Returns:
            Tuple (x, y) inside the region
        """
        for _ in range(max_attempts):
            x = np.random.uniform(-2, 2)
            y = np.random.uniform(-1, 1)
            if self.in_region(x, y):
                return x, y
        # Fallback: return a point we know is in the region (left circle center)
        return -1.0, 0.0
    
    def run(self, n_samples, d, x0=None, y0=None):
        """
        Run Metropolis random walk algorithm.
        
        Args:
            n_samples: Number of samples to generate
            d: Side length of square uniform proposal
            x0, y0: Initial position (if None, finds a valid starting point)
            
        Returns:
            Dictionary with sampling results
        """
        # Initialize
        if x0 is None or y0 is None:
            x0, y0 = self.find_starting_point()
        
        samples_x = np.zeros(n_samples)
        samples_y = np.zeros(n_samples)
        proposals_x = np.zeros(n_samples)
        proposals_y = np.zeros(n_samples)
        accepted = np.zeros(n_samples, dtype=bool)
        
        samples_x[0] = x0
        samples_y[0] = y0
        proposals_x[0] = x0
        proposals_y[0] = y0
        accepted[0] = True
        
        n_accepted = 0
        
        for i in range(1, n_samples):
            # Current state
            x_current = samples_x[i-1]
            y_current = samples_y[i-1]
            
            # Propose new state from uniform distribution
            x_proposed = x_current + np.random.uniform(-d/2, d/2)
            y_proposed = y_current + np.random.uniform(-d/2, d/2)
            
            proposals_x[i] = x_proposed
            proposals_y[i] = y_proposed
            
            # Accept if proposal is in region (uniform target, so accept prob = 1 if in region)
            if self.in_region(x_proposed, y_proposed):
                samples_x[i] = x_proposed
                samples_y[i] = y_proposed
                accepted[i] = True
                n_accepted += 1
            else:
                samples_x[i] = x_current
                samples_y[i] = y_current
                accepted[i] = False
        
        acceptance_rate = n_accepted / (n_samples - 1) if n_samples > 1 else 0
        
        return {
            'samples_x': samples_x,
            'samples_y': samples_y,
            'proposals_x': proposals_x,
            'proposals_y': proposals_y,
            'accepted': accepted,
            'n_samples': n_samples,
            'd': d,
            'n_accepted': n_accepted,
            'acceptance_rate': float(acceptance_rate)
        }
