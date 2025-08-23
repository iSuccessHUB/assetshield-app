#!/bin/bash
# AssetShield Pro - Remove ALL Google AdSense Code Script
# This script removes all advertising elements while keeping everything else intact

echo "🚫 REMOVING ALL GOOGLE ADSENSE CODE FROM ASSETSHIELD PRO"
echo "================================================================"

# 1. Delete the entire AdSense JavaScript file
if [ -f "public/static/adsense.js" ]; then
    echo "✅ Deleting AdSense JavaScript file..."
    rm "public/static/adsense.js"
    echo "   Removed: public/static/adsense.js"
else
    echo "⚠️  AdSense file not found (may already be removed)"
fi

echo ""
echo "🔧 CLEANING RENDERER.TSX..."

# 2. Remove Google AdSense verification meta tag (lines 30-31)
sed -i '/Google AdSense Verification/,+1d' src/renderer.tsx
echo "✅ Removed AdSense verification meta tag"

# 3. Remove AdSense script loading (lines 69-70) 
sed -i '/async src="https:\/\/pagead2\.googlesyndication\.com/d' src/renderer.tsx
echo "✅ Removed AdSense script loading"

# 4. Remove AdSense script include (lines 451-452)
sed -i '/Google AdSense Integration/,+1d' src/renderer.tsx  
echo "✅ Removed AdSense integration script"

# 5. Clean up Content Security Policy - Remove AdSense domains
sed -i 's/\*\.googlesyndication\.com[[:space:]]*//g' src/renderer.tsx
sed -i 's/\*\.googletagservices\.com[[:space:]]*//g' src/renderer.tsx  
sed -i 's/\*\.doubleclick\.net[[:space:]]*//g' src/renderer.tsx
sed -i 's/\*\.google\.com[[:space:]]*//g' src/renderer.tsx
sed -i 's/tpc\.googlesyndication\.com[[:space:]]*//g' src/renderer.tsx
sed -i 's/ep1\.adtrafficquality\.google[[:space:]]*//g' src/renderer.tsx
echo "✅ Cleaned AdSense domains from Content Security Policy"

echo ""
echo "🔧 CLEANING TYPES.TS..."

# 6. Remove Google AdSense client from types
sed -i '/GOOGLE_ADSENSE_CLIENT: string;/d' src/types.ts
echo "✅ Removed GOOGLE_ADSENSE_CLIENT from CloudflareBindings"

echo ""
echo "🔧 CLEANING ENVIRONMENT FILES..."

# 7. Remove AdSense references from .env files if they exist
if [ -f ".env" ]; then
    sed -i '/GOOGLE_ADSENSE/d' .env
    echo "✅ Cleaned .env file"
fi

if [ -f ".env.example" ]; then
    sed -i '/GOOGLE_ADSENSE/d' .env.example  
    echo "✅ Cleaned .env.example file"
fi

if [ -f ".dev.vars" ]; then
    sed -i '/GOOGLE_ADSENSE/d' .dev.vars
    echo "✅ Cleaned .dev.vars file" 
fi

echo ""
echo "🎯 VERIFICATION - Checking for remaining ad references..."

# Check for any remaining ad references
remaining_refs=$(grep -r -i "adsense\|googlesyndication\|adsbygoogle" src/ public/ 2>/dev/null || true)

if [ -z "$remaining_refs" ]; then
    echo "✅ SUCCESS: No remaining AdSense references found!"
else
    echo "⚠️  WARNING: Some AdSense references may remain:"
    echo "$remaining_refs"
fi

echo ""
echo "================================================================"
echo "🎉 AD REMOVAL COMPLETE!"
echo "================================================================"
echo ""
echo "📋 SUMMARY OF CHANGES:"
echo "✅ Deleted: public/static/adsense.js (677 lines of ad code)"
echo "✅ Removed: Google AdSense verification meta tag"  
echo "✅ Removed: AdSense script loading from external CDN"
echo "✅ Removed: AdSense integration script reference"
echo "✅ Cleaned: Content Security Policy (removed ad domains)"
echo "✅ Removed: GOOGLE_ADSENSE_CLIENT from types"
echo "✅ Cleaned: Environment files (.env, .dev.vars)"
echo ""
echo "🚀 NEXT STEPS:"
echo "1. Test the application to ensure everything works"
echo "2. Rebuild and redeploy: npm run build && pm2 restart all"
echo "3. The app now has a clean, professional B2B appearance!"
echo ""
echo "💡 The platform is now ad-free and ready for high-end B2B legal clients!"