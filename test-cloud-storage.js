#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const FormData = require('form-data');

const API_BASE_URL = 'http://localhost:3001';

async function testCloudStorageIntegration() {
  console.log('🔄 Testing Cloud Storage Integration...\n');

  try {
    // Test 1: Upload video
    console.log('1. Testing video upload with cloud storage...');
    const testVideoPath = path.join(__dirname, 'backend/test-video.mp4');
    
    if (!fs.existsSync(testVideoPath)) {
      console.log('❌ Test video not found. Please ensure test-video.mp4 exists in backend/');
      return;
    }

    const formData = new FormData();
    formData.append('video', fs.createReadStream(testVideoPath));

    const uploadResponse = await axios.post(`${API_BASE_URL}/api/video/upload`, formData, {
      headers: formData.getHeaders(),
    });

    if (uploadResponse.data.success) {
      console.log('✅ Video uploaded successfully');
      console.log('   Full response:', JSON.stringify(uploadResponse.data.video, null, 2));
      console.log(`   Cloud URL: ${uploadResponse.data.video.cloudUrl || 'Local storage'}`);
      console.log(`   Provider: ${uploadResponse.data.video.provider || 'local'}`);
    } else {
      console.log('❌ Video upload failed');
      return;
    }

    const videoPath = uploadResponse.data.video.localPath || uploadResponse.data.video.cloudPath || uploadResponse.data.video.path;

    // Test 2: Generate clips with cloud storage
    console.log('\n2. Testing clip generation with cloud storage...');
    const clipsResponse = await axios.post(`${API_BASE_URL}/api/clips/generate`, {
      videoPath: videoPath,
      settings: {
        duration: '10s',
        aspectRatio: '16:9',
        numClips: 2,
        captions: true
      }
    });

    if (clipsResponse.data.success) {
      console.log('✅ Clips generated successfully');
      console.log(`   Cloud Storage Enabled: ${clipsResponse.data.cloudStorage?.enabled || false}`);
      console.log(`   Provider: ${clipsResponse.data.cloudStorage?.provider || 'local'}`);
      console.log(`   Generated ${clipsResponse.data.clips.length} clips`);

      const clips = clipsResponse.data.clips;
      
      // Test each clip
      for (let i = 0; i < clips.length; i++) {
        const clip = clips[i];
        console.log(`\n   Clip ${i + 1}:`);
        console.log(`     Cloud URL: ${clip.cloudUrl || 'N/A'}`);
        console.log(`     Provider: ${clip.provider || 'local'}`);
        console.log(`     Error: ${clip.error || 'None'}`);
      }

      // Test 3: Share URL generation
      if (clips.length > 0) {
        console.log('\n3. Testing share URL generation...');
        const shareResponse = await axios.get(`${API_BASE_URL}/api/clips/share/${clips[0].id}`);
        
        if (shareResponse.data.success) {
          console.log('✅ Share URL generated successfully');
          console.log(`   Share URL: ${shareResponse.data.shareUrl}`);
          console.log(`   Provider: ${shareResponse.data.provider}`);
          console.log(`   Expires: ${shareResponse.data.expiresAt || 'Never'}`);
        } else {
          console.log('❌ Share URL generation failed');
        }

        // Test 4: File info
        console.log('\n4. Testing file info retrieval...');
        const infoResponse = await axios.get(`${API_BASE_URL}/api/clips/info/${clips[0].id}`);
        
        if (infoResponse.data.success) {
          console.log('✅ File info retrieved successfully');
          console.log(`   Cloud exists: ${infoResponse.data.locations.cloud?.exists || false}`);
          console.log(`   Local exists: ${infoResponse.data.locations.local?.exists || false}`);
          console.log(`   Cloud provider: ${infoResponse.data.cloudStorage.provider}`);
        } else {
          console.log('❌ File info retrieval failed');
        }

        // Test 5: Delete with cloud cleanup
        console.log('\n5. Testing clip deletion with cloud cleanup...');
        const deleteResponse = await axios.delete(`${API_BASE_URL}/api/clips/${clips[0].id}`);
        
        if (deleteResponse.data.success) {
          console.log('✅ Clip deleted successfully');
          console.log(`   Cloud deleted: ${deleteResponse.data.details.cloud?.success || 'N/A'}`);
          console.log(`   Local deleted: ${deleteResponse.data.details.local?.success || 'N/A'}`);
        } else {
          console.log('❌ Clip deletion failed');
        }
      }

    } else {
      console.log('❌ Clip generation failed');
      console.log('Error:', clipsResponse.data.message);
    }

    console.log('\n🎉 Cloud Storage Integration Test Complete!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
  }
}

// Run tests
if (require.main === module) {
  testCloudStorageIntegration();
}

module.exports = { testCloudStorageIntegration };
