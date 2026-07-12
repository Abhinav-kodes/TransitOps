import { useState, useEffect, useCallback } from "react"
import { useTranslation } from "react-i18next"
import { AlertCircle, ArrowRight, Loader2, MapPin, Navigation, Route, Sparkles, CheckCircle2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import InteractiveMap from "@/components/dashboard/InteractiveMap"
import CompleteTripDialog from "@/components/dashboard/CompleteTripDialog"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface Vehicle {
  id: number
  reg_no: string
  name_model: string
  type: string
  capacity_kg: number
  odometer: number
  status: string
}

interface Driver {
  id: number
  name: string
  license_no: string
  expiry_date: string
  status: string
  category: string
}

interface Trip {
  id: number
  trip_code: str
  source: string
  destination: string
  vehicle_id: number | null
  driver_id: number | null
  cargo_weight: number
  planned_distance: number
  toll_cost: number
  status: "Draft" | "Dispatched" | "Completed" | "Cancelled"
  vehicle_name?: string
  driver_name?: string
}

interface RouteOption {
  route_name: string
  labels: string[]
  distance_km: number
  distance_text: string
  duration_text: string
  toll_cost: number
  estimated_fuel: number
  polyline: string
}

const STATUS_STYLE: Record<string, { badge: string; border: string }> = {
  "Draft": {
    badge: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300",
    border: "border-zinc-200 dark:border-zinc-800",
  },
  "Dispatched": {
    badge: "bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    border: "border-blue-200 dark:border-blue-900/40",
  },
  "Completed": {
    badge: "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    border: "border-emerald-200 dark:border-emerald-900/40",
  },
  "Cancelled": {
    badge: "bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    border: "border-red-200 dark:border-red-900/40",
  },
}

export default function TripsPage() {
  const { t } = useTranslation()

  // Data fetching states
  const [trips, setTrips] = useState<Trip[]>([])
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [drivers, setDrivers] = useState<Driver[]>([])
  const [tripsLoading, setTripsLoading] = useState(true)
  const [optionsLoading, setOptionsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Tabs for the Right Pane ("board" or "map")
  const [rightTab, setRightTab] = useState<"board" | "map">("board")

  // Completion Dialog State
  const [completeOpen, setCompleteOpen] = useState(false)
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null)
  const [selectedVehicleOdom, setSelectedVehicleOdom] = useState<number | null>(null)

  // Form states for creating/planning
  const [source, setSource] = useState("")
  const [destination, setDestination] = useState("")
  const [cargoWeight, setCargoWeight] = useState("")
  const [vehicleId, setVehicleId] = useState("")
  const [driverId, setDriverId] = useState("")
  const [plannedDistance, setPlannedDistance] = useState("")
  const [tripCode, setTripCode] = useState("")

  // Route Planning states
  const [routeOptions, setRouteOptions] = useState<RouteOption[]>([])
  const [selectedRoute, setSelectedRoute] = useState<RouteOption | null>(null)

  // Capacity Warning Info
  const selectedVehicle = vehicles.find((v) => v.id === parseInt(vehicleId))
  const cargoWeightNum = parseInt(cargoWeight) || 0
  const isCapacityBreached = selectedVehicle && cargoWeightNum > selectedVehicle.capacity_kg
  const capacityDiff = selectedVehicle ? cargoWeightNum - selectedVehicle.capacity_kg : 0

  // 1. Fetch Existing Trips
  const fetchTrips = useCallback(async () => {
    setTripsLoading(true)
    setError(null)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/operations/trips`, {
        headers: token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error("Failed to load trips")
      const data = await res.json()
      setTrips(data)
    } catch (err: any) {
      setError(err.message || "Failed to load dispatches")
    } finally {
      setTripsLoading(false)
    }
  }, [])

  // 2. Fetch Available Assets (Vehicles/Drivers)
  const fetchAssets = useCallback(async () => {
    try {
      const token = localStorage.getItem("transitops-token")
      const headers = token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}

      // Fetch Vehicles
      const vRes = await fetch(`${API_URL}/api/fleet/vehicles`, { headers })
      if (vRes.ok) {
        const vData: Vehicle[] = await vRes.json()
        setVehicles(vData)
      }

      // Fetch Drivers
      const dRes = await fetch(`${API_URL}/api/fleet/drivers`, { headers })
      if (dRes.ok) {
        const dData: Driver[] = await dRes.json()
        setDrivers(dData)
      }
    } catch {
      // Silently catch asset loading errors
    }
  }, [])

  useEffect(() => {
    fetchTrips()
    fetchAssets()
  }, [fetchTrips, fetchAssets])

  // Helper to generate a unique trip code
  const handleAutoGenerateTripCode = () => {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "")
    const randomSuffix = Math.floor(1000 + Math.random() * 9000)
    setTripCode(`TR-${dateStr}-${randomSuffix}`)
  }

  // 3. Plan Trip Routes (TollGuru call)
  const handleFindRoutes = async () => {
    if (!source || !destination || !vehicleId || !driverId || !cargoWeight) {
      setError("Please fill out all fields before finding routes.")
      return
    }

    if (isCapacityBreached) {
      setError("Cannot plan routes. Cargo weight exceeds vehicle capacity limit.")
      return
    }

    setError(null)
    setOptionsLoading(true)
    setSelectedRoute(null)
    setPlannedDistance("")

    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/operations/trips/plan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          source,
          destination,
          cargo_weight: cargoWeightNum,
          vehicle_id: parseInt(vehicleId),
          driver_id: parseInt(driverId),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to query routes from TollGuru.")
      }

      const options: RouteOption[] = await res.json()
      setRouteOptions(options)

      // Auto-select the first option
      if (options.length > 0) {
        handleSelectRoute(options[0])
      }
      
      // Auto-fill a trip code if empty
      if (!tripCode) {
        handleAutoGenerateTripCode()
      }

      // Switch active tab to Route Map so they see it drawn!
      setRightTab("map")
    } catch (err: any) {
      setError(err.message || "Route planning failed.")
    } finally {
      setOptionsLoading(false)
    }
  }

  // Select a Route Option card
  const handleSelectRoute = (option: RouteOption) => {
    setSelectedRoute(option)
    setPlannedDistance(option.distance_km.toString())
  }

  // Reset form and planning state
  const handleResetForm = () => {
    setSource("")
    setDestination("")
    setCargoWeight("")
    setVehicleId("")
    setDriverId("")
    setPlannedDistance("")
    setTripCode("")
    setRouteOptions([])
    setSelectedRoute(null)
    setError(null)
    setRightTab("board")
  }

  // 4. Confirm Route -> Create Draft Trip
  const handleConfirmRoute = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRoute) return

    setError(null)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/operations/trips/confirm`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          source,
          destination,
          cargo_weight: cargoWeightNum,
          vehicle_id: parseInt(vehicleId),
          driver_id: parseInt(driverId),
          trip_code: tripCode.trim() || `TR-${Date.now()}`,
          selected_route_name: selectedRoute.route_name,
          planned_dist: selectedRoute.distance_km,
          toll_cost: selectedRoute.toll_cost,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to confirm trip draft.")
      }

      // Refresh list, clean up, back to Board feed
      await fetchTrips()
      await fetchAssets()
      handleResetForm()
    } catch (err: any) {
      setError(err.message || "Failed to confirm route.")
    }
  }

  // 5. State transitions: Dispatch Trip
  const handleDispatchTrip = async (tripId: number) => {
    setError(null)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/operations/trips/${tripId}/dispatch`, {
        method: "PUT",
        headers: token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to dispatch trip.")
      }
      await fetchTrips()
      await fetchAssets()
    } catch (err: any) {
      setError(err.message || "Dispatch failed.")
    }
  }

  // 6. State transitions: Cancel Trip
  const handleCancelTrip = async (tripId: number) => {
    setError(null)
    if (!window.confirm("Are you sure you want to cancel this dispatch?")) return
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/operations/trips/${tripId}/cancel`, {
        method: "PUT",
        headers: token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to cancel trip.")
      }
      await fetchTrips()
      await fetchAssets()
    } catch (err: any) {
      setError(err.message || "Cancellation failed.")
    }
  }

  // 7. Complete Trip trigger
  const handleCompleteTrigger = (trip: Trip) => {
    const v = vehicles.find((veh) => veh.id === trip.vehicle_id)
    setSelectedTripId(trip.id)
    setSelectedVehicleOdom(v ? v.odometer : null)
    setCompleteOpen(true)
  }

  // Filter available items for form dropdowns
  const availableVehicles = vehicles.filter((v) => v.status === "Available" || v.id === parseInt(vehicleId))
  const availableDrivers = drivers.filter((d) => d.status === "Available" || d.id === parseInt(driverId))

  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white">
            Trip Dispatcher
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Design optimized paths using real-time TollGuru coordinates and orchestrate dispatches.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-6 flex items-start gap-3 rounded-lg bg-red-50 p-4 text-sm font-medium text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 dark:hover:text-red-300">
            <X className="size-4" />
          </button>
        </div>
      )}

      {/* Main Dual Pane Content */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        
        {/* LEFT COLUMN: Dispatch Form & Route Selection (mockup design) */}
        <div className="lg:col-span-5 flex flex-col gap-6">
          
          {/* Trip Lifecycle Stepper */}
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-4">
              Trip Lifecycle
            </h3>
            <div className="relative flex items-center justify-between px-2">
              {/* Connector line */}
              <div className="absolute left-6 right-6 top-1/2 h-0.5 -translate-y-1/2 bg-zinc-200 dark:bg-zinc-800 z-0" />
              
              <div className="z-10 flex flex-col items-center gap-1.5">
                <div className={`flex size-6 items-center justify-center rounded-full text-[10px] font-bold ${routeOptions.length > 0 ? "bg-zinc-500 text-white" : "bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400"}`}>
                  1
                </div>
                <span className="text-[10px] font-medium text-zinc-500">Draft</span>
              </div>

              <div className="z-10 flex flex-col items-center gap-1.5">
                <div className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold">
                  2
                </div>
                <span className="text-[10px] font-medium text-zinc-500">Dispatched</span>
              </div>

              <div className="z-10 flex flex-col items-center gap-1.5">
                <div className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold">
                  3
                </div>
                <span className="text-[10px] font-medium text-zinc-500">Completed</span>
              </div>

              <div className="z-10 flex flex-col items-center gap-1.5">
                <div className="flex size-6 items-center justify-center rounded-full bg-zinc-200 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400 text-[10px] font-bold">
                  4
                </div>
                <span className="text-[10px] font-medium text-zinc-500">Cancelled</span>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="rounded-lg border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-zinc-900 dark:text-white uppercase tracking-wide">
                Create Dispatch Trip
              </h2>
              {(source || destination || vehicleId || driverId) && (
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-xs text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
                >
                  Clear Form
                </button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">SOURCE</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="e.g. Gandhinagar Depot"
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="h-9 pl-9 text-sm"
                  />
                </div>
              </div>

              <div>
                <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">DESTINATION</Label>
                <div className="relative">
                  <Navigation className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
                  <Input
                    placeholder="e.g. Ahmedabad Hub"
                    value={destination}
                    onChange={(e) => setDestination(e.target.value)}
                    className="h-9 pl-9 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">VEHICLE (AVAILABLE ONLY)</Label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="h-9 w-full rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-700 focus:border-[#0080FF] focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <option value="">Select vehicle...</option>
                    {availableVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.reg_no} — {v.name_model} ({v.capacity_kg} kg)
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">DRIVER (AVAILABLE ONLY)</Label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="h-9 w-full rounded border border-zinc-200 bg-white px-3 text-xs text-zinc-700 focus:border-[#0080FF] focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300"
                  >
                    <option value="">Select driver...</option>
                    {availableDrivers.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.category}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">CARGO WEIGHT (KG)</Label>
                  <Input
                    type="number"
                    placeholder="e.g. 500"
                    value={cargoWeight}
                    onChange={(e) => setCargoWeight(e.target.value)}
                    className="h-9 text-sm"
                  />
                </div>

                <div>
                  <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">PLANNED DISTANCE (KM)</Label>
                  <Input
                    type="text"
                    disabled
                    placeholder="Auto-calculated"
                    value={plannedDistance ? `${plannedDistance} km` : ""}
                    className="h-9 bg-zinc-50 text-sm dark:bg-zinc-900/50"
                  />
                </div>
              </div>

              {/* CAPACITY WARNING BOX (directly matching the mockup warning style) */}
              {isCapacityBreached && (
                <div className="rounded-md border border-red-200 bg-red-50/50 p-3.5 text-xs text-red-700 dark:border-red-900/40 dark:bg-red-950/20 dark:text-red-400">
                  <div className="font-semibold mb-1">Capacity Check Failed</div>
                  <div className="space-y-0.5">
                    <div>Vehicle Capacity: {selectedVehicle.capacity_kg.toLocaleString()} kg</div>
                    <div>Cargo Weight: {cargoWeightNum.toLocaleString()} kg</div>
                    <div className="font-semibold text-red-600 dark:text-red-400 mt-1 flex items-center gap-1">
                      <span>❌ Capacity exceeded by {capacityDiff.toLocaleString()} kg &rarr; dispatch blocked</span>
                    </div>
                  </div>
                </div>
              )}

              {/* BUTTON: PLAN ROUTES */}
              {routeOptions.length === 0 && (
                <Button
                  onClick={handleFindRoutes}
                  disabled={optionsLoading || isCapacityBreached || !source || !destination || !vehicleId || !driverId || !cargoWeight}
                  className="w-full h-10 mt-2 bg-[#0080FF] text-white hover:bg-[#006ce6] flex items-center justify-center gap-2"
                >
                  {optionsLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Optimizing Routes...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Find Optimized Routes (TollGuru)
                    </>
                  )}
                </Button>
              )}
            </div>

            {/* ROUTE CARDS (Show once optimized options are returned) */}
            {routeOptions.length > 0 && (
              <div className="mt-6 border-t border-zinc-100 pt-5 dark:border-zinc-800 space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-wider">
                    Select Optimized Option
                  </h4>
                  <span className="text-[10px] text-zinc-400">Powered by TollGuru</span>
                </div>

                <div className="space-y-2.5">
                  {routeOptions.map((opt, i) => {
                    const isSelected = selectedRoute?.route_name === opt.route_name
                    return (
                      <div
                        key={i}
                        onClick={() => handleSelectRoute(opt)}
                        className={`cursor-pointer rounded-lg border p-3.5 transition-all ${
                          isSelected
                            ? "border-[#0080FF] bg-blue-50/20 dark:bg-blue-950/10"
                            : "border-zinc-200 bg-white hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-900/50"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <h5 className="text-sm font-semibold text-zinc-900 dark:text-white">
                            {opt.route_name}
                          </h5>
                          <div className="flex flex-wrap gap-1">
                            {opt.labels.map((lbl, li) => (
                              <span
                                key={li}
                                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                                  lbl === "cheapest" || lbl === "best"
                                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
                                    : lbl === "fastest"
                                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                                    : "bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-400"
                                }`}
                              >
                                {lbl}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Route card metrics */}
                        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[11px] text-zinc-500 dark:text-zinc-400">
                          <div>
                            <div className="text-zinc-400 text-[10px] uppercase">Dist</div>
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                              {opt.distance_text || `${opt.distance_km} km`}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-400 text-[10px] uppercase">Duration</div>
                            <div className="font-semibold text-zinc-800 dark:text-zinc-200 mt-0.5">
                              {opt.duration_text || "—"}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-400 text-[10px] uppercase">Toll Cost</div>
                            <div className="font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                              ₹{opt.toll_cost.toLocaleString()}
                            </div>
                          </div>
                          <div>
                            <div className="text-zinc-400 text-[10px] uppercase">Fuel Est</div>
                            <div className="font-semibold text-amber-600 dark:text-amber-400 mt-0.5">
                              ₹{opt.estimated_fuel.toLocaleString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* TRIP CODE CONFIRMATION FORM */}
                <form onSubmit={handleConfirmRoute} className="mt-5 space-y-3 pt-3 border-t border-zinc-100 dark:border-zinc-800">
                  <div>
                    <Label className="mb-1 block text-xs text-zinc-500 dark:text-zinc-400">TRIP CODE (UNIQUE)</Label>
                    <div className="flex gap-2">
                      <Input
                        required
                        placeholder="TR-2026-0001"
                        value={tripCode}
                        onChange={(e) => setTripCode(e.target.value)}
                        className="h-9 text-sm font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleAutoGenerateTripCode}
                        className="h-9 text-xs px-3 shrink-0"
                      >
                        Regen
                      </Button>
                    </div>
                  </div>

                  <div className="flex gap-2.5 pt-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleResetForm}
                      className="flex-1 h-9 text-xs"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={!selectedRoute || isCapacityBreached}
                      className="flex-1 h-9 text-xs bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-800 dark:hover:bg-zinc-700"
                    >
                      Confirm Route (Draft)
                    </Button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Interactive Map / Live Board Feed */}
        <div className="lg:col-span-7 flex flex-col h-full min-h-[500px]">
          
          {/* Tab buttons */}
          <div className="flex items-center gap-2 border-b border-zinc-200 pb-3 mb-4 dark:border-zinc-800">
            <button
              onClick={() => setRightTab("board")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                rightTab === "board"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              Live Board
            </button>
            <button
              onClick={() => setRightTab("map")}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                rightTab === "map"
                  ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
                  : "text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
              }`}
            >
              Route Map
            </button>
          </div>

          <div className="flex-1">
            {rightTab === "board" ? (
              
              /* LIVE BOARD FEED (Mockup design) */
              <div className="space-y-3">
                <div className="flex items-center justify-between px-1 mb-1">
                  <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                    Dispatches
                  </span>
                  <span className="text-[11px] text-zinc-500">{trips.length} Total</span>
                </div>

                {tripsLoading ? (
                  <div className="flex flex-col items-center justify-center py-20 text-zinc-400">
                    <Loader2 className="size-6 animate-spin text-[#0080FF]" />
                    <p className="mt-2 text-xs">Loading Live Board feed...</p>
                  </div>
                ) : trips.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-zinc-200 bg-white p-12 text-center text-zinc-400 dark:border-zinc-800 dark:bg-zinc-950">
                    <Route className="mx-auto mb-3 size-8 text-zinc-300" />
                    <p className="text-xs">No dispatches logged in the system yet.</p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-y-auto max-h-[700px] pr-1">
                    {trips.map((t) => {
                      const styles = STATUS_STYLE[t.status] || STATUS_STYLE["Draft"]
                      return (
                        <div
                          key={t.id}
                          className={`rounded-lg border bg-white p-4 shadow-sm dark:bg-zinc-950 transition-all ${styles.border}`}
                        >
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-sm font-bold text-zinc-900 dark:text-white">
                                  {t.trip_code}
                                </span>
                                <span className={`rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ${styles.badge}`}>
                                  {t.status}
                                </span>
                              </div>
                              
                              {/* Source -> Destination */}
                              <div className="mt-2.5 flex items-center gap-2 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                                <span>{t.source}</span>
                                <ArrowRight className="size-3.5 text-zinc-400 shrink-0" />
                                <span>{t.destination}</span>
                              </div>

                              <div className="mt-1.5 flex flex-wrap items-center gap-y-1 gap-x-3 text-[11px] text-zinc-500 dark:text-zinc-400">
                                <div>
                                  Asset: <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {t.vehicle_name || "Unassigned Vehicle"}
                                  </span>
                                </div>
                                <div className="hidden sm:inline text-zinc-300 dark:text-zinc-700">&bull;</div>
                                <div>
                                  Driver: <span className="font-medium text-zinc-700 dark:text-zinc-300">
                                    {t.driver_name || "Unassigned Driver"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Cost / Distance Metrics */}
                            <div className="text-right text-[11px] text-zinc-500 dark:text-zinc-400">
                              <div>
                                Planned: <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                  {t.planned_distance} km
                                </span>
                              </div>
                              <div className="mt-0.5">
                                Toll: <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                  ₹{t.toll_cost.toLocaleString()}
                                </span>
                              </div>
                              <div className="mt-0.5">
                                Weight: <span className="font-bold text-zinc-800 dark:text-zinc-200">
                                  {t.cargo_weight.toLocaleString()} kg
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* ACTION BUTTONS (State Mutating Transitions) */}
                          {(t.status === "Draft" || t.status === "Dispatched") && (
                            <div className="mt-4 flex items-center justify-end gap-2 border-t border-zinc-100 pt-3 dark:border-zinc-900">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCancelTrip(t.id)}
                                className="h-7 text-[10px] px-2.5 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950/20"
                              >
                                Cancel
                              </Button>

                              {t.status === "Draft" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleDispatchTrip(t.id)}
                                  className="h-7 text-[10px] px-3 bg-blue-600 text-white hover:bg-blue-700"
                                >
                                  Dispatch Trip
                                </Button>
                              )}

                              {t.status === "Dispatched" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleCompleteTrigger(t)}
                                  className="h-7 text-[10px] px-3 bg-emerald-600 text-white hover:bg-emerald-700"
                                >
                                  Complete Trip
                                </Button>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ROUTE MAP CONTAINER */
              <div className="h-[550px] border border-zinc-200 rounded-lg overflow-hidden shadow-sm dark:border-zinc-800">
                <InteractiveMap
                  polyline={selectedRoute ? selectedRoute.polyline : null}
                  sourceName={source || "Origin"}
                  destinationName={destination || "Destination"}
                />
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Complete Trip Dialog */}
      <CompleteTripDialog
        open={completeOpen}
        tripId={selectedTripId}
        vehicleOdometer={selectedVehicleOdom}
        onClose={() => {
          setCompleteOpen(false)
          setSelectedTripId(null)
          setSelectedVehicleOdom(null)
        }}
        onCompleted={() => {
          fetchTrips()
          fetchAssets()
        }}
      />
    </div>
  )
}
