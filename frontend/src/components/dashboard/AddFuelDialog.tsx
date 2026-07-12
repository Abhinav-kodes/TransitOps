import { useState, useEffect, useRef } from "react"
import { X, AlertCircle, ChevronDown, Camera } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface Vehicle {
  id: number
  reg_no: string
  name_model: string
}

interface AddFuelDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

interface FuelForm {
  vehicle_id: string
  date: string
  liters: string
  fuel_cost: string
}

type FieldErrors = Partial<Record<keyof FuelForm, string>>

function validateField(name: keyof FuelForm, value: string): string {
  switch (name) {
    case "vehicle_id":
      if (!value) return "Vehicle is required."
      return ""
    case "date":
      if (!value) return "Date is required."
      return ""
    case "liters":
      if (!value) return "Liters is required."
      if (Number(value) <= 0) return "Must be greater than 0."
      return ""
    case "fuel_cost":
      if (!value) return "Fuel cost is required."
      if (Number(value) < 0) return "Cannot be negative."
      return ""
    default:
      return ""
  }
}

export default function AddFuelDialog({ open, onClose, onCreated }: AddFuelDialogProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [vehicles, setVehicles] = useState<Vehicle[]>([])
  const [form, setForm] = useState<FuelForm>({
    vehicle_id: "",
    date: "",
    liters: "",
    fuel_cost: "",
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    const token = localStorage.getItem("transitops-token")
    fetch(`${API_URL}/api/fleet/vehicles`, {
      headers: token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((r) => r.json())
      .then((data) => setVehicles(data))
      .catch(() => {})
  }, [open])

  const handleBlur = (name: keyof FuelForm) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const msg = validateField(name, form[name])
    setFieldErrors((prev) => ({ ...prev, [name]: msg }))
  }

  const handleChange = (name: keyof FuelForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) {
      const msg = validateField(name, value)
      setFieldErrors((prev) => ({ ...prev, [name]: msg }))
    }
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError("Photo must be under 5 MB.")
      return
    }
    setPhotoFile(file)
    const reader = new FileReader()
    reader.onload = () => setPhotoPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const allTouched: Record<string, boolean> = {}
    const allErrors: FieldErrors = {}
    for (const key of Object.keys(form) as (keyof FuelForm)[]) {
      allTouched[key] = true
      allErrors[key] = validateField(key, form[key])
    }
    setTouched(allTouched)
    setFieldErrors(allErrors)

    if (Object.values(allErrors).some((v) => v)) return

    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const res = await fetch(`${API_URL}/api/finance/fuel-logs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          vehicle_id: parseInt(form.vehicle_id),
          date: form.date,
          liters: parseFloat(form.liters),
          fuel_cost: parseFloat(form.fuel_cost),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to log fuel record.")
      }

      const fuelLog = await res.json()

      if (photoFile) {
        const uploadHeaders: Record<string, string> = {
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const formData = new FormData()
        formData.append("file", photoFile)
        formData.append("entity_type", "fuel_log")
        formData.append("entity_id", String(fuelLog.id))
        formData.append("label", "receipt")

        await fetch(`${API_URL}/api/documents/upload`, {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        })
      }

      onCreated()
      onClose()
      setForm({ vehicle_id: "", date: "", liters: "", fuel_cost: "" })
      setFieldErrors({})
      setTouched({})
      setPhotoPreview(null)
      setPhotoFile(null)
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = (name: keyof FuelForm) =>
    `h-9 text-sm ${fieldErrors[name] && touched[name] ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : ""}`

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 shadow-xl dark:border-zinc-700 dark:bg-zinc-900">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-white">
            {t("fuelExpensesPage.logFuel")}
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
              {t("fuelExpensesPage.vehicle")} *
            </Label>
            <div className="relative">
              <select
                value={form.vehicle_id}
                onChange={(e) => handleChange("vehicle_id", e.target.value)}
                onBlur={() => handleBlur("vehicle_id")}
                disabled={loading}
                className={`h-9 w-full appearance-none rounded border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500 ${inputClass("vehicle_id")}`}
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.reg_no} — {v.name_model}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
            </div>
            {fieldErrors.vehicle_id && touched.vehicle_id && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.vehicle_id}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("fuelExpensesPage.date")} *
            </Label>
            <Input
              type="date"
              value={form.date}
              onChange={(e) => handleChange("date", e.target.value)}
              onBlur={() => handleBlur("date")}
              disabled={loading}
              className={inputClass("date")}
            />
            {fieldErrors.date && touched.date && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.date}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("fuelExpensesPage.liters")} *
              </Label>
              <Input
                type="number"
                placeholder="42"
                value={form.liters}
                onChange={(e) => handleChange("liters", e.target.value)}
                onBlur={() => handleBlur("liters")}
                disabled={loading}
                className={inputClass("liters")}
              />
              {fieldErrors.liters && touched.liters && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.liters}</p>
              )}
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("fuelExpensesPage.fuelCost")} *
              </Label>
              <Input
                type="number"
                placeholder="3150"
                value={form.fuel_cost}
                onChange={(e) => handleChange("fuel_cost", e.target.value)}
                onBlur={() => handleBlur("fuel_cost")}
                disabled={loading}
                className={inputClass("fuel_cost")}
              />
              {fieldErrors.fuel_cost && touched.fuel_cost && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.fuel_cost}</p>
              )}
            </div>
          </div>

          {/* Photo Upload Section */}
          <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-zinc-200 bg-zinc-50 py-5 dark:border-zinc-700 dark:bg-zinc-800/40">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoChange}
            />
            <div className="relative">
              <div className="flex size-20 items-center justify-center overflow-hidden rounded-full border-2 border-zinc-200 bg-white dark:border-zinc-600 dark:bg-zinc-800">
                {photoPreview ? (
                  <img src={photoPreview} alt="" className="size-full object-cover" />
                ) : (
                  <Camera className="size-7 text-zinc-300 dark:text-zinc-500" />
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="absolute -bottom-1 -right-1 flex size-7 items-center justify-center rounded-full border border-zinc-200 bg-white text-zinc-500 shadow-sm transition-colors hover:bg-zinc-50 hover:text-zinc-800 dark:border-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200"
              >
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="text-xs font-medium text-[#0080FF] hover:underline"
              >
                {photoPreview ? "Change photo" : "Upload receipt"}
              </button>
              <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                JPG or PNG, max 5 MB
              </p>
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
              {loading ? "Saving..." : t("fuelExpensesPage.logFuel")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
