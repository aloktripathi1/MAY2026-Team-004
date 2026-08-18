"use client";

import { CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventThumbnailProps {
  title: string;
  cover?: string | null;
  photo?: string | null;
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

export function EventThumbnail({ title, cover, photo, size = "md", className = "", showBorder = false }: EventThumbnailProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  const borderClass = showBorder ? "border border-primary/25" : "";

  if (photo) {
    return (
      <div className={cn(sizeClass, "shrink-0 overflow-hidden rounded-lg", borderClass, className)} style={{ background: cover ?? undefined }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={title} loading="lazy" className="h-full w-full object-cover" />
      </div>
    );
  }

  return (
    <div className={cn(sizeClass, "shrink-0 rounded-lg bg-secondary/[0.08] flex items-center justify-center", borderClass, className)}>
      <CalendarDays size={iconSize} className="text-secondary/60" />
    </div>
  );
}
