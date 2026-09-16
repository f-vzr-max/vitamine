"use client";

import { useEffect, useState } from "react";

type Article = { id: string; name: string; priceArBalle: number; stock: number };
type Client = { id: string; name: string };
type Sale = {
  id: string;
  date: string;
  articleId: string;
  clientId: string;
  qty: number;
  unitPriceAr: number;
  revenueAr: number;
};

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export default function Page() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [date, setDate] = useState(today());
  const [articleId, setArticleId] = useState("");
  const [clientId, setClientId] = useState("");
  const [qty, setQty] = useState("");
  const [unitPriceAr, setUnitPriceAr] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/sales").then((res) => res.json()).then(setSales);
    fetch("/api/articles").then((res) => res.json()).then(setArticles);
    fetch("/api/clients").then((res) => res.json()).then(setClients);
  }

  useEffect(load, []);

  function onArticleChange(id: string) {
    setArticleId(id);
    const article = articles.find((a) => a.id === id);
    if (article) setUnitPriceAr(String(article.priceArBalle));
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        articleId,
        clientId,
        qty: Number(qty),
        unitPriceAr: Number(unitPriceAr),
      }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Échec de l'enregistrement.");
      return;
    }
    setQty("");
    load();
  }

  return (
    <>
      <h1>Ventes — balles vendues</h1>

      <form className="stack card" onSubmit={handleAdd}>
        <div>
          <label htmlFor="date">Date</label>
          <input id="date" type="date" required value={date} onChange={(e) => setDate(e.target.value)} />
        </div>
        <div>
          <label htmlFor="article">Article</label>
          <select id="article" required value={articleId} onChange={(e) => onArticleChange(e.target.value)}>
            <option value="">-- choisir --</option>
            {articles.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} (stock {a.stock})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="client">Client</label>
          <select id="client" required value={clientId} onChange={(e) => setClientId(e.target.value)}>
            <option value="">-- choisir --</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="qty">Quantité (balles)</label>
          <input id="qty" type="number" required min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
        </div>
        <div>
          <label htmlFor="price">Prix unitaire (Ar)</label>
          <input
            id="price"
            type="number"
            required
            min={0}
            value={unitPriceAr}
            onChange={(e) => setUnitPriceAr(e.target.value)}
          />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Enregistrer la vente</button>
      </form>

      <h2>Historique</h2>
      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Qté</th>
              <th>Prix unit.</th>
              <th>Revenu</th>
            </tr>
          </thead>
          <tbody>
            {sales.map((s) => (
              <tr key={s.id}>
                <td>{s.date}</td>
                <td>{s.qty}</td>
                <td>{s.unitPriceAr.toLocaleString("fr-FR")} Ar</td>
                <td>{s.revenueAr.toLocaleString("fr-FR")} Ar</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
