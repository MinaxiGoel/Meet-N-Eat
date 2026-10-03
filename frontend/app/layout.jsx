import "./globals.css";

export const metadata = {
  title: "Meet & Eat — A little more human, once a month",
  description: "One thoughtful introduction at your pace. Meet someone new and share a 30-minute conversation.",
};

export default function RootLayout({ children }) {
  return <html lang="en"><body>{children}</body></html>;
}
