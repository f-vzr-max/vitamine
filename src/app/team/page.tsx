"use client";

import { useEffect, useState } from "react";

type Employee = { id: string; name: string };
type RestCheck = {
  employees: { employeeId: string; employeeName: string; compliant: boolean }[];
  coverage: { date: string; covered: boolean }[];
};

export default function Page() {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [restCheck, setRestCheck] = useState<RestCheck | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const [shiftEmployeeId, setShiftEmployeeId] = useState("");
  const [shiftDate, setShiftDate] = useState("");
  const [shiftHalf, setShiftHalf] = useState<"AM" | "PM">("AM");
  const [shiftIsRest, setShiftIsRest] = useState(false);
  const [shiftError, setShiftError] = useState<string | null>(null);

  function load() {
    fetch("/api/employees").then((res) => res.json()).then(setEmployees);
    fetch("/api/team/rest-check").then((res) => res.json()).then(setRestCheck);
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/employees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      setError("Échec de l'ajout.");
      return;
    }
    setName("");
    load();
  }

  async function handleAddShift(e: React.FormEvent) {
    e.preventDefault();
    setShiftError(null);
    const res = await fetch("/api/team/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        employeeId: shiftEmployeeId,
        date: shiftDate,
        half: shiftHalf,
        isRestHalfDay: shiftIsRest,
      }),
    });
    if (!res.ok) {
      setShiftError("Échec de l'enregistrement.");
      return;
    }
    setShiftDate("");
    setShiftIsRest(false);
    load();
  }

  return (
    <>
      <h1>Équipe — 13 employés</h1>

      <h2>Repos hebdomadaire (≥1 demi-journée / semaine)</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Employé</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {(restCheck?.employees ?? []).map((e) => (
              <tr key={e.employeeId}>
                <td>{e.employeeName}</td>
                <td>
                  <span className={`badge ${e.compliant ? "ok" : "bad"}`}>
                    {e.compliant ? "conforme" : "non conforme"}
                  </span>
                </td>
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={2} className="muted">
                  Aucun employé enregistré.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <h2>Couverture quotidienne (7h–18h)</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Couverture</th>
            </tr>
          </thead>
          <tbody>
            {(restCheck?.coverage ?? []).map((c) => (
              <tr key={c.date}>
                <td>{c.date}</td>
                <td>
                  <span className={`badge ${c.covered ? "ok" : "bad"}`}>
                    {c.covered ? "couvert" : "non couvert"}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Enregistrer une demi-journée</h2>
      <form className="stack card" onSubmit={handleAddShift}>
        <div>
          <label htmlFor="shift-employee">Employé</label>
          <select
            id="shift-employee"
            required
            value={shiftEmployeeId}
            onChange={(e) => setShiftEmployeeId(e.target.value)}
          >
            <option value="" disabled>
              Choisir...
            </option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="shift-date">Date</label>
          <input
            id="shift-date"
            type="date"
            required
            value={shiftDate}
            onChange={(e) => setShiftDate(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="shift-half">Demi-journée</label>
          <select
            id="shift-half"
            value={shiftHalf}
            onChange={(e) => setShiftHalf(e.target.value as "AM" | "PM")}
          >
            <option value="AM">Matin</option>
            <option value="PM">Après-midi</option>
          </select>
        </div>
        <div>
          <label htmlFor="shift-rest">
            <input
              id="shift-rest"
              type="checkbox"
              checked={shiftIsRest}
              onChange={(e) => setShiftIsRest(e.target.checked)}
            />{" "}
            Repos
          </label>
        </div>
        {shiftError && <p className="error">{shiftError}</p>}
        <button type="submit">Enregistrer</button>
      </form>

      <h2>Ajouter un employé</h2>
      <form className="stack card" onSubmit={handleAdd}>
        <div>
          <label htmlFor="name">Nom</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Ajouter</button>
      </form>
    </>
  );
}
