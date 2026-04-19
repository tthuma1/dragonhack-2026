import json

from resource_types import Event
from sklearn.cluster import DBSCAN
def generate_stops(
        filename: str,
        points: list[dict],
        eps_m: float = 50,  # max razdalja med točkami v gruči (metri)
        min_samples: int = 10,  # min točk za gruč = stop
        min_duration_sec: int = 120,

):
    data = detect_stops_dbscan(points, eps_m, min_samples, min_duration_sec)

    with open(filename, 'a') as f:
        json.dump(data, f)
        f.write('\n')


import numpy as np


def centroid(points: list[dict]) -> tuple[float, float]:
    """Povprečna lokacija stopa."""
    return (
        sum(p["latitude"] for p in points) / len(points),
        sum(p["longitude"] for p in points) / len(points)
    )


def detect_stops_dbscan(
        points: list[dict],
        eps_m: float = 50,  # max razdalja med točkami v gruči (metri)
        min_samples: int = 10,  # min točk za gruč = stop
        min_duration_sec: int = 120,
) -> list[dict]:
    # Koordinate v radiane za haversine metriko
    coords = np.radians([[p["latitude"], p["longitude"]] for p in points])
    eps_rad = eps_m / 6371000  # metri → radiani

    db = DBSCAN(eps=eps_rad, min_samples=min_samples, algorithm="ball_tree", metric="haversine").fit(coords)

    stops = []
    for label in set(db.labels_):
        if label == -1:  # šum / pot med stopi
            continue

        cluster_points = [p for p, l in zip(points, db.labels_) if l == label]
        duration = cluster_points[-1]["time"] - cluster_points[0]["time"]

        if duration >= min_duration_sec:
            stops.append({
                "lat": centroid(cluster_points)[0],
                "lng": centroid(cluster_points)[1],
                "time_from": cluster_points[0]["time"],
                "time_to": cluster_points[-1]["time"],
                "point_count": len(cluster_points),
                "event_type": cluster_points[0]["event_type"],
                "event_name": cluster_points[0]["event_name"],
                "event_weight": []
            })

    return stops