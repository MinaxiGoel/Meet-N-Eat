import "./globals.css";

export const metadata = {
  title: "Meet-N-Eat — your monthly match is behind the plate",
  description: "Meet one new person a month over a relaxed 30-minute coffee call.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf8f1",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
