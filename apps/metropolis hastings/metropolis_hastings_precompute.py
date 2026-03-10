import json
from pathlib import Path

import numpy as np


def target_density(x):
    return np.exp(-0.5 * x * x)


def run_chain(n_samples, proposal_width, rng):
    x = np.zeros(n_samples)
    proposals = np.full(n_samples, np.nan)
    accepted = np.ones(n_samples, dtype=int)
    accepted_cum = np.zeros(n_samples, dtype=int)
    n_accepted = 0

    for i in range(1, n_samples):
        prop = x[i - 1] + rng.uniform(-proposal_width, proposal_width)
        proposals[i] = prop
        alpha = min(1.0, target_density(prop) / target_density(x[i - 1]))
        if rng.random() < alpha:
            x[i] = prop
            n_accepted += 1
            accepted[i] = 1
        else:
            x[i] = x[i - 1]
            accepted[i] = 0
        accepted_cum[i] = n_accepted

    return x, proposals, accepted, accepted_cum


def approx_ess(samples):
    n = len(samples)
    if n < 3:
        return float(n)
    x = np.asarray(samples)
    x0 = x[:-1] - np.mean(x[:-1])
    x1 = x[1:] - np.mean(x[1:])
    denom = np.sqrt(np.sum(x0 * x0) * np.sum(x1 * x1))
    if denom <= 1e-12:
        return float(n)
    rho1 = float(np.sum(x0 * x1) / denom)
    rho1 = max(min(rho1, 0.999), -0.999)
    return float(max(1.0, n * (1.0 - rho1) / (1.0 + rho1)))


def generate_data(max_n=500, runs_per_d=4, seed=20260310):
    d_values = [round(0.5 * i, 1) for i in range(1, 13)]
    rng = np.random.default_rng(seed)

    data = {
        "meta": {
            "n_min": 5,
            "n_max": max_n,
            "n_step": 1,
            "default_n": 20,
            "d_values": d_values,
            "default_d": 2.0,
            "runs_per_d": runs_per_d,
        },
        "chains": {},
    }

    for d in d_values:
        runs = []
        for _ in range(runs_per_d):
            samples, proposals, accepted, accepted_cum = run_chain(max_n, d, rng)
            means = [float(np.mean(samples[:n])) for n in range(1, max_n + 1)]
            stds = [float(np.std(samples[:n])) for n in range(1, max_n + 1)]
            esses = [approx_ess(samples[:n]) for n in range(2, max_n + 1)]
            esses = [1.0] + esses

            proposals_list = np.round(proposals, 6).tolist()
            proposals_list[0] = None

            runs.append(
                {
                    "samples": np.round(samples, 6).tolist(),
                    "proposals": proposals_list,
                    "accepted": accepted.tolist(),
                    "accepted_cum": accepted_cum.tolist(),
                    "means": np.round(means, 6).tolist(),
                    "stds": np.round(stds, 6).tolist(),
                    "esses": np.round(esses, 3).tolist(),
                }
            )

        data["chains"][str(d)] = runs

    return data


def write_data(output_path, max_n=500, runs_per_d=4):
    data = generate_data(max_n=max_n, runs_per_d=runs_per_d)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    write_data("metropolis_hastings_data.json")
