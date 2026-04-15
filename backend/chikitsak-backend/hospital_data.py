import json
import math
import re
from functools import lru_cache
from pathlib import Path


# App-facing hospital search uses a nationwide point dataset for speed and
# deterministic local lookup. Polygon extraction from OSM is much slower and
# is intentionally not part of the runtime path.
DATA_PATH = Path(__file__).resolve().parent / "data" / "hospitals.geojson"
TAG_PATTERN = re.compile(r'"([^"]+)"=>"([^"]*)"')
EMERGENCY_VALUES = {"yes", "true", "designated", "24/7"}


def _parse_other_tags(raw_tags):
    if not raw_tags:
        return {}
    return {key: value for key, value in TAG_PATTERN.findall(raw_tags)}


def _compose_address(properties, tags):
    direct_address = properties.get("address")
    if direct_address:
        return direct_address

    if tags.get("addr:full"):
        return tags["addr:full"]

    address_parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:suburb"),
        tags.get("addr:city"),
        tags.get("addr:district"),
        tags.get("addr:state"),
        tags.get("addr:postcode"),
    ]
    return ", ".join(part for part in address_parts if part) or None


def _haversine_km(lat1, lon1, lat2, lon2):
    radius_km = 6371.0

    lat1_rad = math.radians(lat1)
    lon1_rad = math.radians(lon1)
    lat2_rad = math.radians(lat2)
    lon2_rad = math.radians(lon2)

    delta_lat = lat2_rad - lat1_rad
    delta_lon = lon2_rad - lon1_rad

    a = (
        math.sin(delta_lat / 2) ** 2
        + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(delta_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return radius_km * c


@lru_cache(maxsize=1)
def load_hospitals():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Hospital dataset not found at {DATA_PATH}")

    with DATA_PATH.open("r", encoding="utf-8") as source_file:
        data = json.load(source_file)

    hospitals = []
    for index, feature in enumerate(data.get("features", [])):
        geometry = feature.get("geometry") or {}
        coordinates = geometry.get("coordinates") or []
        properties = feature.get("properties") or {}
        tags = _parse_other_tags(properties.get("other_tags"))

        if geometry.get("type") != "Point" or len(coordinates) < 2:
            continue

        name = properties.get("name") or tags.get("name") or tags.get("name:en")
        if not name:
            continue

        hospitals.append(
            {
                "id": properties.get("osm_id") or f"hospital-{index}",
                "osm_id": properties.get("osm_id"),
                "name": name,
                "latitude": coordinates[1],
                "longitude": coordinates[0],
                "address": _compose_address(properties, tags),
                "district": tags.get("addr:district"),
                "city": tags.get("addr:city"),
                "state": tags.get("addr:state"),
                "postcode": tags.get("addr:postcode"),
                "phone": tags.get("phone") or tags.get("contact:phone"),
                "emergency": (tags.get("emergency") or "").strip().lower() in EMERGENCY_VALUES,
                "healthcare": tags.get("healthcare") or tags.get("amenity"),
            }
        )

    return hospitals


def find_nearby_hospitals(latitude, longitude, radius_km=50, limit=20):
    hospitals = []

    for hospital in load_hospitals():
        distance_km = _haversine_km(
            latitude,
            longitude,
            hospital["latitude"],
            hospital["longitude"],
        )

        if distance_km <= radius_km:
            hospitals.append(
                {
                    **hospital,
                    "distance_km": round(distance_km, 2),
                }
            )

    hospitals.sort(key=lambda item: item["distance_km"])
    return hospitals[:limit]
