// src/app/layout.js
import './globals.css';

export const metadata = {
  title: 'Mujahid Electronic Goods | Dawat Mic & Electronics POS',
  description: 'Official Storefront & Offline POS for Mujahid Electronic Goods, Shop No. 2, 165, Kanhaiya Market, Hazrat Nizamuddin, Delhi-13',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.ico'
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col antialiased" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}