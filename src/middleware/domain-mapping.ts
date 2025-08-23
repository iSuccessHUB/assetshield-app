// Domain Mapping Middleware for White-Label SaaS Platform
// This middleware checks the request domain and loads customer configuration

import { SaaSPlatformService } from '../services/saas-platform'

interface WhiteLabelConfig {
  customerId: number;
  firmName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  firmAddress?: string;
  firmWebsite?: string;
  firmPhone?: string;
  firmDescription?: string;
  heroTitle?: string;
  heroSubtitle?: string;
  aboutContent?: string;
  servicesContent?: string;
  featuresEnabled: string[];
  fromEmail?: string;
  replyToEmail?: string;
}

interface CloudflareBindings {
  DB: D1Database;
}

export const domainMapping = () => {
  return async (c: any, next: any) => {
    try {
      // Get the host from the request
      let host = c.req.header('host') || c.req.header('x-forwarded-host') || 'localhost:3000';
      
      // Clean up the host (remove port for local development)
      if (host.includes(':')) {
        host = host.split(':')[0];
      }
      
      console.log('🌐 Domain mapping check for host:', host);
      
      // Skip domain mapping for dashboard, API routes, and static files
      const path = c.req.path;
      if (path.startsWith('/dashboard') || 
          path.startsWith('/api/') || 
          path.startsWith('/static/') ||
          path.startsWith('/stripe-checkout') ||
          path.startsWith('/stripe-webhooks') ||
          path.startsWith('/provisioning') ||
          path.startsWith('/integrations') ||
          path.startsWith('/offices') ||
          path.startsWith('/demo') ||
          path.includes('manifest.json') ||
          path.includes('sw.js') ||
          path.includes('offline.html')) {
        console.log('⏭️ Skipping domain mapping for system path:', path);
        return await next();
      }
      
      // For main domain or localhost, use default branding
      const isMainDomain = host === 'localhost' || 
                          host.includes('pages.dev') || 
                          host.includes('assetshield') ||
                          host === '127.0.0.1';
      
      if (isMainDomain) {
        console.log('🏠 Using default branding for main domain:', host);
        c.set('whiteLabelConfig', null);
        return await next();
      }
      
      // Try to find customer configuration by domain
      const saasService = new SaaSPlatformService(c.env.DB);
      const customerConfig = await saasService.getCustomerByDomain(host);
      
      if (customerConfig) {
        console.log('✅ Found customer configuration for domain:', host, 'Customer:', customerConfig.firm_name);
        
        // Transform database result to WhiteLabelConfig format
        const whiteLabelConfig: WhiteLabelConfig = {
          customerId: customerConfig.id,
          firmName: customerConfig.firm_name,
          logoUrl: customerConfig.logo_url,
          primaryColor: customerConfig.primary_color || '#2563eb',
          secondaryColor: customerConfig.secondary_color || '#1d4ed8',
          accentColor: customerConfig.accent_color || '#10b981',
          firmAddress: customerConfig.firm_address,
          firmWebsite: customerConfig.firm_website,
          firmPhone: customerConfig.firm_phone,
          firmDescription: customerConfig.firm_description,
          heroTitle: customerConfig.hero_title || `Protect Your Assets with ${customerConfig.firm_name}`,
          heroSubtitle: customerConfig.hero_subtitle || 'Professional asset protection strategies tailored for your unique situation',
          aboutContent: customerConfig.about_content,
          servicesContent: customerConfig.services_content,
          featuresEnabled: customerConfig.features_enabled || [],
          fromEmail: customerConfig.from_email,
          replyToEmail: customerConfig.reply_to_email
        };
        
        // Store the configuration in context for use in routes
        c.set('whiteLabelConfig', whiteLabelConfig);
        console.log('🎨 White-label configuration loaded for:', whiteLabelConfig.firmName);
      } else {
        console.log('❌ No customer configuration found for domain:', host);
        c.set('whiteLabelConfig', null);
      }
      
      return await next();
      
    } catch (error) {
      console.error('❌ Domain mapping error:', error);
      // Continue with default branding if mapping fails
      c.set('whiteLabelConfig', null);
      return await next();
    }
  };
};

// Helper function to generate white-label CSS based on customer configuration
export const generateWhiteLabelCSS = (config: WhiteLabelConfig | null): string => {
  if (!config) {
    return '/* Default AssetShield branding */';
  }
  
  return `
    /* White-label CSS for ${config.firmName} */
    :root {
      --primary-color: ${config.primaryColor};
      --secondary-color: ${config.secondaryColor};
      --accent-color: ${config.accentColor};
    }
    
    /* Override primary colors throughout the application */
    .bg-blue-600 { background-color: ${config.primaryColor} !important; }
    .bg-blue-700 { background-color: ${config.secondaryColor} !important; }
    .text-blue-600 { color: ${config.primaryColor} !important; }
    .text-blue-700 { color: ${config.secondaryColor} !important; }
    .border-blue-500 { border-color: ${config.primaryColor} !important; }
    .border-blue-600 { border-color: ${config.primaryColor} !important; }
    
    /* Gradient overrides */
    .from-blue-600 { --tw-gradient-from: ${config.primaryColor} !important; }
    .to-indigo-600 { --tw-gradient-to: ${config.secondaryColor} !important; }
    .from-blue-700 { --tw-gradient-from: ${config.secondaryColor} !important; }
    .to-indigo-700 { --tw-gradient-to: ${config.accentColor} !important; }
    
    /* Accent color overrides */
    .text-green-600 { color: ${config.accentColor} !important; }
    .bg-green-600 { background-color: ${config.accentColor} !important; }
    
    /* Focus states */
    .focus\\:border-blue-500:focus { border-color: ${config.primaryColor} !important; }
    .focus\\:ring-blue-500:focus { --tw-ring-color: ${config.primaryColor} !important; }
  `;
};

// Helper function to create white-label manifest.json
export const generateWhiteLabelManifest = (config: WhiteLabelConfig | null) => {
  const defaultManifest = {
    "name": "AssetShield App - Asset Protection Platform",
    "short_name": "AssetShield",
    "description": "Complete asset protection platform for individuals and law firms",
    "start_url": "/",
    "display": "standalone",
    "background_color": "#1e40af",
    "theme_color": "#1e40af",
    "orientation": "portrait",
    "categories": ["business", "finance", "productivity"],
    "lang": "en",
    "dir": "ltr",
    "icons": [
      {
        "src": "/static/icons/icon-192x192.png",
        "sizes": "192x192",
        "type": "image/png",
        "purpose": "maskable any"
      },
      {
        "src": "/static/icons/icon-512x512.png",
        "sizes": "512x512",
        "type": "image/png",
        "purpose": "maskable any"
      }
    ]
  };
  
  if (!config) {
    return defaultManifest;
  }
  
  return {
    ...defaultManifest,
    "name": `${config.firmName} - Asset Protection Platform`,
    "short_name": config.firmName,
    "description": config.firmDescription || `Professional asset protection services by ${config.firmName}`,
    "background_color": config.primaryColor,
    "theme_color": config.primaryColor
  };
};