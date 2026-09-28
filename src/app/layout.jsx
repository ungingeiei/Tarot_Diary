import "./globals.css";

export const metadata = {
  title: "Tarot Diary",
  description: "Premium Tarot Diary authentication pages",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
