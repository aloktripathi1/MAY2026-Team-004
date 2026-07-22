"use client";

import { CalendarDays } from "lucide-react";
import Image from "next/image";

interface EventThumbnailProps {
  title: string;
  cover?: string | null;
  size?: "sm" | "md" | "lg" | "hero";
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-24 w-24",
  hero: "h-full w-full",
};

const iconSizes = {
  sm: 20,
  md: 24,
  lg: 32,
  hero: 48,
};

export function EventThumbnail({ title, cover, size = "md", className = "", showBorder = false }: EventThumbnailProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  const borderClass = showBorder ? "border border-primary/25" : "";

  if (cover) {
    return (
      <div className={`${sizeClass} shrink-0 rounded-lg overflow-hidden ${borderClass} ${className}`}>
        <Image
          src={cover}
          alt={title}
          width={size === "sm" ? 40 : size === "md" ? 56 : size === "lg" ? 96 : 500}
          height={size === "sm" ? 40 : size === "md" ? 56 : size === "lg" ? 96 : 300}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} shrink-0 rounded-lg bg-secondary/[0.08] flex items-center justify-center ${borderClass} ${className}`}>
      <CalendarDays size={iconSize} className="text-secondary/60" />
    </div>
  );
}
