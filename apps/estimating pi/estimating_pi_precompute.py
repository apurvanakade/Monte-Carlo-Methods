import json
from pathlib import Path

import numpy as np


def generate_data(max_n=10000, min_n=10, step=100, seed=20260310):
    rng = np.random.default_rng(seed)
    x = rng.uniform(-1.0, 1.0, max_n)
    y = rng.uniform(-1.0, 1.0, max_n)
    inside = (x * x + y * y) <= 1.0

    n_values = list(range(min_n, max_n + 1, step))
    n_inside_prefix = np.cumsum(inside)

    stats = {}
    for n in n_values:
        c = int(n_inside_prefix[n - 1])
        p_hat = c / n
        pi_hat = 4.0 * p_hat
        stderr = 4.0 * np.sqrt(max(p_hat * (1.0 - p_hat), 1e-12) / n)
        stats[str(n)] = {
            "n_inside": c,
            "pi_estimate": round(float(pi_hat), 8),
            "abs_error": round(float(abs(np.pi - pi_hat)), 8),
            "std_error": round(float(stderr), 8),
        }

    return {
        "meta": {
            "min_n": min_n,
            "max_n": max_n,
            "step": step,
            "default_n": 1000,
        },
        "points": {
            "x": np.round(x, 6).tolist(),
            "y": np.round(y, 6).tolist(),
            "inside": inside.astype(int).tolist(),
        },
        "stats": stats,
    }


def write_data(output_path, max_n=10000, min_n=10, step=100):
    data = generate_data(max_n=max_n, min_n=min_n, step=step)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    write_data("estimating_pi_data.json")
