import requests
import json
import random

BASE_URL = "http://localhost:8000/api"

def test_operations():
    # 1. Register a vehicle with max capacity 500kg
    reg_no_small = f"REG-S-{random.randint(10000, 99999)}"
    v_payload = {
        "reg_no": reg_no_small,
        "name_model": "MINI-01",
        "type": "Mini",
        "capacity_kg": 500,
        "odometer": 0,
        "acq_cost": 25000.00
    }
    print(f"Creating small vehicle {reg_no_small}...")
    res = requests.post(f"{BASE_URL}/fleet/vehicles", json=v_payload)
    assert res.status_code == 201
    vehicle_small_id = res.json()["id"]

    # Register a driver
    lic_no = f"LIC-O-{random.randint(10000, 99999)}"
    d_payload = {
        "name": "Operator Steve",
        "license_no": lic_no,
        "category": "LMV",
        "expiry_date": "2030-05-15",
        "contact_no": "+1-555-1234",
        "safety_score": 100
    }
    print(f"Creating driver with license {lic_no}...")
    res = requests.post(f"{BASE_URL}/fleet/drivers", json=d_payload)
    assert res.status_code == 201
    driver_id = res.json()["id"]

    # 2. Draft a trip with cargo weight 700kg (exceeding max capacity 500kg)
    trip_payload = {
        "trip_code": f"TRP-{random.randint(10000, 99999)}",
        "source": "Warehouse A",
        "destination": "Client Site X",
        "vehicle_id": vehicle_small_id,
        "driver_id": driver_id,
        "cargo_weight": 700,
        "planned_distance": 120
    }
    print("Drafting trip with cargo exceeding capacity...")
    res = requests.post(f"{BASE_URL}/operations/trips", json=trip_payload)
    assert res.status_code == 201
    trip_id = res.json()["id"]

    # 3. Attempt to dispatch -> verify it throws a 422 Unprocessable Entity
    print("Attempting to dispatch overloaded trip...")
    res_dispatch = requests.put(f"{BASE_URL}/operations/trips/{trip_id}/dispatch")
    assert res_dispatch.status_code == 422, f"Expected 422, got {res_dispatch.status_code}: {res_dispatch.text}"
    print("Dispatch blocked with 422 Unprocessable Entity as expected.")

    # 4. Open a maintenance log -> verify vehicle shifts to 'In Shop'
    maint_payload = {
        "vehicle_id": vehicle_small_id,
        "service_type": "Engine Diagnostics",
        "cost": 350.00,
        "entry_date": "2026-07-12"
    }
    print("Sending vehicle to maintenance...")
    res_maint = requests.post(f"{BASE_URL}/operations/maintenance", json=maint_payload)
    assert res_maint.status_code == 201
    maint_log_id = res_maint.json()["id"]
    
    # Check vehicle status
    res_v = requests.get(f"{BASE_URL}/fleet/vehicles")
    vehicles = res_v.json()
    small_vehicle = next(v for v in vehicles if v["id"] == vehicle_small_id)
    assert small_vehicle["status"] == "In Shop"
    print("Vehicle status successfully updated to 'In Shop'.")

    # 5. Complete maintenance -> verify vehicle restores to 'Available'
    print("Completing maintenance...")
    res_maint_comp = requests.put(f"{BASE_URL}/operations/maintenance/{maint_log_id}/complete")
    assert res_maint_comp.status_code == 200
    
    # Check vehicle status
    res_v2 = requests.get(f"{BASE_URL}/fleet/vehicles")
    vehicles2 = res_v2.json()
    small_vehicle2 = next(v for v in vehicles2 if v["id"] == vehicle_small_id)
    assert small_vehicle2["status"] == "Available"
    print("Vehicle status successfully restored to 'Available'.")

    # 6. Create a valid trip (weight 300kg) and dispatch it
    valid_trip_payload = {
        "trip_code": f"TRP-V-{random.randint(10000, 99999)}",
        "source": "Warehouse A",
        "destination": "Client Site Y",
        "vehicle_id": vehicle_small_id,
        "driver_id": driver_id,
        "cargo_weight": 300,
        "planned_distance": 100
    }
    print("Creating valid trip...")
    res_v_trip = requests.post(f"{BASE_URL}/operations/trips", json=valid_trip_payload)
    assert res_v_trip.status_code == 201
    v_trip_id = res_v_trip.json()["id"]

    print("Dispatching valid trip...")
    res_v_dispatch = requests.put(f"{BASE_URL}/operations/trips/{v_trip_id}/dispatch")
    assert res_v_dispatch.status_code == 200
    v_trip_data = res_v_dispatch.json()
    assert v_trip_data["status"] == "Dispatched"
    
    # Check toll cost: planned_distance * 2.0 * multiplier (for 'Mini', multiplier is 1.5)
    # 100 * 2.0 * 1.5 = 300.0
    assert v_trip_data["toll_cost"] == 300.0
    print("Toll cost calculated correctly (300.0).")

    # Verify vehicle and driver status is 'On Trip'
    res_v_check = requests.get(f"{BASE_URL}/fleet/vehicles")
    v_item = next(v for v in res_v_check.json() if v["id"] == vehicle_small_id)
    assert v_item["status"] == "On Trip"

    res_d_check = requests.get(f"{BASE_URL}/fleet/drivers")
    d_item = next(d for d in res_d_check.json() if d["id"] == driver_id)
    assert d_item["status"] == "On Trip"
    print("Vehicle and driver correctly set to 'On Trip'.")

    # Complete the trip
    comp_payload = {
        "final_odometer": 150,
        "fuel_consumed_liters": 12.5,
        "fuel_cost": 25.00
    }
    print("Completing trip...")
    res_comp = requests.put(f"{BASE_URL}/operations/trips/{v_trip_id}/complete", json=comp_payload)
    assert res_comp.status_code == 200
    assert res_comp.json()["status"] == "Completed"
    
    # Check odometer and availability
    res_v_final = requests.get(f"{BASE_URL}/fleet/vehicles")
    v_final = next(v for v in res_v_final.json() if v["id"] == vehicle_small_id)
    assert v_final["odometer"] == 150
    assert v_final["status"] == "Available"
    print("Trip completed successfully. Odometer updated and assets set to 'Available'.")

    print("\n--- ALL OPERATIONS STATE MACHINE TESTS PASSED SUCCESSFULLY! ---")

if __name__ == "__main__":
    test_operations()
