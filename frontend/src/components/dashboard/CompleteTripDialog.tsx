import { useState } from "react"
import { X, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface CompleteTripDialogProps {
  open: boolean
  tripId: number | null
  vehicleOdometer: number | null
  onClose: () => void
  onCompleted: () => void
}

export default function CompleteTripDialog({
  open,
  tripId,
  vehicleOdometer,
  onClose,
  onCompleted,
}: CompleteTripDialogProps) {
  const { t } = useTranslation()
  const [odometer, setOdometer] = useState("")
  const [fuelLiters, setFuelLiters] = useState("")
  const [fuelCost, setFuelCost] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open || !tripId) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const odomNum = parseInt(odometer)
    const litersNum = parseFloat(fuelLiters)
    const costNum = parseFloat(fuelCost)

    if (isNaN(odomNum) || odomNum < 0) {
      setError("Please enter a valid final odometer reading.")
      return
    }
    if (vehicleOdometer !== null && odomNum < vehicleOdometer) {
      setError(`Final odometer cannot be less than vehicle's current odometer (${vehicleOdometer.toLocaleString()}).`)
      return
    }
    if (isNaN(litersNum) || litersNum <= 0) {
      setError("Please enter a valid fuel quantity in liters (greater than 0).")
      return
    }
    if (isNaN(costNum) || costNum <= 0) {
      setError("Please enter a valid fuel cost (greater than 0).")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/operations/trips/${tripId}/complete`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          final_odometer: odomNum,
          fuel_consumed_liters: litersNum,
          fuel_cost: costNum,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to complete trip.")
      }

      onCompleted()
      onClose()
      setOdometer("")
      setFuelLiters("")
      setFuelCost("")
    } catch (err: any) {
      setError(err.message || "An error occurred.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            Complete Trip
          </h2>
          <button onClick={onClose} className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200">
            <X className="size-4" />
          </button>
        </div>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded bg-red-50 p-3 text-xs font-medium text-red-700 border border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800">
            <AlertCircle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              Final Odometer Reading *
            </Label>
            <Input
              type="number"
              placeholder={vehicleOdometer !== null ? `Current: ${vehicleOdometer}` : "Enter final reading"}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              disabled={loading}
              className="h-9 text-sm"
              required
            />
            {vehicleOdometer !== null && (
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Must be at least {vehicleOdometer.toLocaleString()}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                Fuel Consumed (Liters) *
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 120.5"
                value={fuelLiters}
                onChange={(e) => setFuelLiters(e.target.value)}
                disabled={loading}
                className="h-9 text-sm"
                required
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                Fuel Cost (INR) *
              </Label>
              <Input
                type="number"
                step="0.01"
                placeholder="e.g. 11500"
                value={fuelCost}
                onChange={(e) => setFuelCost(e.target.value)}
                disabled={loading}
                className="h-9 text-sm"
                required
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="h-9 px-4 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="h-9 px-4 text-sm bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-600 dark:hover:bg-emerald-700"
            >
              {loading ? "Completing..." : "Complete Trip"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
