import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'RichmanManage - 不動産投資管理',
  description: '不動産投資家のための物件・レントロール・借入一元管理システム',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja" className="font-size-medium">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedFontSize = localStorage.getItem('richman-font-size');
                  if (savedFontSize && ['small', 'medium', 'large', 'extra-large'].includes(savedFontSize)) {
                    document.documentElement.classList.remove('font-size-medium');
                    document.documentElement.classList.add('font-size-' + savedFontSize);
                  }
                } catch (e) {
                  console.log('Font size initialization failed:', e);
                }
              })();
            `,
          }}
        />
      </body>
    </html>
  );
}
