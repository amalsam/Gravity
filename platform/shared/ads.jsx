"use client";

import { useEffect } from "react";
import { siteConfig } from "./config";

// Renders an AdSense slot only when a real publisher ID is configured.
// Until then it renders nothing, so pages never show empty ad boxes.
export function AdBanner({ dataAdSlot, dataAdFormat = "auto", dataFullWidthResponsive = "true", className = "" }) {
    const enabled = Boolean(siteConfig.adsClientId);

    useEffect(() => {
        if (!enabled) return;
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense error", e);
        }
    }, [enabled]);

    if (!enabled) return null;

    return (
        <div className={`w-full overflow-hidden flex justify-center items-center ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: "block" }}
                data-ad-client={siteConfig.adsClientId}
                data-ad-slot={dataAdSlot}
                data-ad-format={dataAdFormat}
                data-full-width-responsive={dataFullWidthResponsive}
            />
        </div>
    );
}
