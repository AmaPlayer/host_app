# Ad Components Usage Guide

## Quick Start

### 1. Import Components
```tsx
import { AdBanner, InFeedAd } from '../../components/ads';
```

### 2. Use in Home Feed
```tsx
<AdBanner adSlot="1234567890" />

{posts.map((post, index) => (
  <React.Fragment key={post.id}>
    <PostCard post={post} />
    {(index + 1) % 5 === 0 && <InFeedAd adSlot="0987654321" />}
  </React.Fragment>
))}
```

### 3. Setup Required
- Replace `ca-pub-XXXXXXXXXXXXXXXX` with your Publisher ID
- Add AdSense script to `public/index.html`
- Get ad slot IDs from AdSense dashboard

See `debug/adsense_implementation_guide.md` for full instructions.
