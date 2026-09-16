"use client";

import { useEffect, useMemo, useState } from "react";
import "./attendance.css";
import {
  FR_DOW,
  FR_MONTHS,
  computeStatus,
  currentMonth,
  daysInMonth,
  dowOf,
  fmtDate,
  statusClassName,
  statusLabel,
  CYCLE_STATUSES,
} from "@/lib/attendance";
import NotesPanel, { type Note } from "./NotesPanel";
import RecapPanel from "./RecapPanel";

type Employee = { id: string; name: string };
type Record_ = { employeeId: string; date: string; status: string };

export default function Page() {
  const [month, setMonth] = useState(currentMonth());
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<Record_[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [notesOpenFor, setNotesOpenFor] = useState<string | null>(null);
  const [recapDate, setRecapDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [recapText, setRecapText] = useState("");
  const [error, setError] = useState<string | null>(null);

  function loadGrid(m: string) {
    fetch(`/api/attendance?month=${m}`)
      .then((res) => res.json())
      .then((data) => {
        setEmployees(data.employees);
        setRecords(data.records);
      })
      .catch(() => setError("Erreur de chargement."));
  }

  function loadNotes() {
    fetch("/api/attendance/notes")
      .then((res) => res.json())
      .then(setNotes);
  }

  function loadRecap(date: string) {
    fetch(`/api/attendance/recap?date=${date}`)
      .then((res) => res.json())
      .then((data) => setRecapText(data.text ?? ""));
  }

  useEffect(() => loadGrid(month), [month]);
  useEffect(loadNotes, []);
  useEffect(() => loadRecap(recapDate), [recapDate]);

  const recordsByKey = useMemo(() => {
    const map = new Map<string, string>();
    for (const r of records) map.set(`${r.employeeId}|${r.date}`, r.status);
    return map;
  }, [records]);

  const today = new Date().toISOString().slice(0, 10);
  const [y, mo] = month.split("-").map(Number);
  const nDays = daysInMonth(month);
  const days = Array.from({ length: nDays }, (_, i) => {
    const dateStr = fmtDate(y, mo, i + 1);
    return { day: i + 1, dateStr, isFuture: dateStr > today };
  });

  async function setStatus(employeeId: string, date: string, status: string) {
    setError(null);
    const res = await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, date, status }),
    });
    if (!res.ok) {
      setError("Échec de l'enregistrement.");
      return;
    }
    setRecords((prev) => [...prev.filter((r) => !(r.employeeId === employeeId && r.date === date)), { employeeId, date, status }]);
  }

  function cycleStatus(employeeId: string, date: string) {
    const current = computeStatus(date, employeeId, recordsByKey);
    const idx = CYCLE_STATUSES.indexOf(current as (typeof CYCLE_STATUSES)[number]);
    const next = CYCLE_STATUSES[(idx + 1) % CYCLE_STATUSES.length];
    setStatus(employeeId, date, next);
  }

  async function addNote(employeeId: string, date: string | null, text: string) {
    await fetch("/api/attendance/notes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ employeeId, date, text }),
    });
    loadNotes();
  }

  async function deleteNote(id: string) {
    await fetch(`/api/attendance/notes?id=${id}`, { method: "DELETE" });
    loadNotes();
  }

  async function saveRecap(date: string, text: string) {
    await fetch("/api/attendance/recap", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, text }),
    });
  }

  const monthOptions = useMemo(() => {
    const opts: string[] = [];
    for (let i = -2; i <= 1; i++) {
      const d = new Date(y, mo - 1 + i, 1);
      opts.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    return opts;
  }, [y, mo]);

  return (
    <>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
        <h1>{FR_MONTHS[mo - 1]} {y}</h1>
        <select value={month} onChange={(e) => setMonth(e.target.value)} style={{ width: "auto" }}>
          {monthOptions.map((m) => {
            const [oy, omo] = m.split("-").map(Number);
            return (
              <option key={m} value={m}>
                {FR_MONTHS[omo - 1]} {oy}
              </option>
            );
          })}
        </select>
      </div>

      <div className="att-legend">
        <span className="att-chip"><b>P</b>Présent</span>
        <span className="att-chip"><b>½</b>Demi-journée</span>
        <span className="att-chip"><b>A</b>Absent</span>
        <span className="att-chip"><b>X</b>Repos</span>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="att-scroll">
        <table className="att-table">
          <thead>
            <tr>
              <th className="att-name-col">Employé</th>
              {days.map((d) => (
                <th key={d.dateStr} className={`att-day-col${d.dateStr === today ? " att-today-col" : ""}`}>
                  <div>{d.day}</div>
                  <div style={{ fontSize: 8.5, opacity: 0.85 }}>{FR_DOW[dowOf(d.dateStr)]}</div>
                </th>
              ))}
              <th className="att-total-col">Total</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((emp) => {
              let pCount = 0, hCount = 0, aCount = 0;
              const noteCount = notes.filter((n) => n.employeeId === emp.id).length;
              return (
                <tr key={emp.id}>
                  <td className="att-name-col" onClick={() => setNotesOpenFor(notesOpenFor === emp.id ? null : emp.id)}>
                    {emp.name}
                    {noteCount > 0 && <span className="att-note-badge">{noteCount}</span>}
                  </td>
                  {days.map((d) => {
                    const status = computeStatus(d.dateStr, emp.id, recordsByKey);
                    if (status === "PRESENT") pCount++;
                    else if (status === "DEMIE-J") hCount++;
                    else if (status === "ABS") aCount++;
                    const editable = !d.isFuture && status !== "OFF" && status !== "WEEKEND";
                    return (
                      <td
                        key={d.dateStr}
                        className={`att-day-col ${statusClassName(status)}${d.dateStr === today ? " att-today-col" : ""}${editable ? " att-editable" : ""}`}
                        onClick={editable ? () => cycleStatus(emp.id, d.dateStr) : undefined}
                      >
                        {statusLabel(status)}
                      </td>
                    );
                  })}
                  <td className="att-total-col">
                    {pCount}P <span className="muted">{hCount}½ {aCount}A</span>
                  </td>
                </tr>
              );
            })}
            {employees.length === 0 && (
              <tr>
                <td colSpan={days.length + 2} className="muted" style={{ padding: 10 }}>
                  Aucun employé enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {notesOpenFor && (
        <NotesPanel
          employeeId={notesOpenFor}
          employeeName={employees.find((e) => e.id === notesOpenFor)?.name ?? ""}
          notes={notes}
          onClose={() => setNotesOpenFor(null)}
          onAdd={(date, text) => addNote(notesOpenFor, date, text)}
          onDelete={deleteNote}
        />
      )}

      <RecapPanel key={recapDate} date={recapDate} text={recapText} onDateChange={setRecapDate} onSave={saveRecap} />

      <p className="muted">Touchez une case pour la changer, ou le nom d&apos;un employé pour ses notes.</p>
    </>
  );
}
