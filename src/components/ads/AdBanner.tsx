import React, { useEffect } from 'react';
import './AdBanner.css';

interface AdBannerProps {
    adSlot: string;
    adFormat?: 'auto' | 'fluid' | 'rectangle';
    fullWidthResponsive?: boolean;
    className?: string;
}

/**
 * AdBanner Component
 * 
 * Displays Google AdSense banner ads
 * 
 * Usage:
 * <AdBanner adSlot="1234567890" adFormat="auto" />
 * 
 * Setup Instructions:
 * 1. Sign up for Google AdSense: https://www.google.com/adsense
 * 2. Get your Publisher ID (ca-pub-XXXXXXXXXXXXXXXX)
 * 3. Replace XXXXXXXXXXXXXXXX below with your actual Publisher ID
 * 4. Create ad units in AdSense dashboard to get ad slot IDs
 * 5. Add AdSense script to public/index.html:
 *    <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX" crossorigin="anonymous"></script>
 */
const AdBanner: React.FC<AdBannerProps> = ({
    adSlot,
    adFormat = 'auto',
    fullWidthResponsive = true,
    className = ''
}) => {
    useEffect(() => {
        try {
            // @ts-ignore - AdSense global variable
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error('AdSense error:', e);
        }
    }, []);

    return (
        <div className={`ad-container ${className}`}>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // Replace with your Publisher ID
                data-ad-slot={adSlot}
                data-ad-format={adFormat}
                data-full-width-responsive={fullWidthResponsive.toString()}
            />
        </div>
    );
};

export default AdBanner;
