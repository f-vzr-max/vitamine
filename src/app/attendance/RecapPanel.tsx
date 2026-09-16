"use client";

import { useState } from "react";

export default function RecapPanel({
  date,
  text,
  onDateChange,
  onSave,
}: {
  date: string;
  text: string;
  onDateChange: (date: string) => void;
  onSave: (date: string, text: string) => Promise<void>;
}) {
  // Parent remounts this component with key={date}, so this initializer re-seeds the
  // draft whenever the selected date changes without clobbering in-progress typing.
  const [draft, setDraft] = useState(text);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await onSave(date, draft);
    setSaving(false);
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <b>Récapitulatif du jour</b>
        <input type="date" value={date} onChange={(e) => onDateChange(e.target.value)} style={{ width: "auto" }} />
      </div>
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder="Comment s'est passée la journée ?"
        rows={3}
        style={{ width: "100%", fontFamily: "inherit", fontSize: 14, padding: 8, borderRadius: 5, border: "1px solid var(--line)", background: "var(--bg)", color: "var(--ink)" }}
      />
      <button onClick={handleSave} disabled={saving} style={{ marginTop: 8 }}>
        {saving ? "Envoi..." : "Envoyer"}
      </button>
    </div>
  );
}
