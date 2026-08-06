"use client";

import { useState, useTransition } from "react";
import { Check, X } from "lucide-react";
import { Btn, StatusPill } from "@/components/ui/primitives";
import { Modal } from "@/components/ui/Modal";
import { approveClubRequestAction, rejectClubRequestAction } from "./actions";

export type ClubRequestRow = {
  id: string;
  name: string;
  tagline: string;
  category: string;
  description: string;
  emoji: string;
  status: string;
  requesterName: string;
  requesterEmail: string;
  requesterRoll: string | null;
  submitted: string;
  reviewedBy: string | null;
  reviewNote: string | null;
  clubSlug: string | null;
};

function statusTone(status: string): "green" | "amber" | "magenta" {
  if (status === "Approved") return "green";
  if (status === "Rejected") return "magenta";
  return "amber";
}

export function ClubRequestReview({ requests }: { requests: ClubRequestRow[] }) {
  const [pending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ error?: string; message?: string } | null>(null);
  const [rejecting, setRejecting] = useState<ClubRequestRow | null>(null);
  const [note, setNote] = useState("");

  function approve(id: string) {
    setFeedback(null);
    startTransition(async () => {
      setFeedback(await approveClubRequestAction(id));
    });
  }

  function confirmReject() {
    if (!rejecting) return;
    const id = rejecting.id;
    setFeedback(null);
    startTransition(async () => {
      const result = await rejectClubRequestAction(id, note);
      setFeedback(result);
      if (!result.error) {
        setRejecting(null);
        setNote("");
      }
    });
  }

  return (
    <>
      {feedback?.error && (
        <p className="mb-4 rounded-xl border border-destructive/30 bg-destructive/[0.12] px-4 py-2.5 text-sm text-destructive">
          {feedback.error}
        </p>
      )}
      {feedback?.message && (
        <p className="mb-4 rounded-xl border border-secondary/35 bg-secondary/[0.1] px-4 py-2.5 text-sm text-secondary">
          {feedback.message}
        </p>
      )}

      <div className="space-y-4">
        {requests.length === 0 && (
          <div className="night-panel rounded-2xl p-8 text-center text-sm text-muted-foreground">
            No club proposals in this view.
          </div>
        )}

        {requests.map((request) => (
          <div key={request.id} className="night-panel rounded-2xl p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2.5">
                  <span aria-hidden className="text-xl">{request.emoji}</span>
                  <h3 className="text-lg font-semibold text-white">{request.name}</h3>
                  <StatusPill tone={statusTone(request.status)}>{request.status}</StatusPill>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{request.tagline}</p>
              </div>
              <span className="text-mono-label whitespace-nowrap">{request.category}</span>
            </div>

            <p className="mt-4 text-sm leading-relaxed text-foreground/90">{request.description}</p>

            <dl className="mt-4 grid gap-x-6 gap-y-1.5 text-xs sm:grid-cols-2">
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Proposed by</dt>
                <dd>{request.requesterName}{request.requesterRoll ? ` · ${request.requesterRoll}` : ""}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="truncate">{request.requesterEmail}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-muted-foreground">Submitted</dt>
                <dd>{request.submitted}</dd>
              </div>
              {request.reviewedBy && (
                <div className="flex gap-2">
                  <dt className="text-muted-foreground">Reviewed by</dt>
                  <dd>{request.reviewedBy}</dd>
                </div>
              )}
            </dl>

            {request.reviewNote && (
              <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-muted-foreground">
                Note to proposer: {request.reviewNote}
              </p>
            )}

            {request.status === "Pending" ? (
              <div className="mt-5 flex flex-wrap gap-2">
                <Btn size="sm" disabled={pending} onClick={() => approve(request.id)}>
                  <Check className="h-4 w-4" /> Approve and create club
                </Btn>
                <Btn size="sm" variant="outline" disabled={pending} onClick={() => { setRejecting(request); setNote(""); }}>
                  <X className="h-4 w-4" /> Decline
                </Btn>
              </div>
            ) : (
              request.clubSlug && (
                <p className="mt-4 text-xs text-muted-foreground">
                  Live at <span className="font-mono text-secondary">/clubs/{request.clubSlug}</span>
                </p>
              )
            )}
          </div>
        ))}
      </div>

      <Modal open={Boolean(rejecting)} onClose={() => setRejecting(null)} title={`Decline ${rejecting?.name ?? ""}`}>
        <p className="mb-3 text-sm text-muted-foreground">
          The proposer is emailed either way. A short reason helps them come back with a better proposal.
        </p>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Optional — e.g. overlaps heavily with an existing club."
          className="w-full rounded-xl border border-white/[0.12] bg-white/[0.035] px-4 py-2.5 text-sm text-white outline-none transition focus:border-secondary/55"
        />
        <div className="mt-5 flex justify-end gap-2">
          <Btn type="button" variant="ghost" onClick={() => setRejecting(null)}>Cancel</Btn>
          <Btn type="button" disabled={pending} onClick={confirmReject}>Decline proposal</Btn>
        </div>
      </Modal>
    </>
  );
}
