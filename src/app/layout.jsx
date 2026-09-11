import "./globals.css";

export const metadata = {
  title: "Tarot Diary",
  description: "Your personal tarot diary",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
