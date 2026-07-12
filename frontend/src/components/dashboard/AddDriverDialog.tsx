import { useState, useRef } from "react"
import { X, AlertCircle, Camera, ChevronDown } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000"

interface AddDriverDialogProps {
  open: boolean
  onClose: () => void
  onCreated: () => void
}

interface DriverForm {
  name: string
  license_no: string
  category: string
  expiry_date: string
  contact_no: string
}

export default function AddDriverDialog({ open, onClose, onCreated }: AddDriverDialogProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<DriverForm>({
    name: "",
    license_no: "",
    category: "LMV",
    expiry_date: "",
    contact_no: "",
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

    if (!form.name || !form.license_no || !form.expiry_date || !form.contact_no) {
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

      const res = await fetch(`${API_URL}/api/fleet/drivers`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          name: form.name,
          license_no: form.license_no,
          category: form.category,
          expiry_date: form.expiry_date,
          contact_no: form.contact_no,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.detail || "Failed to create driver.")
      }

      const driver = await res.json()

      if (photoFile) {
        const uploadHeaders: Record<string, string> = {
          ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
        }
        const formData = new FormData()
        formData.append("file", photoFile)
        formData.append("entity_type", "driver")
        formData.append("entity_id", String(driver.id))
        formData.append("label", "license")

        await fetch(`${API_URL}/api/documents/upload`, {
          method: "POST",
          headers: uploadHeaders,
          body: formData,
        })
      }

      onCreated()
      onClose()
      setForm({ name: "", license_no: "", category: "LMV", expiry_date: "", contact_no: "" })
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
            {t("driverRegistry.addDriver")}
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
              {t("driverRegistry.name")} *
            </Label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("driverRegistry.licenseNo")} *
            </Label>
            <Input
              placeholder="MH-12-2023-0045231"
              value={form.license_no}
              onChange={(e) => setForm({ ...form, license_no: e.target.value })}
              disabled={loading}
              className="h-9 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("driverRegistry.category")} *
              </Label>
              <div className="relative">
                <select
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  disabled={loading}
                  className="h-9 w-full appearance-none rounded border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
                >
                  <option value="LMV">LMV</option>
                  <option value="HMV">HMV</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              </div>
            </div>

            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                {t("driverRegistry.expiryDate")} *
              </Label>
              <Input
                type="date"
                value={form.expiry_date}
                onChange={(e) => setForm({ ...form, expiry_date: e.target.value })}
                disabled={loading}
                className="h-9 text-sm"
              />
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("driverRegistry.contactNo")} *
            </Label>
            <Input
              placeholder="+91 98765 43210"
              value={form.contact_no}
              onChange={(e) => setForm({ ...form, contact_no: e.target.value })}
              disabled={loading}
              className="h-9 text-sm"
            />
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
              {loading ? "Saving..." : t("driverRegistry.addDriver")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
