import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Caption Editor",
  description: "Video caption editor and generator",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
  viewport: "width=device-width, initial-scale=1, maximum-scale=1",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body className="touch-manipulation">
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}
