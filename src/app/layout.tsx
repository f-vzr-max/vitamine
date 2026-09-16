import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vidage dépôt — Gestion Frippes",
  description: "Tableau de bord de vidage du dépôt Gestion Frippes",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

const NAV_LINKS = [
  { href: "/", label: "Tableau de bord" },
  { href: "/press-log", label: "Pressage" },
  { href: "/sales", label: "Ventes" },
  { href: "/articles", label: "Articles" },
  { href: "/clients", label: "Clients" },
  { href: "/cash", label: "Caisse" },
  { href: "/team", label: "Équipe" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <nav className="topnav">
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
        <div className="wrap">{children}</div>
      </body>
    </html>
  );
}
