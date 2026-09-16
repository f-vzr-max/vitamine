"use client";

import { useEffect, useState } from "react";

type Article = {
  id: string;
  name: string;
  priceArBalle: number;
  stock: number;
};

export default function Page() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("");
  const [error, setError] = useState<string | null>(null);

  function load() {
    fetch("/api/articles")
      .then((res) => res.json())
      .then(setArticles)
      .catch(() => setError("Impossible de charger les articles."));
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/articles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        priceArBalle: Number(price),
        stock: stock ? Number(stock) : 0,
      }),
    });
    if (!res.ok) {
      setError("Échec de l'ajout.");
      return;
    }
    setName("");
    setPrice("");
    setStock("");
    load();
  }

  async function handleUpdate(id: string, field: "priceArBalle" | "stock", value: number) {
    await fetch(`/api/articles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    load();
  }

  return (
    <>
      <h1>Grille tarifaire</h1>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Article</th>
              <th>Prix/balle (Ar)</th>
              <th>Stock</th>
            </tr>
          </thead>
          <tbody>
            {articles.map((a) => (
              <tr key={a.id}>
                <td>{a.name}</td>
                <td>
                  <input
                    type="number"
                    defaultValue={a.priceArBalle}
                    onBlur={(e) => handleUpdate(a.id, "priceArBalle", Number(e.target.value))}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    defaultValue={a.stock}
                    onBlur={(e) => handleUpdate(a.id, "stock", Number(e.target.value))}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Ajouter un article</h2>
      <form className="stack card" onSubmit={handleAdd}>
        <div>
          <label htmlFor="name">Nom</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="price">Prix par balle (Ar)</label>
          <input
            id="price"
            type="number"
            required
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor="stock">Stock initial</label>
          <input id="stock" type="number" value={stock} onChange={(e) => setStock(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Ajouter</button>
      </form>
    </>
  );
}
