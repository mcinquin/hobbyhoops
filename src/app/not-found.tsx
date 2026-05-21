import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { getTranslations } from "@/i18n/server";
import { cn } from "@/lib/utils";

export default async function NotFound() {
  const { t } = await getTranslations();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-2xl font-bold">{t("errors.notFoundTitle")}</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        {t("errors.notFoundDescription")}
      </p>
      <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
        {t("errors.notFoundBack")}
      </Link>
    </div>
  );
}
