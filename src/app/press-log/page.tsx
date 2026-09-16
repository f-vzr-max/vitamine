"use client";

import { useEffect, useState } from "react";

type PressLog = {
  id: string;
  date: string;
  qty: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Page() {
  const [logs, setLogs] = useState<PressLog[]>([]);
  const [date, setDate] = useState(today());
  const [qty, setQty] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/press-log")
      .then((res) => res.json())
      .then(setLogs)
      .catch(() => setError("Impossible de charger le journal de pressage."));
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/press-log", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, qty: Number(qty) }),
    });
    if (!res.ok) {
      setError("Échec de l'enregistrement.");
      return;
    }
    setQty("");
    load();
  }

  return (
    <>
      <h1>Pressage — balles pressées</h1>

      <form className="stack card" onSubmit={handleAdd}>
        <div>
          <label htmlFor="date">Date</label>
          <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="qty">Balles pressées</label>
          <input
            id="qty"
            type="number"
            required
            min={1}
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Enregistrer</button>
      </form>

      <h2>Historique</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Balles</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td>{log.date}</td>
                <td>{log.qty}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
