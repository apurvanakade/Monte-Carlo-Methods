"""
Monte Carlo π Estimation - Core computation
"""
import numpy as np
import matplotlib.pyplot as plt
from matplotlib.backends.backend_agg import FigureCanvasAgg

np.random.seed(0)

def monte_carlo_sample(n, radius=1):
    """
    Generate Monte Carlo samples for π estimation.
    
    Args:
        n: Number of random points to sample
        radius: Radius of the circle (default: 1)
        
    Returns:
        Dictionary with sampling results:
            - x: x-coordinates of points
            - y: y-coordinates of points
            - inside: boolean array indicating points inside circle
            - pi_estimate: estimated value of π
            - radius: circle radius
    """
    x = np.random.uniform(-radius, radius, n)
    y = np.random.uniform(-radius, radius, n)
    inside = x**2 + y**2 <= radius**2
    pi_est = 4 * np.sum(inside) / n
    
    return {
        'x': x,
        'y': y,
        'inside': inside,
        'pi_estimate': float(pi_est),
        'radius': radius
    }

def plot_monte_carlo(data):
    """
    Create visualization from Monte Carlo sampling data.
    
    Args:
        data: Dictionary from monte_carlo_sample() containing x, y, inside, radius
        
    Returns:
        Numpy array representing the plot image (height x width x 3 RGB)
    """
    x = data['x']
    y = data['y']
    inside = data['inside']
    radius = data['radius']
    
    fig, ax = plt.subplots(figsize=(6, 6), dpi=100)
    
    # Draw circle
    theta = np.linspace(0, 2*np.pi, 100)
    ax.plot(radius*np.cos(theta), radius*np.sin(theta), 'k-', linewidth=2)
    
    # Draw bounding square
    ax.plot([-radius, -radius, radius, radius, -radius], 
            [-radius, radius, radius, -radius, -radius], 
            'k-', linewidth=2)
    
    # Plot points (red inside, blue outside)
    ax.scatter(x, y, c=np.where(inside, 'red', 'blue'), s=2, alpha=0.6)
    
    ax.set_xticks([])
    ax.set_yticks([])
    ax.axis('equal')
    ax.grid(True, alpha=0.2)
    
    # Convert to image array
    canvas = FigureCanvasAgg(fig)
    canvas.draw()
    raw_data = canvas.get_renderer().tostring_rgb()
    w, h = canvas.get_width_height()
    img = np.frombuffer(raw_data, dtype=np.uint8).reshape(h, w, 3)
    plt.close(fig)
    
    return img

def generate_plot(n):
    """
    Generate a Monte Carlo π estimation visualization.
    
    Args:
        n: Number of random points to sample
        
    Returns:
        Dictionary with 'image' (numpy array), 'pi_estimate' (float),
        'points_inside' (int), and 'total_points' (int)
    """
    data = monte_carlo_sample(n)
    img = plot_monte_carlo(data)
    
    return {
        'image': img,
        'pi_estimate': data['pi_estimate'],
        'points_inside': int(np.sum(data['inside'])),
        'total_points': n
    }

def analyze_convergence(sample_sizes, confidence_level=0.95, seed=None):
    """
    Analyze convergence of Monte Carlo π estimation across different sample sizes.
    
    Args:
        sample_sizes: Array of sample sizes to test
        confidence_level: Confidence level for intervals (default: 0.95)
        seed: Random seed for reproducibility (default: None)
        
    Returns:
        Dictionary with arrays: estimates, ci_widths, lower_bounds, upper_bounds
    """
    if seed is not None:
        np.random.seed(seed)
    
    # Z-score for confidence level
    from scipy.stats import norm
    z_alpha = norm.ppf(1 - (1 - confidence_level) / 2)
    
    estimates = []
    ci_widths = []
    lower_bounds = []
    upper_bounds = []
    
    for n in sample_sizes:
        # Generate single estimate
        data = monte_carlo_sample(n)
        pi_est = data['pi_estimate']
        
        # Theoretical confidence interval
        se = np.sqrt(np.pi * (4 - np.pi) / n)
        margin = z_alpha * se
        
        estimates.append(pi_est)
        ci_widths.append(2 * margin)
        lower_bounds.append(pi_est - margin)
        upper_bounds.append(pi_est + margin)
    
    return {
        'estimates': np.array(estimates),
        'ci_widths': np.array(ci_widths),
        'lower_bounds': np.array(lower_bounds),
        'upper_bounds': np.array(upper_bounds),
        'z_score': z_alpha
    }

