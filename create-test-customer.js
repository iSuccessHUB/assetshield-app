// Test script to create a demo customer account using the SaaS service
import { SaaSPlatformService } from './src/services/saas-platform.js';
import Database from 'better-sqlite3';

// Create a simple SQLite database connection for testing
const db = {
  prepare: (query) => {
    console.log('Preparing query:', query);
    return {
      bind: (...params) => ({
        run: () => {
          console.log('Executing with params:', params);
          return { meta: { last_row_id: Math.floor(Math.random() * 1000) } };
        },
        first: () => {
          console.log('First with params:', params);
          return null;
        },
        all: () => {
          console.log('All with params:', params);
          return { results: [] };
        }
      })
    };
  }
};

// Test customer data
const customerData = {
  firmName: 'Demo Law Firm',
  ownerName: 'Demo User',
  ownerEmail: 'demo@demolaw.com',
  ownerPhone: '555-0123',
  tier: 'professional',
  setupFee: 10000,
  monthlyFee: 1200,
  stripeCustomerId: 'cus_demo123',
  subscriptionId: 'sub_demo123'
};

// Create the customer
const saasService = new SaaSPlatformService(db);

try {
  console.log('Creating demo customer...');
  const result = await saasService.createCustomer(customerData);
  console.log('Demo customer created:', result);
  console.log('');
  console.log('Dashboard Login Credentials:');
  console.log('Email:', customerData.ownerEmail);
  console.log('Password:', result.password);
  console.log('API Key:', result.apiKey);
} catch (error) {
  console.error('Failed to create demo customer:', error);
}