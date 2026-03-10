import numpy as np
import networkx as nx


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


def get_spectral_gap(transition):
    eigenvalues = get_eigenvalues(transition)
    if len(eigenvalues) >= 2:
        return 1.0 - np.abs(eigenvalues[1])
    return 0.0


def find_mixing_time(tv_distances, threshold=0.1):
    indices = np.where(tv_distances <= threshold)[0]
    if len(indices) > 0:
        return int(indices[0])
    return None


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


class RandomWalkOnGraphsSimulation:
    def __init__(self):
        self.graphs = create_sample_graphs()
        self.precomputed = {}

    def _cache_key(self, graph_name, start_node_idx, max_time):
        return f"{graph_name}|{start_node_idx}|{max_time}"

    def _precompute_series(self, graph_name, start_node_idx, max_time):
        graph = self.graphs[graph_name]
        n_nodes = graph.number_of_nodes()
        start_node_idx = max(0, min(int(start_node_idx), n_nodes - 1))
        max_time = int(max_time)

        key = self._cache_key(graph_name, start_node_idx, max_time)
        if key in self.precomputed:
            return self.precomputed[key]

        transition, node_to_idx = get_transition_matrix(graph)
        idx_to_node = {idx: node for node, idx in node_to_idx.items()}
        stationary = get_stationary_distribution(graph)

        initial_dist = np.zeros(n_nodes)
        initial_dist[start_node_idx] = 1.0

        distributions = np.zeros((max_time + 1, n_nodes))
        distributions[0] = initial_dist
        for t in range(1, max_time + 1):
            distributions[t] = transition @ distributions[t - 1]

        tv_distances = 0.5 * np.sum(np.abs(distributions - stationary), axis=1)
        l2_distances = np.linalg.norm(distributions - stationary, axis=1)
        max_probs = np.max(distributions, axis=1)
        mixing_time = find_mixing_time(tv_distances, threshold=0.1)

        eigenvalues = get_eigenvalues(transition)
        spectral_gap = get_spectral_gap(transition)

        precomputed = {
            "graph": graph,
            "graph_name": graph_name,
            "max_time": max_time,
            "start_node_idx": start_node_idx,
            "start_node_label": str(idx_to_node[start_node_idx]),
            "node_to_idx": node_to_idx,
            "stationary": stationary,
            "distributions": distributions,
            "tv_distances": tv_distances,
            "l2_distances": l2_distances,
            "max_probs": max_probs,
            "mixing_time": mixing_time,
            "eigenvalues": eigenvalues,
            "spectral_gap": float(spectral_gap),
        }

        self.precomputed[key] = precomputed
        return precomputed

    def get_graph_info(self):
        options = sorted(list(self.graphs.keys()))
        node_counts = {name: int(self.graphs[name].number_of_nodes()) for name in options}
        return {
            "options": options,
            "node_counts": node_counts,
            "default_graph": "Barbell (bottleneck)",
            "default_start": 0,
            "default_time": 0,
            "default_max_time": 200,
        }

    def warm_cache(self, graph_name, start_node_idx, max_time=200):
        precomputed = self._precompute_series(graph_name, start_node_idx, max_time)
        return {
            "graph_name": precomputed["graph_name"],
            "start_node_idx": precomputed["start_node_idx"],
            "max_time": precomputed["max_time"],
            "n_nodes": int(precomputed["graph"].number_of_nodes()),
            "n_steps": int(precomputed["max_time"] + 1),
        }

    def run(self, graph_name, start_node_idx, time_step, max_time=200):
        precomputed = self._precompute_series(graph_name, start_node_idx, max_time)
        time_step = max(0, min(int(time_step), int(precomputed["max_time"])))
        current_dist = precomputed["distributions"][time_step]

        return {
            "graph": precomputed["graph"],
            "graph_name": precomputed["graph_name"],
            "time_step": time_step,
            "max_time": precomputed["max_time"],
            "start_node_idx": precomputed["start_node_idx"],
            "start_node_label": precomputed["start_node_label"],
            "node_to_idx": precomputed["node_to_idx"],
            "current_dist": current_dist,
            "stationary": precomputed["stationary"],
            "tv_distances": precomputed["tv_distances"],
            "mixing_time": precomputed["mixing_time"],
            "eigenvalues": precomputed["eigenvalues"],
            "spectral_gap": precomputed["spectral_gap"],
            "total_variation": float(precomputed["tv_distances"][time_step]),
            "l2_distance": float(precomputed["l2_distances"][time_step]),
            "max_prob": float(precomputed["max_probs"][time_step]),
        }
