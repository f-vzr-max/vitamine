"use client";

import { Fragment, useEffect, useState } from "react";

type Client = { id: string; name: string; contact: string | null };
type ClientDetail = Client & {
  sales: { id: string; date: string; qty: number; revenueAr: number; article: { name: string } }[];
};

export default function Page() {
  const [clients, setClients] = useState<Client[]>([]);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ClientDetail | null>(null);

  function load() {
    fetch("/api/clients")
      .then((res) => res.json())
      .then(setClients)
      .catch(() => setError("Impossible de charger les clients."));
  }

  useEffect(load, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, contact }),
    });
    if (!res.ok) {
      setError("Échec de l'ajout.");
      return;
    }
    setName("");
    setContact("");
    load();
  }

  async function toggleHistory(id: string) {
    if (openId === id) {
      setOpenId(null);
      setDetail(null);
      return;
    }
    setOpenId(id);
    const res = await fetch(`/api/clients/${id}`);
    setDetail(await res.json());
  }

  return (
    <>
      <h1>Clients</h1>

      <div className="table-wrap card">
        <table>
          <thead>
            <tr>
              <th>Nom</th>
              <th>Contact</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {clients.map((c) => (
              <Fragment key={c.id}>
                <tr>
                  <td>{c.name}</td>
                  <td>{c.contact ?? "—"}</td>
                  <td>
                    <button type="button" onClick={() => toggleHistory(c.id)}>
                      {openId === c.id ? "Fermer" : "Historique"}
                    </button>
                  </td>
                </tr>
                {openId === c.id && detail && (
                  <tr>
                    <td colSpan={3}>
                      {detail.sales.length === 0 ? (
                        <p className="muted">Aucune vente.</p>
                      ) : (
                        <ul>
                          {detail.sales.map((s) => (
                            <li key={s.id}>
                              {s.date} — {s.article.name} x{s.qty} — {s.revenueAr.toLocaleString("fr-FR")} Ar
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      <h2>Ajouter un client</h2>
      <form className="stack card" onSubmit={handleAdd}>
        <div>
          <label htmlFor="name">Nom</label>
          <input id="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label htmlFor="contact">Contact</label>
          <input id="contact" value={contact} onChange={(e) => setContact(e.target.value)} />
        </div>
        {error && <p className="error">{error}</p>}
        <button type="submit">Ajouter</button>
      </form>
    </>
  );
}
