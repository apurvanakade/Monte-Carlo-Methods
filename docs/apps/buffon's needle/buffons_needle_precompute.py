import json
from pathlib import Path

import numpy as np


def generate_data(max_n=100, seed=20260310):
    rng = np.random.default_rng(seed)

    line_spacing = 1.0
    needle_length = 0.8
    domain_w = 8.0
    domain_h = 6.0

    cx = rng.uniform(0.0, domain_w, max_n)
    cy = rng.uniform(0.0, domain_h, max_n)
    theta = rng.uniform(0.0, np.pi, max_n)

    dx = 0.5 * needle_length * np.cos(theta)
    dy = 0.5 * needle_length * np.sin(theta)

    x1 = cx - dx
    y1 = cy - dy
    x2 = cx + dx
    y2 = cy + dy

    crossings = np.floor(y1 / line_spacing) != np.floor(y2 / line_spacing)
    crossings_prefix = np.cumsum(crossings.astype(int))

    stats = {}
    for n in range(1, max_n + 1):
        c = int(crossings_prefix[n - 1])
        if c == 0:
            pi_hat = None
            stderr = None
            abs_error = None
        else:
            pi_hat = (2.0 * needle_length * n) / (line_spacing * c)
            p_hat = c / n
            stderr = (2.0 * needle_length / line_spacing) * np.sqrt(max((1 - p_hat), 1e-12) / (n * max(p_hat, 1e-12) ** 3))
            abs_error = abs(np.pi - pi_hat)

        stats[str(n)] = {
            "crossings": c,
            "pi_estimate": None if pi_hat is None else round(float(pi_hat), 8),
            "abs_error": None if abs_error is None else round(float(abs_error), 8),
            "std_error": None if stderr is None else round(float(stderr), 8),
        }

    return {
        "meta": {
            "max_n": max_n,
            "line_spacing": line_spacing,
            "needle_length": needle_length,
            "domain_w": domain_w,
            "domain_h": domain_h,
            "default_n": 10,
        },
        "needles": {
            "x1": np.round(x1, 6).tolist(),
            "y1": np.round(y1, 6).tolist(),
            "x2": np.round(x2, 6).tolist(),
            "y2": np.round(y2, 6).tolist(),
            "crossings": crossings.astype(int).tolist(),
        },
        "stats": stats,
    }


def write_data(output_path, max_n=100):
    data = generate_data(max_n=max_n)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    write_data("buffons_needle_data.json")
