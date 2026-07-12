import { useState, useRef } from "react"
import { X, AlertCircle, Camera, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<VehicleForm>({
    reg_no: "",
    name_model: "",
    type: "Van",
    capacity_kg: "",
    odometer: "0",
    acq_cost: "",
  })
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

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

    if (!form.reg_no || !form.name_model || !form.capacity_kg || !form.acq_cost) {
      setError("Please fill in all required fields.")
      return
    }

    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
      }

      const res = await fetch(`${API_URL}/api/fleet/vehicles`, {
        method: "POST",
        headers,
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

      const vehicle = await res.json()

      if (photoFile) {
        const uploadHeaders: Record<string, string> = {
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const formData = new FormData()
        formData.append("file", photoFile)
        formData.append("entity_type", "vehicle")
        formData.append("entity_id", String(vehicle.id))
        formData.append("label", "document")

        await fetch(`${API_URL}/api/documents/upload`, {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        })
      }

      onCreated()
      onClose()
      setForm({ reg_no: "", name_model: "", type: "Van", capacity_kg: "", odometer: "0", acq_cost: "" })
      setPhotoPreview(null)
      setPhotoFile(null)
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
              <div className="relative">
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  disabled={loading}
                  className="h-9 w-full appearance-none rounded border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
                >
                  <option value="Van">Van</option>
                  <option value="Truck">Truck</option>
                  <option value="Mini">Mini</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              </div>
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
                {photoPreview ? t("driverRegistry.photoChange") : t("driverRegistry.photoUpload")}
              </button>
              <p className="mt-0.5 text-[10px] text-zinc-400 dark:text-zinc-500">
                {t("driverRegistry.photoHint")}
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
              {loading ? "Saving..." : t("registry.addVehicle")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
