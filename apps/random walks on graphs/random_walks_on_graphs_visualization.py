import matplotlib.pyplot as plt
import numpy as np
import networkx as nx
from matplotlib.cm import ScalarMappable
from matplotlib.colors import Normalize


class RandomWalkOnGraphsVisualizer:
    def __init__(self):
        self.current_scene_key = None
        self.fig = None
        self.graph = None
        self.node_order = None
        self.node_to_idx = None
        self.tv_distances = None
        self.max_time = None
        self.mixing_time = None

        self.nodes_artist = None
        self.title_artist = None
        self.tv_point_artist = None
        self.stats_text_artist = None

    def _build_scene(self, sim_data):
        if self.fig is not None:
            plt.close(self.fig)

        self.graph = sim_data["graph"]
        self.node_to_idx = sim_data["node_to_idx"]
        self.node_order = list(self.graph.nodes())
        self.tv_distances = sim_data["tv_distances"]
        self.max_time = sim_data["max_time"]
        self.mixing_time = sim_data["mixing_time"]

        stationary = sim_data["stationary"]
        eigenvalues = sim_data["eigenvalues"]

        self.fig = plt.figure(figsize=(13, 9), dpi=100)
        gs = self.fig.add_gridspec(3, 2, height_ratios=[8, 0.5, 4], width_ratios=[1, 1], hspace=0.4, wspace=0.3)

        ax_dist = self.fig.add_subplot(gs[0, 0])
        ax_tv = self.fig.add_subplot(gs[0, 1])
        cax = self.fig.add_subplot(gs[1, :])
        ax_spec = self.fig.add_subplot(gs[2, :])

        pos = nx.kamada_kawai_layout(self.graph)
        n_nodes = self.graph.number_of_nodes()

        if n_nodes <= 10:
            node_size = 500
            font_size = 10
        elif n_nodes <= 20:
            node_size = 300
            font_size = 8
        elif n_nodes <= 40:
            node_size = 200
            font_size = 6
        else:
            node_size = 100
            font_size = 0

        cmap = plt.cm.RdYlBu_r
        norm = Normalize(vmin=0, vmax=max(float(np.max(stationary)) * 1.1, 0.1))

        nx.draw_networkx_edges(self.graph, pos, ax=ax_dist, width=1.5, alpha=0.3, edge_color="gray")
        initial_colors = np.array([sim_data["current_dist"][self.node_to_idx[node]] for node in self.node_order])
        self.nodes_artist = nx.draw_networkx_nodes(
            self.graph,
            pos,
            ax=ax_dist,
            node_color=initial_colors,
            node_size=node_size,
            cmap=cmap,
            vmin=0,
            vmax=norm.vmax,
            edgecolors="black",
            linewidths=1,
        )

        if font_size > 0:
            nx.draw_networkx_labels(self.graph, pos, ax=ax_dist, font_size=font_size)

        self.title_artist = ax_dist.set_title("", fontsize=12, fontweight="bold")
        ax_dist.axis("off")

        times = np.arange(len(self.tv_distances))
        ax_tv.plot(times, self.tv_distances, "b-", linewidth=2, label="TV Distance")
        ax_tv.axhline(y=0.1, color="r", linestyle="--", linewidth=2, label="Threshold (epsilon = 0.1)")
        self.tv_point_artist, = ax_tv.plot([0], [self.tv_distances[0]], "ro", markersize=9, label="Current time")

        if self.mixing_time is not None:
            ax_tv.axvline(x=self.mixing_time, color="g", linestyle=":", linewidth=2, alpha=0.8)
            mixing_label = f"Mixing time (epsilon = 0.1): t = {self.mixing_time}"
        else:
            mixing_label = f"Mixing time (epsilon = 0.1): > {self.max_time}"

        ax_tv.text(
            0.02,
            0.98,
            mixing_label,
            transform=ax_tv.transAxes,
            fontsize=11,
            fontweight="bold",
            verticalalignment="top",
            bbox=dict(boxstyle="round", facecolor="wheat", alpha=0.8),
        )

        ax_tv.set_title("Total Variation Distance to Stationary Distribution", fontsize=12, fontweight="bold")
        ax_tv.set_xlabel("Time Step", fontsize=11)
        ax_tv.set_ylabel("TV Distance", fontsize=11)
        ax_tv.grid(True, alpha=0.3)
        ax_tv.set_xlim(-1, self.max_time + 1)
        ax_tv.set_ylim(-0.05, min(1.05, float(np.max(self.tv_distances)) * 1.1))
        ax_tv.legend(loc="upper right", fontsize=9)

        sm = ScalarMappable(cmap=cmap, norm=norm)
        sm.set_array([])
        cbar = self.fig.colorbar(sm, cax=cax, orientation="horizontal")
        cbar.set_label("Probability", fontsize=10)

        spectral_abs = np.abs(eigenvalues)
        indices = np.arange(len(eigenvalues))
        colors = ["red" if i == 0 else "steelblue" for i in range(len(eigenvalues))]
        ax_spec.bar(indices, spectral_abs, color=colors, alpha=0.8, edgecolor="black")

        if len(eigenvalues) >= 2:
            lambda_1 = float(spectral_abs[0])
            lambda_2 = float(spectral_abs[1])
            ax_spec.add_patch(
                plt.Rectangle((0.3, lambda_2), 0.4, lambda_1 - lambda_2, alpha=0.3, color="green", label="Spectral Gap")
            )

        ax_spec.text(
            0.02,
            0.95,
            f"Spectral Gap = 1 - |lambda_2| = {sim_data['spectral_gap']:.6f}",
            transform=ax_spec.transAxes,
            fontsize=11,
            fontweight="bold",
            verticalalignment="top",
            bbox=dict(boxstyle="round", facecolor="lightgreen", alpha=0.8),
        )

        ax_spec.set_title("Spectrum of Transition Matrix", fontsize=12, fontweight="bold")
        ax_spec.set_xlabel("Eigenvalue Index", fontsize=11)
        ax_spec.set_ylabel("Eigenvalue Magnitude |lambda|", fontsize=11)
        ax_spec.grid(True, alpha=0.3, axis="y")
        ax_spec.set_xlim(-0.5, len(eigenvalues) - 0.5)
        ax_spec.set_ylim(0, 1.05)
        ax_spec.legend(loc="upper right", fontsize=9)

        self.stats_text_artist = self.fig.text(0.5, 0.01, "", ha="center", fontsize=9, family="monospace")

    def _update_dynamic_artists(self, sim_data):
        current_t = sim_data["time_step"]
        node_colors = np.array([sim_data["current_dist"][self.node_to_idx[node]] for node in self.node_order])

        self.nodes_artist.set_array(node_colors)
        self.title_artist.set_text(f"Time step: {current_t}\\nCurrent Distribution")
        self.tv_point_artist.set_data([current_t], [self.tv_distances[current_t]])

        self.stats_text_artist.set_text(
            (
                f"Starting node: {sim_data['start_node_label']}  |  "
                f"Current TV distance: {sim_data['total_variation']:.6f}  |  "
                f"L2 distance: {sim_data['l2_distance']:.6f}  |  "
                f"Max prob: {sim_data['max_prob']:.6f}"
            )
        )

    def render(self, sim_data):
        scene_key = f"{sim_data['graph_name']}|{sim_data['start_node_idx']}|{sim_data['max_time']}"
        if self.current_scene_key != scene_key or self.fig is None:
            self._build_scene(sim_data)
            self.current_scene_key = scene_key

        self._update_dynamic_artists(sim_data)

        self.fig.canvas.draw()
        image = np.array(self.fig.canvas.renderer.buffer_rgba())[:, :, :3]
        return image
