const MONTHLY_TARGETS = [
  { label: "OCTOBRE", title: "Fin du pressage", text: "Tout le vrac transformé en balles (11 oct.). Démarrage de la vente intensive. Cible : ≈35% du stock total vendu d'ici fin octobre." },
  { label: "NOVEMBRE", title: "Vente soutenue", text: "Portée par la période des fêtes de fin d'année. Cible : ≈80% du stock total vendu d'ici fin novembre." },
  { label: "DÉCEMBRE (jusqu'au 20)", title: "Sprint final", text: "Écoulement du solde. Cible : 100% du stock vendu, dépôt totalement vide au 20 décembre." },
];

export default function PlanSummary() {
  return (
    <details className="plan-summary">
      <summary>Plan général — vidage du dépôt (21 sept. → 20 déc. 2026)</summary>

      <div className="card">
        <p>
          Vider entièrement le dépôt actuel de Gestion Frippes d&apos;ici le <strong>20 décembre 2026</strong>. Le
          plan se déroule en deux phases : la transformation de tout le vrac restant en balles, puis l&apos;écoulement
          complet du stock — balles déjà pressées et nouvellement pressées — auprès des clients existants et de
          nouveaux clients.
        </p>
        <dl className="kv">
          <dt>Capacité</dt>
          <dd>200 balles / jour, machine seule</dd>
          <dt>Horaires</dt>
          <dd>7j/7, de 7h à 18h</dd>
          <dt>Équipe</dt>
          <dd>13 personnes mobilisées</dd>
          <dt>Durée</dt>
          <dd>13 semaines</dd>
        </dl>
      </div>

      <h2>Objectifs mensuels</h2>
      {MONTHLY_TARGETS.map((m) => (
        <div className="card" key={m.label}>
          <div className="muted">{m.label}</div>
          <strong>{m.title}</strong>
          <p>{m.text}</p>
        </div>
      ))}

      <h2>Points de vigilance</h2>
      <div className="card">
        <ul>
          <li>Comptage réel du volume de vrac restant et du stock déjà pressé.</li>
          <li>Prix définitifs des 20 à 30 articles.</li>
          <li>Capacité de stockage et de transport pour les balles en attente de vente.</li>
          <li>Rythme non-stop 7j/7 sans jour de repos sur 13 semaines : à surveiller pour la fatigue de l&apos;équipe.</li>
        </ul>
      </div>

      <h2>Prochaines étapes — lundi 21 septembre</h2>
      <div className="card">
        <ol>
          <li>Réunion de lancement à 7h avec les 13 employés.</li>
          <li>Comptage du vrac restant et du stock déjà pressé.</li>
          <li>Fixation des prix définitifs par article.</li>
          <li>Répartition des rôles : équipe pressage / équipe vente-logistique.</li>
          <li>Prise de contact avec les clients existants pour planifier les premiers enlèvements de balles.</li>
        </ol>
      </div>
    </details>
  );
}
