import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Project P&L — экономика проектов",
  description: "Совместный учёт доходов, расходов, прибыли и рентабельности проектов в Битрикс24.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <head><script src="https://api.bitrix24.com/api/v1/" async /></head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
