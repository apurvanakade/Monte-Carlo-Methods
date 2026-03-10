"""
Metropolis-Hastings Sampling - Visualization Module

Handles rendering of trace plots for MCMC samples with step-by-step details.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg


class MetropolisHastingsVisualizer:
    """Encapsulates visualization of Metropolis-Hastings samples."""
    
    def __init__(self, figsize=(12, 12), dpi=100):
        """
        Initialize visualization parameters.
        
        Args:
            figsize: Figure size as (width, height)
            dpi: Dots per inch for rendering
        """
        self.figsize = figsize
        self.dpi = dpi
    
    def compute_acf(self, samples, max_lag=None):
        """
        Compute autocorrelation function for given samples.
        
        Args:
            samples: Array of MCMC samples
            max_lag: Maximum lag to compute (default: min(n-1, 50))
            
        Returns:
            Array of autocorrelation values for lags 0, 1, ..., max_lag
        """
        n = len(samples)
        if max_lag is None:
            max_lag = min(n - 1, 50)
        
        # Center the samples
        samples_centered = samples - np.mean(samples)
        c0 = np.sum(samples_centered ** 2)
        
        if c0 == 0:
            return np.ones(max_lag + 1)
        
        acf = np.zeros(max_lag + 1)
        for lag in range(max_lag + 1):
            if lag == 0:
                acf[lag] = 1.0
            else:
                acf[lag] = np.sum(samples_centered[:-lag] * samples_centered[lag:]) / c0
        
        return acf
    
    def compute_ess(self, samples):
        """
        Compute effective sample size using autocorrelation.
        
        ESS = n / (1 + 2 * sum of autocorrelations)
        
        Args:
            samples: Array of MCMC samples
            
        Returns:
            Effective sample size
        """
        n = len(samples)
        acf = self.compute_acf(samples, max_lag=min(n - 1, 100))
        
        # Sum autocorrelations until they become negative or we reach max lag
        # (Geyer's initial positive sequence estimator approximation)
        tau = 1.0
        for k in range(1, len(acf)):
            if acf[k] < 0:
                break
            tau += 2 * acf[k]
        
        ess = n / tau
        return max(1, ess)  # ESS should be at least 1
    
    def render(self, sampler_data):
        """
        Render sampling results to image array with step-by-step visualization.
        
        Args:
            sampler_data: Dictionary from MetropolisHastingsSampler.run()
            
        Returns:
            3D numpy array suitable for canvas rendering (width x height x 3 RGB)
        """
        samples = sampler_data['samples']
        proposals = sampler_data['proposals']
        accepted = sampler_data['accepted']
        alphas = sampler_data['alphas']
        proposal_width = sampler_data['proposal_width']
        acceptance_rate = sampler_data['acceptance_rate']
        n_samples = sampler_data['n_samples']
        
        # Scale point sizes inversely with number of samples
        base_size = max(20, min(100, 1200 / n_samples))
        marker_size = base_size
        rejected_marker_size = base_size * 1.3
        stayed_marker_size = base_size * 0.5
        linewidth_scale = max(0.5, min(2, 40 / n_samples))
        
        # Compute ACF and ESS
        max_lag = min(n_samples - 1, 20)
        acf = self.compute_acf(samples, max_lag=max_lag)
        ess = self.compute_ess(samples)
        
        # Create figure with three subplots (trace plot gets more height)
        fig, axes = plt.subplots(3, 1, figsize=self.figsize, dpi=self.dpi,
                                  gridspec_kw={'height_ratios': [2, 1, 1]})
        
        # === Top: Trace plot with accept/reject markers ===
        ax1 = axes[0]
        iterations = np.arange(n_samples)
        
        # Draw connecting lines (gray for chain movement)
        ax1.plot(iterations, samples, linewidth=1, alpha=0.5, color='gray', zorder=1)
        
        # Draw rejected proposals as red X marks
        rejected_mask = ~accepted
        if np.any(rejected_mask[1:]):  # Skip first point
            rejected_iters = iterations[1:][rejected_mask[1:]]
            rejected_proposals = proposals[1:][rejected_mask[1:]]
            ax1.scatter(rejected_iters, rejected_proposals, marker='x', s=rejected_marker_size, 
                       color='#e74c3c', linewidths=linewidth_scale, label='Rejected', zorder=3)
        
        # Draw accepted samples as green circles
        accepted_mask = accepted.copy()
        ax1.scatter(iterations[accepted_mask], samples[accepted_mask], marker='o', s=marker_size,
                   color='#27ae60', edgecolors='white', linewidths=linewidth_scale*0.5, label='Accepted', zorder=4)
        
        # Draw rejected samples (stayed in place) as smaller blue dots
        if np.any(rejected_mask[1:]):
            ax1.scatter(iterations[1:][rejected_mask[1:]], samples[1:][rejected_mask[1:]], 
                       marker='o', s=stayed_marker_size, color='#3498db', alpha=0.7, zorder=2)
        
        # Reference line at true mean
        ax1.axhline(y=0, color='black', linestyle='--', linewidth=1, alpha=0.5, label='True mean (0)')
        
        ax1.set_xlabel('Iteration', fontsize=12)
        ax1.set_ylabel('Value', fontsize=12)
        ax1.set_title(f'Trace Plot: d = {proposal_width:.1f}, Acceptance Rate = {acceptance_rate:.1%}', 
                     fontsize=13, fontweight='bold')
        ax1.legend(loc='upper right', fontsize=10)
        ax1.grid(True, alpha=0.3)
        ax1.set_xlim(-0.5, n_samples - 0.5)
        
        # Add some padding to y-axis
        y_min, y_max = ax1.get_ylim()
        y_padding = (y_max - y_min) * 0.1
        ax1.set_ylim(y_min - y_padding, y_max + y_padding)
        
        # === Middle: ACF plot ===
        ax2 = axes[1]
        lags = np.arange(len(acf))
        
        # Draw ACF bars
        ax2.bar(lags, acf, color='#9b59b6', alpha=0.7, edgecolor='white')
        
        # Draw significance bounds (approximate 95% CI for white noise)
        significance_bound = 1.96 / np.sqrt(n_samples)
        ax2.axhline(y=significance_bound, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax2.axhline(y=-significance_bound, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax2.axhline(y=0, color='black', linewidth=0.5)
        
        ax2.set_xlabel('Lag', fontsize=12)
        ax2.set_ylabel('Autocorrelation', fontsize=12)
        ax2.set_title(f'Autocorrelation Function (ACF) — ESS = {ess:.1f}', fontsize=13, fontweight='bold')
        ax2.grid(True, alpha=0.3, axis='y')
        ax2.set_xlim(-0.5, max_lag + 0.5)
        ax2.set_ylim(-0.5, 1.1)
        
        # === Bottom: Target distribution with sample histogram ===
        ax3 = axes[2]
        
        # Draw target distribution
        x_range = np.linspace(-4, 4, 200)
        true_pdf = np.exp(-0.5 * x_range**2) / np.sqrt(2 * np.pi)
        ax3.fill_between(x_range, true_pdf, alpha=0.1, color='#3498db', label='Target: N(0,1)')
        ax3.plot(x_range, true_pdf, color='#2980b9', linewidth=1)
        
        # Draw histogram of samples
        ax3.hist(samples, bins=30, density=True, alpha=0.6, color='#27ae60', 
                edgecolor='white', linewidth=0.5, label=f'Samples (n={n_samples})', zorder=4)
        
        # Draw sample positions as rug plot on x-axis
        ax3.scatter(samples, np.zeros_like(samples) - 0.02, marker='|', s=100, 
                   color='#27ae60', linewidths=2, zorder=5)
        
        ax3.set_xlabel('Value', fontsize=12)
        ax3.set_ylabel('Density', fontsize=12)
        ax3.set_title('Target Distribution with Sample Locations', fontsize=13, fontweight='bold')
        ax3.legend(loc='upper right', fontsize=10)
        ax3.grid(True, alpha=0.3)
        ax3.set_xlim(-4, 4)
        ax3.set_ylim(-0.1, 0.5)
        
        plt.tight_layout()
        
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
        
        # Reshape to (height, width, 3)
        im = np.frombuffer(raw_data, dtype=np.uint8)
        im = im.reshape(size[1], size[0], 3)
        
        return im
