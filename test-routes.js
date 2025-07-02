#!/usr/bin/env node

const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testAllRoutes() {
  console.log('🧪 Test de toutes les routes API...\n');

  const routes = [
    { method: 'GET', path: '/api/health', description: 'Health check' },
    { method: 'POST', path: '/api/video/upload', description: 'Video upload (sans fichier)' },
    { method: 'POST', path: '/api/clips/generate', description: 'Generate clips (sans données)' },
    { method: 'POST', path: '/api/clips/suggest-settings', description: 'AI suggestions (sans données)' },
    { method: 'GET', path: '/api/clips/info/test-id', description: 'Clip info' },
    { method: 'GET', path: '/api/clips/share/test-id', description: 'Share clip' },
    { method: 'GET', path: '/api/nonexistent', description: 'Route inexistante (404 attendu)' },
  ];

  for (const route of routes) {
    try {
      console.log(`Testing ${route.method} ${route.path} - ${route.description}`);
      
      let response;
      if (route.method === 'GET') {
        response = await axios.get(`${API_BASE_URL}${route.path}`);
      } else {
        response = await axios.post(`${API_BASE_URL}${route.path}`, {});
      }
      
      console.log(`✅ ${route.path}: ${response.status} - ${JSON.stringify(response.data).substring(0, 100)}...\n`);
      
    } catch (error) {
      if (error.response) {
        console.log(`❌ ${route.path}: ${error.response.status} - ${JSON.stringify(error.response.data)}`);
      } else {
        console.log(`❌ ${route.path}: Erreur de connexion - ${error.message}`);
      }
      console.log('');
    }
  }
}

testAllRoutes().catch(console.error);
