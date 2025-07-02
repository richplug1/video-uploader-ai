#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:3001';
const FRONTEND_URL = 'http://localhost:3000';

async function quickHealthCheck() {
  console.log('🩺 QUICK HEALTH CHECK');
  console.log('='.repeat(30));
  
  // Backend check
  try {
    const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 3000 });
    console.log('✅ Backend: ONLINE');
    console.log(`   Status: ${response.data.status}`);
    console.log(`   Uptime: ${Math.floor(response.data.uptime)}s`);
  } catch (error) {
    console.log('❌ Backend: OFFLINE');
    console.log(`   Error: ${error.code || error.message}`);
    console.log('   💡 Run: cd backend && node server.js');
  }
  
  // Frontend check
  try {
    const response = await axios.get(FRONTEND_URL, { timeout: 3000 });
    console.log('✅ Frontend: ONLINE');
    console.log(`   Status: ${response.status}`);
  } catch (error) {
    console.log('❌ Frontend: OFFLINE');
    console.log(`   Error: ${error.code || error.message}`);
    console.log('   💡 Run: npm run dev');
  }
  
  console.log('='.repeat(30));
  console.log('🌐 Frontend: http://localhost:3000');
  console.log('🔧 Backend:  http://localhost:3001');
  
  // Quick API test
  try {
    await axios.post(`${API_BASE_URL}/api/clips/suggest-settings`, {}, { timeout: 2000 });
  } catch (error) {
    if (error.response?.status === 400) {
      console.log('✅ API Routes: WORKING');
    } else {
      console.log('⚠️  API Routes: CHECK NEEDED');
    }
  }
}

async function performHealthCheck() {
  console.log('🏥 Performing health check for Video Uploader AI...\n');

  const results = {
    overall: 'healthy',
    timestamp: new Date().toISOString(),
    services: {},
    storage: {},
    system: {}
  };

  try {
    // 1. Backend Health Check
    console.log('1. Checking backend health...');
    try {
      const response = await axios.get(`${API_BASE_URL}/api/health`, { timeout: 5000 });
      
      if (response.data && response.data.status === 'OK') {
        results.services.backend = {
          status: 'healthy',
          uptime: response.data.uptime,
          timestamp: response.data.timestamp,
          response_time: response.config?.metadata?.endTime - response.config?.metadata?.startTime || 'unknown'
        };
        console.log('✅ Backend is healthy');
        console.log(`   Uptime: ${Math.floor(response.data.uptime / 60)} minutes`);
      } else {
        throw new Error('Invalid health response');
      }
    } catch (error) {
      results.services.backend = {
        status: 'unhealthy',
        error: error.message
      };
      results.overall = 'degraded';
      console.log('❌ Backend is unhealthy:', error.message);
    }

    // 2. Storage Health Check
    console.log('\n2. Checking storage health...');
    
    // Check uploads directories
    const directories = [
      'backend/uploads/videos',
      'backend/uploads/clips',
      'backend/temp'
    ];

    for (const dir of directories) {
      const fullPath = path.join(__dirname, dir);
      try {
        if (fs.existsSync(fullPath)) {
          const stats = fs.statSync(fullPath);
          const files = fs.readdirSync(fullPath);
          
          results.storage[dir] = {
            status: 'accessible',
            files_count: files.length,
            created: stats.birthtime,
            modified: stats.mtime
          };
          console.log(`✅ ${dir} - ${files.length} files`);
        } else {
          results.storage[dir] = {
            status: 'missing',
            error: 'Directory does not exist'
          };
          results.overall = 'degraded';
          console.log(`⚠️ ${dir} - Directory missing`);
        }
      } catch (error) {
        results.storage[dir] = {
          status: 'error',
          error: error.message
        };
        results.overall = 'degraded';
        console.log(`❌ ${dir} - Error:`, error.message);
      }
    }

    // 3. Cloud Storage Check
    console.log('\n3. Checking cloud storage configuration...');
    
    const envPath = path.join(__dirname, 'backend', '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      const useCloudStorage = envContent.includes('USE_CLOUD_STORAGE=true');
      const provider = envContent.match(/CLOUD_STORAGE_PROVIDER=(.+)/);
      
      results.storage.cloud = {
        enabled: useCloudStorage,
        provider: provider ? provider[1] : 'local',
        configured: useCloudStorage && provider
      };

      if (useCloudStorage) {
        console.log(`✅ Cloud storage enabled (${provider ? provider[1] : 'unknown'})`);
      } else {
        console.log('📁 Using local storage');
      }
    } else {
      results.storage.cloud = {
        enabled: false,
        provider: 'unknown',
        configured: false,
        error: '.env file not found'
      };
      console.log('⚠️ .env file not found');
    }

    // 4. System Resources Check
    console.log('\n4. Checking system resources...');
    
    // Check disk space
    try {
      const uploadsPath = path.join(__dirname, 'backend', 'uploads');
      if (fs.existsSync(uploadsPath)) {
        const stats = fs.statSync(uploadsPath);
        const files = fs.readdirSync(uploadsPath, { recursive: true });
        const videoFiles = files.filter(f => f.toString().endsWith('.mp4'));
        
        // Calculate total size
        let totalSize = 0;
        for (const file of files) {
          const filePath = path.join(uploadsPath, file.toString());
          if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
            totalSize += fs.statSync(filePath).size;
          }
        }

        results.system.storage = {
          total_files: files.length,
          video_files: videoFiles.length,
          total_size_mb: Math.round(totalSize / 1024 / 1024),
          uploads_directory: uploadsPath
        };

        console.log(`✅ Storage usage: ${Math.round(totalSize / 1024 / 1024)} MB`);
        console.log(`   Total files: ${files.length}`);
        console.log(`   Video files: ${videoFiles.length}`);
      }
    } catch (error) {
      results.system.storage = {
        status: 'error',
        error: error.message
      };
      console.log('❌ Storage check failed:', error.message);
    }

    // Check memory usage
    results.system.memory = {
      used_mb: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      total_mb: Math.round(process.memoryUsage().heapTotal / 1024 / 1024),
      external_mb: Math.round(process.memoryUsage().external / 1024 / 1024)
    };

    console.log(`✅ Memory usage: ${results.system.memory.used_mb}/${results.system.memory.total_mb} MB`);

    // 5. API Endpoints Check
    console.log('\n5. Checking API endpoints...');
    
    const endpoints = [
      { path: '/api/health', method: 'GET', critical: true },
      { path: '/api/video/upload', method: 'POST', critical: true },
      { path: '/api/clips/generate', method: 'POST', critical: true }
    ];

    for (const endpoint of endpoints) {
      try {
        if (endpoint.method === 'GET') {
          const response = await axios.get(`${API_BASE_URL}${endpoint.path}`, { timeout: 3000 });
          results.services[`api${endpoint.path}`] = {
            status: 'accessible',
            response_code: response.status
          };
          console.log(`✅ ${endpoint.path} - Accessible`);
        } else {
          // For POST endpoints, just check if they return a proper error (not 404)
          try {
            await axios.post(`${API_BASE_URL}${endpoint.path}`, {}, { timeout: 3000 });
          } catch (error) {
            if (error.response && error.response.status !== 404) {
              results.services[`api${endpoint.path}`] = {
                status: 'accessible',
                response_code: error.response.status,
                note: 'Endpoint exists but requires proper data'
              };
              console.log(`✅ ${endpoint.path} - Accessible (${error.response.status})`);
            } else {
              throw error;
            }
          }
        }
      } catch (error) {
        results.services[`api${endpoint.path}`] = {
          status: 'inaccessible',
          error: error.message,
          critical: endpoint.critical
        };
        
        if (endpoint.critical) {
          results.overall = 'unhealthy';
          console.log(`❌ ${endpoint.path} - Critical endpoint inaccessible`);
        } else {
          console.log(`⚠️ ${endpoint.path} - Inaccessible`);
        }
      }
    }

    // 6. Dependencies Check
    console.log('\n6. Checking dependencies...');
    
    const packageJsonPath = path.join(__dirname, 'backend', 'package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
      const nodeModulesPath = path.join(__dirname, 'backend', 'node_modules');
      
      results.system.dependencies = {
        backend_dependencies: Object.keys(packageJson.dependencies || {}).length,
        node_modules_exists: fs.existsSync(nodeModulesPath),
        package_version: packageJson.version
      };

      console.log(`✅ Backend dependencies: ${results.system.dependencies.backend_dependencies} packages`);
      console.log(`✅ Node modules: ${results.system.dependencies.node_modules_exists ? 'Present' : 'Missing'}`);
    }

    // Summary
    console.log('\n📊 Health Check Summary');
    console.log('='.repeat(50));
    console.log(`Overall Status: ${results.overall.toUpperCase()}`);
    console.log(`Timestamp: ${results.timestamp}`);
    console.log(`API Base URL: ${API_BASE_URL}`);
    
    // Recommendations
    console.log('\n💡 Recommendations:');
    if (results.overall === 'unhealthy') {
      console.log('🔴 System requires immediate attention!');
      console.log('   - Check backend server status');
      console.log('   - Verify all critical endpoints are accessible');
      console.log('   - Check error logs for detailed information');
    } else if (results.overall === 'degraded') {
      console.log('🟡 System is functional but has some issues:');
      console.log('   - Check storage directories');
      console.log('   - Verify cloud storage configuration');
      console.log('   - Monitor system resources');
    } else {
      console.log('🟢 System is healthy and fully operational!');
      console.log('   - All services are running correctly');
      console.log('   - Storage is accessible');
      console.log('   - API endpoints are responsive');
    }

    // Save results to file
    const healthLogPath = path.join(__dirname, 'health-check.json');
    fs.writeFileSync(healthLogPath, JSON.stringify(results, null, 2));
    console.log(`\n📄 Detailed results saved to: ${healthLogPath}`);

    // Exit with appropriate code
    process.exit(results.overall === 'healthy' ? 0 : 1);

  } catch (error) {
    console.error('❌ Health check failed:', error);
    results.overall = 'error';
    results.error = error.message;
    
    const healthLogPath = path.join(__dirname, 'health-check.json');
    fs.writeFileSync(healthLogPath, JSON.stringify(results, null, 2));
    
    process.exit(2);
  }
}

// Add request timing
axios.interceptors.request.use(config => {
  config.metadata = { startTime: new Date() };
  return config;
});

axios.interceptors.response.use(
  response => {
    response.config.metadata.endTime = new Date();
    return response;
  },
  error => {
    if (error.config) {
      error.config.metadata.endTime = new Date();
    }
    return Promise.reject(error);
  }
);

// Run health check if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  if (args.includes('--quick')) {
    quickHealthCheck().catch(console.error);
  } else {
    performHealthCheck().catch(console.error);
  }
}

// Export functions
module.exports = { performHealthCheck, quickHealthCheck };
