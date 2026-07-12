"use client";

import { useRef, useState, useTransition } from "react";
import { CheckCircle2, UploadCloud } from "lucide-react";
import { Btn } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { bulkImportMembersAction } from "./actions";

export function BulkImportModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [dragOver, setDragOver] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setError(null);
    setResult(null);
    file.text().then((text) => {
      startTransition(async () => {
        const res = await bulkImportMembersAction(text);
        if (res.error) setError(res.error);
        else setResult({ imported: res.imported, skipped: res.skipped });
      });
    });
  }

  function close() {
    setError(null);
    setResult(null);
    onClose();
  }

  return (
    <Modal open={open} onClose={close} title="Bulk import members">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(event) => {
          event.preventDefault();
          setDragOver(false);
          const file = event.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        className={`block cursor-pointer rounded-2xl border border-dashed px-6 py-10 text-center transition ${
          dragOver
            ? "border-secondary/60 bg-secondary/[0.06]"
            : "border-white/[0.16] bg-white/[0.02] hover:border-white/[0.28] hover:bg-white/[0.035]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
            event.target.value = "";
          }}
        />
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl border border-secondary/30 bg-secondary/[0.12] text-secondary">
          <UploadCloud className="h-5 w-5" />
        </div>
        <div className="mt-4 text-sm font-semibold text-white">Drop your CSV or click to browse</div>
        <div className="mt-1 text-xs text-muted-foreground">Columns: name, roll, email, role</div>
      </label>

      <p className="mt-3 text-xs leading-5 text-muted-foreground">
        Import accepts a CSV with columns <span className="text-secondary">name, roll, email, role</span> - we&apos;ll de-duplicate against existing members.
      </p>

      {pending && <p className="mt-3 text-xs text-muted-foreground">Importing…</p>}
      {error && <p className="mt-3 text-xs text-destructive">{error}</p>}
      {result && (
        <div className="night-panel mt-3 flex items-center gap-2 rounded-xl px-4 py-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4" />
          Imported {result.imported} member{result.imported === 1 ? "" : "s"}
          {result.skipped > 0 && <span className="text-muted-foreground"> · {result.skipped} skipped (already exist)</span>}
        </div>
      )}

      <div className="mt-5 flex justify-end">
        <Btn type="button" variant="ghost" onClick={close}>Close</Btn>
      </div>
    </Modal>
  );
}
