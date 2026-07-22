"use client";

import { User as UserIcon } from "lucide-react";
import Image from "next/image";

interface AvatarProps {
  name: string;
  image?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
  showBorder?: boolean;
}

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const iconSizes = {
  sm: 16,
  md: 20,
  lg: 24,
};

export function Avatar({ name, image, size = "md", className = "", showBorder = true }: AvatarProps) {
  const sizeClass = sizeClasses[size];
  const iconSize = iconSizes[size];
  const borderClass = showBorder ? "border border-primary/25 bg-primary/15" : "bg-primary/15";

  if (image) {
    return (
      <div className={`${sizeClass} shrink-0 rounded-lg overflow-hidden ${borderClass} ${className}`}>
        <Image
          src={image}
          alt={name}
          width={sizeClass === sizeClasses.sm ? 32 : sizeClass === sizeClasses.md ? 40 : 48}
          height={sizeClass === sizeClasses.sm ? 32 : sizeClass === sizeClasses.md ? 40 : 48}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} shrink-0 rounded-lg ${borderClass} flex items-center justify-center text-white ${className}`}>
      <UserIcon size={iconSize} className="text-muted-foreground" />
    </div>
  );
}
