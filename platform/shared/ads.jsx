"use client";

import { useEffect } from 'react';
import { siteConfig } from './config';

export function AdBanner({ dataAdSlot, dataAdFormat = "auto", dataFullWidthResponsive = "true", className = "" }) {
    if (!siteConfig.adsEnabled) {
        return null; // Don't render empty ad containers
    }

    useEffect(() => {
        try {
            // Push an ad only if the adsbygoogle array exists
            const adsbygoogle = window.adsbygoogle || [];
            adsbygoogle.push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, []);

    return (
        <div className={`w-full overflow-hidden flex justify-center items-center my-4 ${className}`}>
            <ins 
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with user's publisher ID
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                data-full-width-responsive={dataFullWidthResponsive}
            />
        </div>
    );
}
