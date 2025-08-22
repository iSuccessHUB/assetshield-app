// Cloudflare Workers bindings interface
export interface CloudflareBindings {
  // D1 Database binding
  DB?: D1Database;
  
  // KV Storage binding (if needed)
  KV?: KVNamespace;
  
  // R2 Storage binding (if needed) 
  R2?: R2Bucket;
  
  // Environment variables
  STRIPE_SECRET_KEY: string;
  STRIPE_PUBLISHABLE_KEY: string;
  GOOGLE_ADSENSE_CLIENT: string;
  STRIPE_MODE: string;
  CURRENCY: string;
  NODE_ENV: string;
}

// Assessment related types
export interface AssessmentFormData {
  name: string;
  email: string;
  profession: string;
  netWorth: string;
  legalThreats: string;
  hasRealEstate?: boolean;
  legalHistory?: string[];
  currentProtection?: string[];
}

export interface RiskResult {
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  wealthAtRisk: number;
  recommendations: string[];
}

export interface RiskAssessment {
  id: number;
  userId: number;
  riskLevel: string;
  wealthAtRisk: number;
  recommendations: string[];
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  name: string;
  createdAt: string;
}