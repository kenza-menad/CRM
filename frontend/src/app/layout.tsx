import "./globals.css";

export const metadata = {
  title: "CRM Marketing",
  description: "CRM - Projet MIAGE",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}