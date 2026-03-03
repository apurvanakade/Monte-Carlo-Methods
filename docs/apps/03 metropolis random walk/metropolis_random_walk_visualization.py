"""
Metropolis Random Walk - Visualization Module

Handles rendering of scatter plots and ACF for 2D MCMC samples.
"""

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg
from matplotlib.patches import Polygon
from matplotlib.collections import LineCollection


class MetropolisRandomWalkVisualizer:
    """Encapsulates visualization of Metropolis random walk samples."""
    
    def __init__(self, figsize=(14, 14), dpi=100):
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
            max_lag: Maximum lag to compute
            
        Returns:
            Array of autocorrelation values
        """
        n = len(samples)
        if max_lag is None:
            max_lag = min(n - 1, 50)
        
        samples_centered = samples - np.mean(samples)
        var = np.var(samples)
        
        if var == 0:
            return np.ones(max_lag + 1)
        
        acf = np.zeros(max_lag + 1)
        for lag in range(max_lag + 1):
            if lag == 0:
                acf[lag] = 1.0
            else:
                acf[lag] = np.mean(samples_centered[:-lag] * samples_centered[lag:]) / var
        
        return acf
    
    def compute_ess(self, samples):
        """
        Compute effective sample size using autocorrelation.
        
        Args:
            samples: Array of MCMC samples
            
        Returns:
            Effective sample size
        """
        n = len(samples)
        acf = self.compute_acf(samples, max_lag=min(n - 1, 100))
        
        tau = 1.0
        for k in range(1, len(acf)):
            if acf[k] < 0:
                break
            tau += 2 * acf[k]
        
        ess = n / tau
        return max(1, ess)
    
    def draw_region_boundary(self, ax):
        """
        Draw the boundary of the non-convex target region.
        
        Args:
            ax: Matplotlib axis
        """
        # Draw two circles connected by a bottleneck
        theta = np.linspace(0, 2*np.pi, 200)
        
        # Left circle: center (-1, 0), radius 0.7
        x_left = -1 + 0.7 * np.cos(theta)
        y_left = 0.7 * np.sin(theta)
        
        # Right circle: center (1, 0), radius 0.7
        x_right = 1 + 0.7 * np.cos(theta)
        y_right = 0.7 * np.sin(theta)
        
        # Bottleneck rectangle
        bottleneck_x = [-0.4, 0.4, 0.4, -0.4, -0.4]
        bottleneck_y = [-0.15, -0.15, 0.15, 0.15, -0.15]
        
        # Fill the regions
        ax.fill(x_left, y_left, color='#e8f4f8', alpha=0.5, zorder=1)
        ax.fill(x_right, y_right, color='#e8f4f8', alpha=0.5, zorder=1)
        ax.fill(bottleneck_x, bottleneck_y, color='#e8f4f8', alpha=0.5, zorder=1)
        
        # Draw boundaries
        ax.plot(x_left, y_left, 'k-', linewidth=2, zorder=3, label='Region boundary')
        ax.plot(x_right, y_right, 'k-', linewidth=2, zorder=3)
        ax.plot(bottleneck_x, bottleneck_y, 'k-', linewidth=2, zorder=3)
    
    def render(self, sampler_data, n_display=None):
        """
        Render sampling results to image array.
        
        Args:
            sampler_data: Dictionary from MetropolisRandomWalk.run()
            n_display: Number of samples to display (default: all)
            
        Returns:
            3D numpy array suitable for canvas rendering
        """
        # Get full data
        full_samples_x = sampler_data['samples_x']
        full_samples_y = sampler_data['samples_y']
        full_proposals_x = sampler_data['proposals_x']
        full_proposals_y = sampler_data['proposals_y']
        full_accepted = sampler_data['accepted']
        d = sampler_data['d']
        
        # Slice to n_display samples
        if n_display is None:
            n_display = len(full_samples_x)
        n_display = min(n_display, len(full_samples_x))
        
        samples_x = full_samples_x[:n_display]
        samples_y = full_samples_y[:n_display]
        proposals_x = full_proposals_x[:n_display]
        proposals_y = full_proposals_y[:n_display]
        accepted = full_accepted[:n_display]
        n_samples = n_display
        
        # Recalculate acceptance rate for displayed samples
        n_accepted = np.sum(accepted[1:]) if n_samples > 1 else 0
        acceptance_rate = n_accepted / (n_samples - 1) if n_samples > 1 else 0
        
        # Scale point sizes inversely with number of samples
        base_size = max(15, min(80, 800 / n_samples))
        marker_size = base_size
        rejected_marker_size = base_size * 0.8
        linewidth_scale = max(0.3, min(1.5, 30 / n_samples))
        
        # Compute ACF and ESS for both coordinates
        max_lag = min(n_samples - 1, 20)
        acf_x = self.compute_acf(samples_x, max_lag=max_lag)
        acf_y = self.compute_acf(samples_y, max_lag=max_lag)
        ess_x = self.compute_ess(samples_x)
        ess_y = self.compute_ess(samples_y)
        
        # Compute rolling averages (cumulative mean)
        rolling_avg_x = np.cumsum(samples_x) / np.arange(1, n_samples + 1)
        rolling_avg_y = np.cumsum(samples_y) / np.arange(1, n_samples + 1)
        
        # Create figure with subplots (3 rows)
        fig = plt.figure(figsize=self.figsize, dpi=self.dpi)
        gs = fig.add_gridspec(3, 2, height_ratios=[2, 1, 1], width_ratios=[1, 1])
        
        ax1 = fig.add_subplot(gs[0, :])  # Scatter plot spans both columns
        ax2 = fig.add_subplot(gs[1, 0])  # ACF for x
        ax3 = fig.add_subplot(gs[1, 1])  # ACF for y
        ax4 = fig.add_subplot(gs[2, 0])  # Rolling average for x
        ax5 = fig.add_subplot(gs[2, 1])  # Rolling average for y
        
        # === Top: Scatter plot of random walk ===
        # Draw the target region
        self.draw_region_boundary(ax1)
        
        # Draw the random walk path
        points = np.array([samples_x, samples_y]).T.reshape(-1, 1, 2)
        segments = np.concatenate([points[:-1], points[1:]], axis=1)
        lc = LineCollection(segments, colors='gray', linewidths=linewidth_scale, alpha=0.4, zorder=4)
        ax1.add_collection(lc)
        
        # Draw rejected proposals as red X marks
        rejected_mask = ~accepted
        if np.any(rejected_mask[1:]):
            rejected_x = proposals_x[1:][rejected_mask[1:]]
            rejected_y = proposals_y[1:][rejected_mask[1:]]
            ax1.scatter(rejected_x, rejected_y, marker='x', s=rejected_marker_size, 
                       color='#e74c3c', linewidths=linewidth_scale, label='Rejected', zorder=6, alpha=0.7)
        
        # Draw accepted samples as green circles
        ax1.scatter(samples_x[accepted], samples_y[accepted], marker='o', s=marker_size,
                   color='#27ae60', edgecolors='white', linewidths=linewidth_scale*0.5, 
                   label='Accepted', zorder=7, alpha=0.8)
        
        # Draw stayed-in-place samples as blue dots
        if np.any(rejected_mask[1:]):
            stayed_x = samples_x[1:][rejected_mask[1:]]
            stayed_y = samples_y[1:][rejected_mask[1:]]
            ax1.scatter(stayed_x, stayed_y, marker='o', s=marker_size*0.4,
                       color='#3498db', alpha=0.5, zorder=5)
        
        # Mark starting point
        ax1.scatter([samples_x[0]], [samples_y[0]], marker='s', s=marker_size*1.5,
                   color='#f39c12', edgecolors='black', linewidths=1, label='Start', zorder=8)
        
        ax1.set_xlabel('x', fontsize=12)
        ax1.set_ylabel('y', fontsize=12)
        ax1.set_title(f'Random Walk: d={d:.2f}, Acceptance Rate={acceptance_rate:.1%}', 
                     fontsize=13, fontweight='bold')
        ax1.legend(loc='upper right', fontsize=10)
        ax1.set_aspect('equal')
        ax1.grid(True, alpha=0.3)
        ax1.set_xlim(-2.0, 2.0)
        ax1.set_ylim(-1.2, 1.2)
        
        # === Middle Left: ACF for x coordinate ===
        lags = np.arange(len(acf_x))
        ax2.bar(lags, acf_x, color='#3498db', alpha=0.7, edgecolor='white')
        significance_bound = 1.96 / np.sqrt(n_samples)
        ax2.axhline(y=significance_bound, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax2.axhline(y=-significance_bound, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax2.axhline(y=0, color='black', linewidth=0.5)
        ax2.set_xlabel('Lag', fontsize=11)
        ax2.set_ylabel('ACF', fontsize=11)
        ax2.set_title(f'ACF for X — ESS = {ess_x:.1f}', fontsize=12, fontweight='bold')
        ax2.grid(True, alpha=0.3, axis='y')
        ax2.set_xlim(-0.5, max_lag + 0.5)
        ax2.set_ylim(-0.5, 1.1)
        
        # === Bottom Right: ACF for y coordinate ===
        ax3.bar(lags, acf_y, color='#9b59b6', alpha=0.7, edgecolor='white')
        ax3.axhline(y=significance_bound, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax3.axhline(y=-significance_bound, color='red', linestyle='--', linewidth=1, alpha=0.7)
        ax3.axhline(y=0, color='black', linewidth=0.5)
        ax3.set_xlabel('Lag', fontsize=11)
        ax3.set_ylabel('ACF', fontsize=11)
        ax3.set_title(f'ACF for Y — ESS = {ess_y:.1f}', fontsize=12, fontweight='bold')
        ax3.grid(True, alpha=0.3, axis='y')
        ax3.set_xlim(-0.5, max_lag + 0.5)
        ax3.set_ylim(-0.5, 1.1)
        
        # === Row 3 Left: Rolling average for x ===
        iterations = np.arange(1, n_samples + 1)
        ax4.plot(iterations, rolling_avg_x, color='#3498db', linewidth=1.5, alpha=0.8)
        ax4.set_xlabel('Sample', fontsize=11)
        ax4.set_ylabel('Running Mean', fontsize=11)
        ax4.set_title(f'Running Average of X (final: {rolling_avg_x[-1]:.3f})', fontsize=12, fontweight='bold')
        ax4.grid(True, alpha=0.3)
        ax4.set_xlim(1, n_samples)
        
        # === Row 3 Right: Rolling average for y ===
        ax5.plot(iterations, rolling_avg_y, color='#9b59b6', linewidth=1.5, alpha=0.8)
        ax5.set_xlabel('Sample', fontsize=11)
        ax5.set_ylabel('Running Mean', fontsize=11)
        ax5.set_title(f'Running Average of Y (final: {rolling_avg_y[-1]:.3f})', fontsize=12, fontweight='bold')
        ax5.grid(True, alpha=0.3)
        ax5.set_xlim(1, n_samples)
        
        plt.tight_layout()
        
        # Render to image array
        image_array = self._figure_to_array(fig)
        plt.close(fig)
        
        return {
            'image': image_array,
            'ess_x': float(ess_x),
            'ess_y': float(ess_y),
            'acceptance_rate': float(acceptance_rate),
            'n_accepted': int(n_accepted),
            'n_display': n_display
        }
    
    def _figure_to_array(self, fig):
        """
        Convert matplotlib figure to numpy array.
        
        Args:
            fig: Matplotlib figure object
            
        Returns:
            3D numpy array (height x width x 3 RGB)
        """
        canvas = FigureCanvasAgg(fig)
        canvas.draw()
        renderer = canvas.get_renderer()
        
        raw_data = renderer.tostring_rgb()
        size = canvas.get_width_height()
        
        im = np.frombuffer(raw_data, dtype=np.uint8)
        im = im.reshape(size[1], size[0], 3)
        
        return im
