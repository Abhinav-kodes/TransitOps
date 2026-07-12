import { useState, useRef, useEffect } from "react"
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

interface UnlinkedUser {
  id: number
  email: string
}

interface DriverForm {
  user_id: string
  name: string
  license_no: string
  category: string
  expiry_date: string
  contact_no: string
}

type FieldErrors = Partial<Record<keyof DriverForm, string>>

function validateDriverField(name: keyof DriverForm, value: string): string {
  switch (name) {
    case "name":
      if (!value.trim()) return "Driver name is required."
      if (value.trim().length < 2) return "Must be at least 2 characters."
      return ""
    case "license_no":
      if (!value.trim()) return "License number is required."
      if (value.trim().length < 5) return "Must be at least 5 characters."
      return ""
    case "expiry_date":
      if (!value) return "Expiry date is required."
      if (new Date(value) < new Date()) return "License has already expired."
      return ""
    case "contact_no":
      if (!value.trim()) return "Contact number is required."
      if (value.trim().length < 6) return "Must be at least 6 characters."
      return ""
    default:
      return ""
  }
}

export default function AddDriverDialog({ open, onClose, onCreated }: AddDriverDialogProps) {
  const { t } = useTranslation()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([])
  const [loadingUsers, setLoadingUsers] = useState(false)
  const [form, setForm] = useState<DriverForm>({
    user_id: "",
    name: "",
    license_no: "",
    category: "LMV",
    expiry_date: "",
    contact_no: "",
  })
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [touched, setTouched] = useState<Record<string, boolean>>({})
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) return
    setLoadingUsers(true)
    const token = localStorage.getItem("transitops-token")
    fetch(`${API_URL}/api/fleet/drivers/unlinked`, {
      headers: {
        ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
      },
    })
      .then((r) => r.json())
      .then((data) => setUnlinkedUsers(Array.isArray(data) ? data : []))
      .catch(() => setUnlinkedUsers([]))
      .finally(() => setLoadingUsers(false))
  }, [open])

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

  const handleBlur = (name: keyof DriverForm) => {
    setTouched((prev) => ({ ...prev, [name]: true }))
    const msg = validateDriverField(name, form[name])
    setFieldErrors((prev) => ({ ...prev, [name]: msg }))
  }

  const handleChange = (name: keyof DriverForm, value: string) => {
    setForm((prev) => ({ ...prev, [name]: value }))
    if (touched[name]) {
      const msg = validateDriverField(name, value)
      setFieldErrors((prev) => ({ ...prev, [name]: msg }))
    }
  }

  const handleUserSelect = (userId: string) => {
    const user = unlinkedUsers.find((u) => u.id === Number(userId))
    setForm((prev) => ({
      ...prev,
      user_id: userId,
      name: user ? user.email.split("@")[0].replace(/[._-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) : prev.name,
    }))
  }

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const allTouched: Record<string, boolean> = {}
    const allErrors: FieldErrors = {}
    for (const key of Object.keys(form) as (keyof DriverForm)[]) {
      allTouched[key] = true
      allErrors[key] = validateDriverField(key, form[key])
    }
    setTouched(allTouched)
    setFieldErrors(allErrors)

    if (Object.values(allErrors).some((v) => v)) return

    setLoading(true)
    try {
      const token = localStorage.getItem("transitops-token")
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        ...(token && token !== "skip-mode" ? { Authorization: `Bearer ${token}` } : {}),
      }

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        license_no: form.license_no.trim(),
        category: form.category,
        expiry_date: form.expiry_date,
        contact_no: form.contact_no.trim(),
      }
      if (form.user_id) {
        body.user_id = Number(form.user_id)
      }

      const res = await fetch(`${API_URL}/api/fleet/drivers`, {
        method: "POST",
        headers,
        body: JSON.stringify(body),
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
      setForm({ user_id: "", name: "", license_no: "", category: "LMV", expiry_date: "", contact_no: "" })
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

  const inputClass = (name: keyof DriverForm) =>
    `h-9 text-sm ${fieldErrors[name] && touched[name] ? "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500" : ""}`

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
          {unlinkedUsers.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
                Link to User Account (Optional)
              </Label>
              <div className="relative">
                <select
                  value={form.user_id}
                  onChange={(e) => handleUserSelect(e.target.value)}
                  disabled={loading}
                  className="h-9 w-full appearance-none rounded border border-zinc-300 bg-white pl-3 pr-8 text-sm text-zinc-900 transition-colors hover:border-zinc-400 focus:border-[#0080FF] focus:outline-none focus:ring-1 focus:ring-[#0080FF] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:border-zinc-500"
                >
                  <option value="">Create standalone driver</option>
                  {unlinkedUsers.map((u) => (
                    <option key={u.id} value={u.id}>{u.email}</option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-zinc-400" />
              </div>
              <p className="mt-1 text-[10px] text-zinc-400 dark:text-zinc-500">
                Select a user with Driver role to link them to this profile.
              </p>
            </div>
          )}

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("driverRegistry.name")} *
            </Label>
            <Input
              placeholder="John Doe"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              onBlur={() => handleBlur("name")}
              disabled={loading}
              className={inputClass("name")}
            />
            {fieldErrors.name && touched.name && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.name}</p>
            )}
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("driverRegistry.licenseNo")} *
            </Label>
            <Input
              placeholder="MH-12-2023-0045231"
              value={form.license_no}
              onChange={(e) => handleChange("license_no", e.target.value)}
              onBlur={() => handleBlur("license_no")}
              disabled={loading}
              className={inputClass("license_no")}
            />
            {fieldErrors.license_no && touched.license_no && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.license_no}</p>
            )}
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
                onChange={(e) => handleChange("expiry_date", e.target.value)}
                onBlur={() => handleBlur("expiry_date")}
                disabled={loading}
                className={inputClass("expiry_date")}
              />
              {fieldErrors.expiry_date && touched.expiry_date && (
                <p className="mt-1 text-[11px] text-red-500">{fieldErrors.expiry_date}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="mb-1.5 block text-xs font-normal text-zinc-600 dark:text-zinc-400">
              {t("driverRegistry.contactNo")} *
            </Label>
            <Input
              placeholder="+91 98765 43210"
              value={form.contact_no}
              onChange={(e) => handleChange("contact_no", e.target.value)}
              onBlur={() => handleBlur("contact_no")}
              disabled={loading}
              className={inputClass("contact_no")}
            />
            {fieldErrors.contact_no && touched.contact_no && (
              <p className="mt-1 text-[11px] text-red-500">{fieldErrors.contact_no}</p>
            )}
          </div>

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
