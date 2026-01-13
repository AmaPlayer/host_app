import React, { useEffect } from 'react';
import './InFeedAd.css';

interface InFeedAdProps {
    adSlot: string;
    layoutKey?: string;
}

/**
 * InFeedAd Component
 * 
 * Displays Google AdSense in-feed native ads that blend with your content
 * 
 * Usage:
 * <InFeedAd adSlot="0987654321" />
 * 
 * Setup Instructions:
 * 1. Create an "In-feed" ad unit in your AdSense dashboard
 * 2. Copy the ad slot ID
 * 3. Replace the Publisher ID in this component
 * 4. Use between posts in your feed (recommended: every 5-7 posts)
 */
const InFeedAd: React.FC<InFeedAdProps> = ({
    adSlot,
    layoutKey = '-6t+ed+2i-1n-4w'
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
        <div className="in-feed-ad-container">
            <span className="ad-label">Sponsored</span>
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-format="fluid"
                data-ad-layout-key={layoutKey}
                data-ad-client="ca-pub-XXXXXXXXXXXXXXXX" // TODO: Replace with your Publisher ID
                data-ad-slot={adSlot}
            />
        </div>
    );
};

export default InFeedAd;
