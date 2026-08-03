"use client";

import { User as UserIcon } from "lucide-react";
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

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 56,
};

const imagePixelSizes = { sm: 32, md: 40, lg: 48, xl: 112 };

export function Avatar({ name, image, size = "md", className = "", showBorder = true }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
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
    <div className={cn(sizeClass, "shrink-0 rounded-lg flex items-center justify-center text-white", borderClass, className)}>
      <UserIcon size={iconSize} className="text-muted-foreground" />
    </div>
  );
}
