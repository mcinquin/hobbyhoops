import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Ratio du viewBox de /brand/logo.svg (461×281). */
const LOGO_ASPECT = 461 / 281;

interface BrandMarkProps {
  className?: string;
  logoClassName?: string;
  nameClassName?: string;
  /** Hauteur du pictogramme (cartes). */
  logoHeight?: number;
  priority?: boolean;
  homeAriaLabel?: string;
}

export function BrandMark({
  className,
  logoClassName,
  nameClassName,
  logoHeight = 56,
  priority = false,
  homeAriaLabel = "HobbyHoops — accueil",
}: BrandMarkProps) {
  return (
    <Link
      href="/"
      className={cn(
        "group mx-auto flex w-full max-w-full flex-col items-center gap-2 rounded-lg outline-none transition-colors",
        "hover:opacity-90 focus-visible:ring-2 focus-visible:ring-amber-500/60",
        className
      )}
      aria-label={homeAriaLabel}
    >
      <Image
        src="/brand/logo.svg"
        alt=""
        width={Math.round(logoHeight * LOGO_ASPECT)}
        height={logoHeight}
        priority={priority}
        unoptimized
        className={cn(
          "mx-auto block h-auto w-auto max-w-full object-contain object-center",
          logoClassName
        )}
      />
      <span
        className={cn(
          "text-center text-lg font-bold leading-none tracking-tight",
          nameClassName
        )}
      >
        <span className="text-amber-500">Hobby</span>Hoops
      </span>
    </Link>
  );
}
