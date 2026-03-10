import json
from pathlib import Path

import numpy as np


def in_region(x, y):
    c1 = (x + 1.0) ** 2 + y * y <= 1.0
    c2 = (x - 1.0) ** 2 + y * y <= 1.0
    return c1 or c2


def run_chain(n_samples, d, start_x, start_y, rng):
    x = np.zeros(n_samples)
    y = np.zeros(n_samples)
    proposal_x = np.full(n_samples, np.nan)
    proposal_y = np.full(n_samples, np.nan)
    accepted_flags = np.ones(n_samples, dtype=int)
    accepted_cum = np.zeros(n_samples, dtype=int)

    x[0] = start_x
    y[0] = start_y
    n_accepted = 0

    half = d / 2.0
    for i in range(1, n_samples):
        px = x[i - 1] + rng.uniform(-half, half)
        py = y[i - 1] + rng.uniform(-half, half)
        proposal_x[i] = px
        proposal_y[i] = py
        if in_region(px, py):
            x[i] = px
            y[i] = py
            n_accepted += 1
            accepted_flags[i] = 1
        else:
            x[i] = x[i - 1]
            y[i] = y[i - 1]
            accepted_flags[i] = 0
        accepted_cum[i] = n_accepted

    return x, y, proposal_x, proposal_y, accepted_flags, accepted_cum


def approx_ess(vals):
    n = len(vals)
    if n < 3:
        return float(n)
    v = np.asarray(vals)
    a = v[:-1] - np.mean(v[:-1])
    b = v[1:] - np.mean(v[1:])
    denom = np.sqrt(np.sum(a * a) * np.sum(b * b))
    if denom <= 1e-12:
        return float(n)
    rho1 = float(np.sum(a * b) / denom)
    rho1 = max(min(rho1, 0.999), -0.999)
    return float(max(1.0, n * (1.0 - rho1) / (1.0 + rho1)))


def generate_data(max_n=1000, runs_per_combo=3, seed=20260310):
    d_values = [round(0.1 * i, 1) for i in range(1, 21)]
    starts = [(-1.0, 0.0), (0.0, 0.0), (1.0, 0.0)]

    rng = np.random.default_rng(seed)
    data = {
        "meta": {
            "n_min": 10,
            "n_max": max_n,
            "n_step": 5,
            "default_n": 50,
            "d_values": d_values,
            "default_d": 0.5,
            "starts": [{"label": f"({sx:.1f}, {sy:.1f})", "x": sx, "y": sy} for sx, sy in starts],
            "default_start": "(-1.0, 0.0)",
            "runs_per_combo": runs_per_combo,
        },
        "chains": {},
    }

    for d in d_values:
        data["chains"][str(d)] = {}
        for sx, sy in starts:
            key = f"({sx:.1f}, {sy:.1f})"
            runs = []
            for _ in range(runs_per_combo):
                x, y, proposal_x, proposal_y, accepted_flags, accepted_cum = run_chain(max_n, d, sx, sy, rng)
                ess_x = [approx_ess(x[:n]) for n in range(2, max_n + 1)]
                ess_y = [approx_ess(y[:n]) for n in range(2, max_n + 1)]
                ess_x = [1.0] + ess_x
                ess_y = [1.0] + ess_y

                proposal_x_list = np.round(proposal_x, 6).tolist()
                proposal_y_list = np.round(proposal_y, 6).tolist()
                proposal_x_list[0] = None
                proposal_y_list[0] = None
                runs.append(
                    {
                        "x": np.round(x, 6).tolist(),
                        "y": np.round(y, 6).tolist(),
                        "proposal_x": proposal_x_list,
                        "proposal_y": proposal_y_list,
                        "accepted": accepted_flags.tolist(),
                        "accepted_cum": accepted_cum.tolist(),
                        "ess_x": np.round(ess_x, 3).tolist(),
                        "ess_y": np.round(ess_y, 3).tolist(),
                    }
                )
            data["chains"][str(d)][key] = runs

    return data


def write_data(output_path, max_n=1000, runs_per_combo=3):
    data = generate_data(max_n=max_n, runs_per_combo=runs_per_combo)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    write_data("metropolis_random_walk_data.json")
