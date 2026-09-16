"use client";

import { useState } from "react";

export type Note = { id: string; employeeId: string; date: string | null; text: string };

function formatShortDate(dateStr: string): string {
  const [, mo, d] = dateStr.split("-").map(Number);
  const FR_MONTHS_SHORT = ["jan", "fév", "mar", "avr", "mai", "juin", "juil", "août", "sep", "oct", "nov", "déc"];
  return `${d} ${FR_MONTHS_SHORT[mo - 1]}`;
}

export default function NotesPanel({
  employeeId,
  employeeName,
  notes,
  onClose,
  onAdd,
  onDelete,
}: {
  employeeId: string;
  employeeName: string;
  notes: Note[];
  onClose: () => void;
  onAdd: (date: string | null, text: string) => void;
  onDelete: (id: string) => void;
}) {
  const [date, setDate] = useState("");
  const [text, setText] = useState("");
  const employeeNotes = notes.filter((n) => n.employeeId === employeeId);

  function submit() {
    if (!text.trim()) return;
    onAdd(date || null, text.trim());
    setDate("");
    setText("");
  }

  return (
    <div className="card">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
        <b>{employeeName}</b>
        <button onClick={onClose} aria-label="Fermer">
          ✕
        </button>
      </div>
      <div className="att-notes-add">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <input
          type="text"
          placeholder="Motif ou remarque..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <button onClick={submit}>Ajouter</button>
      </div>
      <div>
        {employeeNotes.length === 0 && <p className="muted">Aucune note.</p>}
        {employeeNotes.map((n) => (
          <div key={n.id} className="att-note-item">
            {n.date && <span className="att-note-date">{formatShortDate(n.date)}</span>}
            <span className="att-note-text">{n.text}</span>
            <button className="att-note-del" onClick={() => onDelete(n.id)}>
              ✕
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
