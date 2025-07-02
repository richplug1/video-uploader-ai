#!/usr/bin/env node

const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

async function comprehensiveAPITest() {
  console.log('🔍 COMPREHENSIVE API TEST');
  console.log('='.repeat(50));

  // 1. Test Backend Health
  console.log('\n1. 🩺 Testing Backend Health...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ Backend Health:', response.data);
  } catch (error) {
    console.log('❌ Backend Health Failed:', error.message);
    return;
  }

  // 2. Test Frontend Connectivity
  console.log('\n2. 🌐 Testing Frontend Connectivity...');
  try {
    const response = await axios.get(FRONTEND_URL);
    console.log('✅ Frontend accessible:', response.status);
  } catch (error) {
    console.log('❌ Frontend Failed:', error.message);
  }

  // 3. Test All API Routes
  console.log('\n3. 🔧 Testing API Routes...');
  
  const routes = [
    {
      name: 'Health Check',
      method: 'GET',
      path: '/api/health',
      expectedStatus: 200
    },
    {
      name: 'Video Upload (no file)',
      method: 'POST',
      path: '/api/video/upload',
      expectedStatus: 400,
      expectedError: 'No video file provided'
    },
    {
      name: 'Generate Clips (no data)',
      method: 'POST',
      path: '/api/clips/generate',
      body: {},
      expectedStatus: 400,
      expectedError: 'Video path required'
    },
    {
      name: 'AI Suggestions (no data)',
      method: 'POST',
      path: '/api/clips/suggest-settings',
      body: {},
      expectedStatus: 400,
      expectedError: 'Video path required'
    },
    {
      name: 'Clip Info',
      method: 'GET',
      path: '/api/clips/info/test-id',
      expectedStatus: 200
    },
    {
      name: 'Share Clip (non-existent)',
      method: 'GET',
      path: '/api/clips/share/test-id',
      expectedStatus: 404
    },
    {
      name: 'Non-existent Route',
      method: 'GET',
      path: '/api/nonexistent',
      expectedStatus: 404,
      expectedError: 'Route not found'
    }
  ];

  for (const route of routes) {
    try {
      let response;
      if (route.method === 'GET') {
        response = await axios.get(`${API_BASE_URL}${route.path}`);
      } else {
        response = await axios.post(`${API_BASE_URL}${route.path}`, route.body || {});
      }
      
      if (response.status === route.expectedStatus) {
        console.log(`✅ ${route.name}: ${response.status} (Expected: ${route.expectedStatus})`);
      } else {
        console.log(`⚠️  ${route.name}: ${response.status} (Expected: ${route.expectedStatus})`);
      }
      
    } catch (error) {
      if (error.response) {
        const status = error.response.status;
        const data = error.response.data;
        
        if (status === route.expectedStatus) {
          console.log(`✅ ${route.name}: ${status} (Expected: ${route.expectedStatus})`);
          if (route.expectedError && data.error === route.expectedError) {
            console.log(`   ✅ Error message matches: "${data.error}"`);
          }
        } else {
          console.log(`❌ ${route.name}: ${status} (Expected: ${route.expectedStatus})`);
          console.log(`   Response: ${JSON.stringify(data)}`);
        }
      } else {
        console.log(`❌ ${route.name}: Connection error - ${error.message}`);
      }
    }
  }

  // 4. Test CORS
  console.log('\n4. 🌍 Testing CORS...');
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, {
      headers: {
        'Origin': 'http://localhost:3000'
      }
    });
    console.log('✅ CORS working:', response.headers['access-control-allow-origin']);
  } catch (error) {
    console.log('❌ CORS Failed:', error.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('🎯 API Test Complete!');
  console.log('If all tests show ✅, your API is working correctly.');
  console.log('The "Route not found" error you encountered might be from:');
  console.log('- A frontend request to a non-existent route');
  console.log('- A timing issue during page load');
  console.log('- Browser console network errors');
  console.log('\nCheck the browser console for more details.');
}

comprehensiveAPITest().catch(console.error);
