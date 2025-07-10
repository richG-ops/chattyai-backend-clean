import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { ErrorBoundary } from '@/components/error-boundary'
import Script from 'next/script'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'TheChattyAI - AI Voice Agents for Business',
  description: 'Transform your business with AI voice agents that handle calls, book appointments, and manage your calendar 24/7.',
  keywords: 'AI voice agent, appointment booking, calendar management, business automation',
  openGraph: {
    title: 'TheChattyAI - AI Voice Agents for Business',
    description: 'Never miss another appointment with AI voice agents',
    url: 'https://thechattyai.com',
    siteName: 'TheChattyAI',
    images: [{
      url: '/og-image.jpg',
      width: 1200,
      height: 630,
    }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TheChattyAI - AI Voice Agents for Business',
    description: 'Never miss another appointment with AI voice agents',
    images: ['/og-image.jpg'],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        {/* Google Analytics */}
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-XXXXXXXXXX"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-XXXXXXXXXX', {
              page_title: document.title,
              page_location: window.location.href,
            });
          `}
        </Script>
        
        {/* Hotjar Tracking */}
        <Script id="hotjar" strategy="afterInteractive">
          {`
            (function(h,o,t,j,a,r){
              h.hj=h.hj||function(){(h.hj.q=h.hj.q||[]).push(arguments)};
              h._hjSettings={hjid:3000000,hjsv:6};
              a=o.getElementsByTagName('head')[0];
              r=o.createElement('script');r.async=1;
              r.src=t+h._hjSettings.hjid+j+h._hjSettings.hjsv;
              a.appendChild(r);
            })(window,document,'https://static.hotjar.com/c/hotjar-','.js?sv=');
          `}
        </Script>
      </head>
      <body className={inter.className}>
        <ErrorBoundary>
          {children}
        </ErrorBoundary>
      </body>
    </html>
  )
} 