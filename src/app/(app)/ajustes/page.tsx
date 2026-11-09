import "server-only";
import { getTranslation } from "@/lib/i18n";
import { Card, PageHeader } from "@/components/ui/layout";
import { SettingsIcon } from "@/components/ui/icons";

export default async function SettingsPage() {
  return (
    <div className="flex flex-col gap-gap">
      <PageHeader
        title={getTranslation("nav.settings")}
        icon={<SettingsIcon className="h-5 w-5" />}
      />
      <Card>
        <p className="text-sm text-text-subtle">
          Configuración general del sistema. Disponible en próximas fases.
        </p>
      </Card>
    </div>
  );
}