"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
  xl: "h-28 w-28",
};

const textSizes = {
  sm: "text-xs",
  md: "text-sm",
  lg: "text-base",
  xl: "text-2xl",
};

const imagePixelSizes = { sm: 32, md: 40, lg: 48, xl: 112 };

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({ name, image, size = "md", className = "", showBorder = true }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const textSize = textSizes[size];
  const borderClass = showBorder ? "border border-primary/25 bg-primary/15" : "bg-primary/15";

  if (image) {
    return (
      <div className={cn(sizeClass, "shrink-0 rounded-lg overflow-hidden", borderClass, className)}>
        <Image
          src={image}
          alt={name}
          width={imagePixelSizes[size]}
          height={imagePixelSizes[size]}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={cn(sizeClass, textSize, "shrink-0 rounded-lg flex items-center justify-center font-semibold text-primary", borderClass, className)}>
      {getInitials(name)}
    </div>
  );
}
