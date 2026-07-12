import os
from typing import Any

import httpx

TOLLGURU_API_KEY = os.getenv("TOLLGURU_API_KEY", "")
TOLLGURU_URL = "https://apis.tollguru.com/toll/v2/origin-destination-waypoints"

# Maps TransitOps vehicle types (stored in Vehicle.type) to TollGuru vehicle type strings.
# TollGuru reference: https://docs.tollguru.com/vehicle-types
VEHICLE_TYPE_MAP: dict[str, str] = {
    "truck": "3AxlesTruck",
    "mini":  "2AxlesAuto",
    "van":   "2AxlesAuto",
}

DEFAULT_TOLLGURU_VEHICLE_TYPE = "2AxlesAuto"


def resolve_vehicle_type(vehicle_type: str) -> str:
    """
    Converts a TransitOps vehicle type string (e.g. 'Truck', 'Van', 'Mini')
    to the corresponding TollGuru vehicle type identifier.
    Falls back to DEFAULT_TOLLGURU_VEHICLE_TYPE for unknown types.
    """
    return VEHICLE_TYPE_MAP.get(vehicle_type.lower(), DEFAULT_TOLLGURU_VEHICLE_TYPE)


async def fetch_routes(
    source: str,
    destination: str,
    tollguru_vehicle_type: str = DEFAULT_TOLLGURU_VEHICLE_TYPE,
    cargo_weight_kg: int = 0,
) -> list[dict[str, Any]]:
    """
    Calls the TollGuru origin-destination-waypoints API and returns the raw
    `routes` array from the response.

    Each element in the returned list is a route dict containing:
      - summary.name              (str)
      - summary.labels            (List[str])
      - summary.distance.value    (int, meters)
      - summary.duration.text     (str)
      - costs.tag                 (float, FasTag toll cost in INR)
      - costs.fuel                (float, estimated fuel cost in INR)
      - polyline                  (str, Google-encoded polyline)

    Raises:
        httpx.HTTPStatusError: if TollGuru returns a non-2xx response.
        httpx.RequestError: on network-level failures.
    """
    payload: dict[str, Any] = {
        "from": {"address": source},
        "to": {"address": destination},
        "serviceProvider": "here",
        "country": "IND",
        "vehicle": {
            "type": tollguru_vehicle_type,
            "weight": {"value": cargo_weight_kg, "unit": "kg"},
        },
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            TOLLGURU_URL,
            json=payload,
            headers={
                "x-api-key": TOLLGURU_API_KEY,
                "Content-Type": "application/json",
            },
        )
        response.raise_for_status()
        data: dict[str, Any] = response.json()

    return data.get("routes", [])
