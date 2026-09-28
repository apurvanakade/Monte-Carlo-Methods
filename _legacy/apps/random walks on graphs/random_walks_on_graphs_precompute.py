import json
from pathlib import Path

import networkx as nx
import numpy as np


def create_sample_graphs():
    graphs = {}

    graphs["Loop (n=21)"] = nx.cycle_graph(21)
    graphs["Binary Tree (depth=4)"] = nx.balanced_tree(2, 4)
    graphs["Complete Graph (n=15)"] = nx.complete_graph(15)
    graphs["Barbell (bottleneck)"] = nx.barbell_graph(8, 1)

    size = 9
    clique1 = nx.relabel_nodes(nx.complete_graph(size), {i: i for i in range(size)})
    clique2 = nx.relabel_nodes(nx.complete_graph(size), {i: size + i for i in range(size)})
    clique3 = nx.relabel_nodes(nx.complete_graph(size), {i: 2 * size + i for i in range(size)})
    g_tripartite = nx.compose_all([clique1, clique2, clique3])
    g_tripartite.add_edge(size - 1, size)
    g_tripartite.add_edge(2 * size - 1, 2 * size)
    graphs["3-region (2 bottlenecks)"] = g_tripartite

    clique1 = nx.relabel_nodes(nx.complete_graph(size), {i: i for i in range(size)})
    clique2 = nx.relabel_nodes(nx.complete_graph(size), {i: size + i for i in range(size)})
    clique3 = nx.relabel_nodes(nx.complete_graph(size), {i: 2 * size + i for i in range(size)})
    clique4 = nx.relabel_nodes(nx.complete_graph(size), {i: 3 * size + i for i in range(size)})
    g_quad = nx.compose_all([clique1, clique2, clique3, clique4])
    g_quad.add_edge(size - 1, size)
    g_quad.add_edge(2 * size - 1, 2 * size)
    g_quad.add_edge(3 * size - 1, 3 * size)
    graphs["4-region (3 bottlenecks)"] = g_quad

    clique1 = nx.relabel_nodes(nx.complete_graph(size), {i: i for i in range(size)})
    clique2 = nx.relabel_nodes(nx.complete_graph(size), {i: size + i for i in range(size)})
    clique3 = nx.relabel_nodes(nx.complete_graph(size), {i: 2 * size + i for i in range(size)})
    g_cycle = nx.compose_all([clique1, clique2, clique3])
    g_cycle.add_edge(size - 1, size)
    g_cycle.add_edge(2 * size - 1, 2 * size)
    g_cycle.add_edge(3 * size - 1, 0)
    graphs["3-region (3 bottlenecks, cyclic)"] = g_cycle

    graphs["Grid 5x5"] = nx.grid_2d_graph(5, 5)
    graphs["Path (n=31)"] = nx.path_graph(31)
    graphs["Star (n=15)"] = nx.star_graph(14)
    graphs["Lollipop"] = nx.lollipop_graph(8, 8)

    return graphs


def get_transition_matrix(graph):
    n_nodes = graph.number_of_nodes()
    node_to_idx = {node: idx for idx, node in enumerate(graph.nodes())}
    transition = np.zeros((n_nodes, n_nodes))

    for node in graph.nodes():
        i = node_to_idx[node]
        neighbors = list(graph.neighbors(node))
        degree = len(neighbors)
        if degree > 0:
            for neighbor in neighbors:
                j = node_to_idx[neighbor]
                transition[j, i] = 1.0 / degree

    return transition, node_to_idx


def get_stationary_distribution(graph):
    degrees = dict(graph.degree())
    total_degree = sum(degrees.values())
    node_to_idx = {node: idx for idx, node in enumerate(graph.nodes())}
    stationary = np.zeros(len(graph.nodes()))
    for node, degree in degrees.items():
        stationary[node_to_idx[node]] = degree / total_degree
    return stationary


def get_eigenvalues(transition):
    eigenvalues = np.linalg.eigvals(transition)
    eigenvalues = eigenvalues[np.argsort(np.abs(eigenvalues))[::-1]]
    return np.real(eigenvalues)


def find_mixing_time(tv_distances, threshold=0.1):
    indices = np.where(tv_distances <= threshold)[0]
    if len(indices) > 0:
        return int(indices[0])
    return None


def _round_list(array_like, digits=6):
    arr = np.asarray(array_like)
    return np.round(arr, digits).tolist()


def generate_data(max_time=200):
    graphs = create_sample_graphs()
    graph_names = sorted(list(graphs.keys()))

    payload = {
        "max_time": int(max_time),
        "default_graph": "Barbell (bottleneck)",
        "default_start": 0,
        "default_time": 0,
        "graphs": {},
    }

    for graph_name in graph_names:
        graph = graphs[graph_name]
        transition, node_to_idx = get_transition_matrix(graph)
        stationary = get_stationary_distribution(graph)

        nodes = list(graph.nodes())
        n_nodes = len(nodes)
        edges = [[node_to_idx[u], node_to_idx[v]] for u, v in graph.edges()]

        pos = nx.spring_layout(graph, seed=42)
        positions = [[float(pos[node][0]), float(pos[node][1])] for node in nodes]

        eigenvalues = get_eigenvalues(transition)
        spectral_gap = 1.0 - abs(eigenvalues[1]) if len(eigenvalues) > 1 else 0.0

        starts = {}
        for start_idx in range(n_nodes):
            initial = np.zeros(n_nodes)
            initial[start_idx] = 1.0

            distributions = np.zeros((max_time + 1, n_nodes))
            distributions[0] = initial
            for t in range(1, max_time + 1):
                distributions[t] = transition @ distributions[t - 1]

            tv = 0.5 * np.sum(np.abs(distributions - stationary), axis=1)
            l2 = np.linalg.norm(distributions - stationary, axis=1)
            max_prob = np.max(distributions, axis=1)
            mixing_time = find_mixing_time(tv, threshold=0.1)

            starts[str(start_idx)] = {
                "distributions": _round_list(distributions),
                "tv": _round_list(tv),
                "l2": _round_list(l2),
                "max_prob": _round_list(max_prob),
                "mixing_time": mixing_time,
            }

        payload["graphs"][graph_name] = {
            "nodes": [str(n) for n in nodes],
            "edges": edges,
            "positions": positions,
            "stationary": _round_list(stationary),
            "eigenvalues": _round_list(eigenvalues),
            "spectral_gap": float(round(spectral_gap, 6)),
            "n_nodes": n_nodes,
            "starts": starts,
        }

    return payload


def write_data(output_path, max_time=200):
    data = generate_data(max_time=max_time)
    output = Path(output_path)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(data, separators=(",", ":")), encoding="utf-8")


if __name__ == "__main__":
    write_data("random_walks_on_graphs_data.json", max_time=200)
