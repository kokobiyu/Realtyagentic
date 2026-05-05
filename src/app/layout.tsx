import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Realty Agentic — WhatsApp AI Sales Dashboard",
  description:
    "Dashboard real-time untuk mengelola percakapan WhatsApp dengan AI Sales Agent properti.",
  keywords: ["whatsapp", "ai", "crm", "property", "sales", "agent"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
