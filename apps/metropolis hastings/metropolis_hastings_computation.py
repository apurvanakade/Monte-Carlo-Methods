"""
Metropolis-Hastings Sampling - Computation Module

Implements the Metropolis-Hastings algorithm for sampling from
a standard normal distribution using a uniform proposal.
"""

import numpy as np


class MetropolisHastingsSampler:
    """Encapsulates Metropolis-Hastings sampling computation."""
    
    def __init__(self, seed=None):
        """
        Initialize sampler.
        
        Args:
            seed: Random seed for reproducibility (None for random)
        """
        if seed is not None:
            np.random.seed(seed)
    
    @staticmethod
    def target_pdf(x):
        """
        Standard normal distribution PDF (unnormalized).
        
        Args:
            x: Value to evaluate
            
        Returns:
            Unnormalized probability density
        """
        return np.exp(-0.5 * x**2)
    
    def run(self, n_samples, proposal_width, x0=0.0):
        """
        Run Metropolis-Hastings algorithm with detailed step tracking.
        
        Args:
            n_samples: Number of samples to generate
            proposal_width: Diameter of uniform proposal distribution
            x0: Initial value
            
        Returns:
            Dictionary with sampling results including step-by-step details
        """
        samples = np.zeros(n_samples)
        proposals = np.zeros(n_samples)  # Track all proposals
        accepted = np.zeros(n_samples, dtype=bool)  # Track which were accepted
        alphas = np.zeros(n_samples)  # Track acceptance probabilities
        
        samples[0] = x0
        proposals[0] = x0
        accepted[0] = True
        alphas[0] = 1.0
        
        n_accepted = 0
        
        for i in range(1, n_samples):
            # Current state
            x_current = samples[i-1]
            
            # Propose new state from uniform distribution centered at current state
            x_proposed = x_current + np.random.uniform(-proposal_width/2, proposal_width/2)
            proposals[i] = x_proposed
            
            # Acceptance probability (symmetric proposal, so ratio simplifies)
            alpha = min(1, self.target_pdf(x_proposed) / self.target_pdf(x_current))
            alphas[i] = alpha
            
            # Accept or reject
            if np.random.random() < alpha:
                samples[i] = x_proposed
                accepted[i] = True
                n_accepted += 1
            else:
                samples[i] = x_current
                accepted[i] = False
        
        acceptance_rate = n_accepted / (n_samples - 1) if n_samples > 1 else 0
        
        return {
            'samples': samples,
            'proposals': proposals,
            'accepted': accepted,
            'alphas': alphas,
            'n_samples': n_samples,
            'proposal_width': proposal_width,
            'n_accepted': n_accepted,
            'acceptance_rate': float(acceptance_rate),
            'sample_mean': float(np.mean(samples)),
            'sample_std': float(np.std(samples))
        }
