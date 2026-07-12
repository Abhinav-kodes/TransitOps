import { useTranslation } from "react-i18next"
import { Construction } from "lucide-react"

export default function ComingSoonPage({ titleKey }: { titleKey?: string }) {
  const { t } = useTranslation()

  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <Construction className="mx-auto mb-4 size-12 text-zinc-300 dark:text-zinc-600" />
        <h2 className="text-lg font-semibold text-zinc-800 dark:text-zinc-200">
          {titleKey ? t(titleKey) : t("comingSoon.title")}
        </h2>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          {t("comingSoon.description")}
        </p>
      </div>
    </div>
  )
}
