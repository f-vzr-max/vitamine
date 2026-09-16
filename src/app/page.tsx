"use client";

import { useEffect, useState } from "react";
import PlanSummary from "./PlanSummary";

type Summary = {
  asOf: string;
  totalPressed: number;
  totalSold: number;
  revenueToDate: number;
  pressedPct: number;
  soldPct: number;
  daysRemaining: number;
  targetPressedPct: number;
  targetSoldPct: number;
};

function formatAr(amount: number): string {
  return `${amount.toLocaleString("fr-FR")} Ar`;
}

export default function Page() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/dashboard-summary")
      .then((res) => {
        if (!res.ok) throw new Error("erreur de chargement");
        return res.json();
      })
      .then(setSummary)
      .catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="error">{error}</p>;
  if (!summary) return <p className="muted">Chargement...</p>;

  return (
    <>
      <h1>Tableau de bord</h1>
      <p className="muted">
        Au {summary.asOf} — {summary.daysRemaining} jours restants avant le 20 décembre 2026
      </p>

      <div className="stat-grid">
        <div className="card stat">
          <div className="k">Chiffre d&apos;affaires</div>
          <div className="v">{formatAr(summary.revenueToDate)}</div>
        </div>
        <div className="card stat">
          <div className="k">Jours restants</div>
          <div className="v">{summary.daysRemaining}</div>
        </div>
      </div>

      <h2>Phase 1 — Pressage</h2>
      <div className="card">
        <p>
          Réalisé : <strong>{summary.pressedPct}%</strong> — Cible de la semaine :{" "}
          <strong>{summary.targetPressedPct}%</strong> ({summary.totalPressed} balles pressées)
        </p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, summary.pressedPct)}%` }} />
        </div>
      </div>

      <h2>Phase 2 — Vente</h2>
      <div className="card">
        <p>
          Réalisé : <strong>{summary.soldPct}%</strong> — Cible de la semaine :{" "}
          <strong>{summary.targetSoldPct}%</strong> ({summary.totalSold} balles vendues)
        </p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${Math.min(100, summary.soldPct)}%` }} />
        </div>
      </div>

      <PlanSummary />
    </>
  );
}
