import type { Metadata } from "next";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Consent } from "@/components/consent";
import { currentMember } from "@/lib/access";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || "http://localhost:3000"),
  title: {
    default: "Brewery Directory - Drinkable City",
    template: "%s - Drinkable City",
  },
  description:
    "Find breweries, brewpubs, and taprooms around Kansas City. Explore amenities, food, drinks, and places to gather.",
};
export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const member = await currentMember();
  return (
    <html lang="en">
      <body>
        <a href="#main-content" className="skipLink">
          Skip to content
        </a>
        <Header member={member} />
        {children}
        <Footer />
        <Consent />
      </body>
    </html>
  );
}
