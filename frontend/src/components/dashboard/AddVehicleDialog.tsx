import { useState } from "react"
import { X, AlertCircle } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface AddVehicleDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

interface VehicleForm {
  reg_no: string
  name_model: string
  type: string
  capacity_kg: string
  odometer: string
  acq_cost: string
}

export default function AddVehicleDialog({ open, onClose, onCreated }: AddVehicleDialogProps) {
  const { t } = useTranslation()
  const [form, setForm] = useState<VehicleForm>({
    reg_no: "",
    name_model: "",
    type: "Van",
    capacity_kg: "",
    odometer: "0",
    acq_cost: "",
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!form.reg_no || !form.name_model || !form.capacity_kg || !form.acq_cost) {
      setError("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/fleet/vehicles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          reg_no: form.reg_no,
          name_model: form.name_model,
          type: form.type,
          capacity_kg: parseInt(form.capacity_kg),
          odometer: parseInt(form.odometer) || 0,
          acq_cost: parseFloat(form.acq_cost),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to create vehicle.")
      }

      onCreated()
      onClose()
      setForm({ reg_no: "", name_model: "", type: "Van", capacity_kg: "", odometer: "0", acq_cost: "" })
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
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
            {t("registry.addVehicle")}
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
              {t("registry.regNo")} *
            </Label>
            <Input
              placeholder="GJ01AB1234"
              value={form.reg_no}
              onChange={(e) => setForm({ ...form, reg_no: e.target.value })}
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("registry.nameModel")} *
            </Label>
            <Input
              placeholder="VAN-05"
              value={form.name_model}
              onChange={(e) => setForm({ ...form, name_model: e.target.value })}
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("registry.type")} *
              </Label>
              <Select.Root value={form.type} onValueChange={(val) => val && setForm({ ...form, type: val })} disabled={loading}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-900">
                  <SelectItem value="Van">Van</SelectItem>
                  <SelectItem value="Truck">Truck</SelectItem>
                  <SelectItem value="Mini">Mini</SelectItem>
                </SelectContent>
              </Select.Root>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("registry.capacity")} (kg) *
              </Label>
              <Input
                type="number"
                placeholder="500"
                value={form.capacity_kg}
                onChange={(e) => setForm({ ...form, capacity_kg: e.target.value })}
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("registry.odometer")}
              </Label>
              <Input
                type="number"
                placeholder="0"
                value={form.odometer}
                onChange={(e) => setForm({ ...form, odometer: e.target.value })}
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("registry.acqCost")} *
              </Label>
              <Input
                type="number"
                placeholder="620000"
                value={form.acq_cost}
                onChange={(e) => setForm({ ...form, acq_cost: e.target.value })}
                disabled={loading}
                className="h-9 text-sm"
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
              className="h-9 px-4 text-sm bg-[#0080FF] text-white hover:bg-[#006ce6]"
            >
              {loading ? "Saving..." : t("registry.addVehicle")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
