"use client";

import { useEffect, useState } from "react";

type Reconciliation = {
  byDay: { date: string; totalAr: number }[];
  byWeek: { weekStart: string; totalAr: number }[];
};

export default function Page() {
  const [data, setData] = useState<Reconciliation | null>(null);

  useEffect(() => {
    fetch("/api/cash-reconciliation")
      .then((res) => res.json())
      .then(setData);
  }, []);

  if (!data) return <p className="muted">Chargement...</p>;

  return (
    <>
      <h1>Réconciliation caisse</h1>

      <h2>Par jour</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Total (Ar)</th>
            </tr>
          </thead>
          <tbody>
            {data.byDay.map((d) => (
              <tr key={d.date}>
                <td>{d.date}</td>
                <td>{d.totalAr.toLocaleString("fr-FR")} Ar</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Par semaine (lundi—dimanche)</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Semaine du</th>
              <th>Total (Ar)</th>
            </tr>
          </thead>
          <tbody>
            {data.byWeek.map((w) => (
              <tr key={w.weekStart}>
                <td>{w.weekStart}</td>
                <td>{w.totalAr.toLocaleString("fr-FR")} Ar</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
