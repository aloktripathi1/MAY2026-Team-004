"use client";

import { useState } from "react";
import { Btn } from "@/components/ui/primitives";
import { EditProfileModal } from "./EditProfileModal";

export function EditProfileButton({
  name, image, initials,
}: { name: string; image?: string | null; initials: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Btn className="mt-6 w-full" variant="outline" onClick={() => setOpen(true)}>Edit details</Btn>
      <EditProfileModal open={open} onClose={() => setOpen(false)} initialName={name} initialImage={image} initials={initials} />
    </>
  );
}
