import Script from 'next/script';
import { siteConfig } from './config';

export function GoogleAnalytics() {
  if (!siteConfig.googleAnalyticsId || siteConfig.googleAnalyticsId === "G-XXXXXXXXXX") {
    return null;
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${siteConfig.googleAnalyticsId}`}
        strategy="afterInteractive"
      />
      <Script id="google-analytics" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){window.dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${siteConfig.googleAnalyticsId}');
        `}
      </Script>
    </>
  );
}
