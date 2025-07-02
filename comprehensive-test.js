const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

async function comprehensiveAppTest() {
  console.log('🔍 COMPREHENSIVE APPLICATION TEST');
  console.log('='.repeat(50));
  
  let testResults = {
    backend: { status: '❌', details: '' },
    upload: { status: '❌', details: '' },
    aiSuggestions: { status: '❌', details: '' },
    clipGeneration: { status: '❌', details: '' },
    clipEditing: { status: '❌', details: '' },
    sharing: { status: '❌', details: '' },
    cleanup: { status: '❌', details: '' }
  };

  try {
    // 1. Backend Health Check
    console.log('\n1. 🩺 Backend Health Check...');
    try {
      const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
      testResults.backend.status = '✅';
      testResults.backend.details = `Server running (uptime: ${Math.floor(healthResponse.data.uptime)}s)`;
      console.log('   ✅ Backend is healthy');
    } catch (error) {
      testResults.backend.details = error.message;
      console.log('   ❌ Backend health check failed');
      return testResults; // Exit early if backend is down
    }

    // 2. Video Upload Test
    console.log('\n2. 📹 Video Upload Test...');
    let uploadedVideoPath = null;
    try {
      const videoPath = path.join(__dirname, 'backend', 'test-video.mp4');
      if (!fs.existsSync(videoPath)) {
        throw new Error('Test video not found');
      }

      const formData = new FormData();
      formData.append('video', fs.createReadStream(videoPath));
      
      const uploadResponse = await axios.post(`${API_BASE_URL}/api/video/upload`, formData, {
        headers: { ...formData.getHeaders() }
      });

      if (uploadResponse.data.success) {
        uploadedVideoPath = uploadResponse.data.video.localPath || 
                          uploadResponse.data.video.cloudPath || 
                          uploadResponse.data.video.path;
        testResults.upload.status = '✅';
        testResults.upload.details = `Video uploaded: ${uploadResponse.data.video.filename}`;
        console.log('   ✅ Video upload successful');
      }
    } catch (error) {
      testResults.upload.details = error.response?.data?.message || error.message;
      console.log('   ❌ Video upload failed:', error.response?.data?.message || error.message);
    }

    // 3. AI Suggestions Test
    console.log('\n3. 🤖 AI Settings Suggestions Test...');
    if (uploadedVideoPath) {
      try {
        const suggestionsResponse = await axios.post(`${API_BASE_URL}/api/clips/suggest-settings`, {
          videoPath: uploadedVideoPath
        });

        if (suggestionsResponse.data.success) {
          testResults.aiSuggestions.status = '✅';
          testResults.aiSuggestions.details = `AI suggested: ${suggestionsResponse.data.suggestions.aspectRatio}, ${suggestionsResponse.data.suggestions.numClips} clips`;
          console.log('   ✅ AI suggestions working');
          console.log(`      Suggested: ${suggestionsResponse.data.suggestions.aspectRatio}, ${suggestionsResponse.data.suggestions.numClips} clips, ${suggestionsResponse.data.suggestions.duration}`);
        }
      } catch (error) {
        testResults.aiSuggestions.details = error.response?.data?.message || error.message;
        console.log('   ❌ AI suggestions failed:', error.response?.data?.message || error.message);
      }
    } else {
      testResults.aiSuggestions.details = 'Skipped - no uploaded video';
      console.log('   ⏭️  Skipped - no uploaded video');
    }

    // 4. Clip Generation Test
    console.log('\n4. ✂️  AI-Powered Clip Generation Test...');
    let generatedClipId = null;
    if (uploadedVideoPath) {
      try {
        const clipsResponse = await axios.post(`${API_BASE_URL}/api/clips/generate`, {
          videoPath: uploadedVideoPath,
          settings: {
            duration: '10s',
            aspectRatio: '16:9',
            numClips: 1,
            captions: false
          }
        });

        if (clipsResponse.data.success && clipsResponse.data.clips.length > 0) {
          generatedClipId = clipsResponse.data.clips[0].id;
          testResults.clipGeneration.status = '✅';
          testResults.clipGeneration.details = `Generated ${clipsResponse.data.clips.length} clip(s)`;
          console.log('   ✅ Clip generation successful');
          console.log(`      Generated clip: ${clipsResponse.data.clips[0].filename}`);
        }
      } catch (error) {
        testResults.clipGeneration.details = error.response?.data?.message || error.message;
        console.log('   ❌ Clip generation failed:', error.response?.data?.message || error.message);
      }
    } else {
      testResults.clipGeneration.details = 'Skipped - no uploaded video';
      console.log('   ⏭️  Skipped - no uploaded video');
    }

    // 5. Clip Editing Test
    console.log('\n5. ✏️  Clip Editing Test...');
    if (generatedClipId) {
      try {
        const editResponse = await axios.post(`${API_BASE_URL}/api/clips/edit/${generatedClipId}/duration`, {
          newDuration: 5
        });

        if (editResponse.data.success) {
          testResults.clipEditing.status = '✅';
          testResults.clipEditing.details = `Duration edited to ${editResponse.data.editedClip.duration}s`;
          console.log('   ✅ Clip editing successful');
        }
      } catch (error) {
        testResults.clipEditing.details = error.response?.data?.message || error.message;
        console.log('   ❌ Clip editing failed:', error.response?.data?.message || error.message);
      }
    } else {
      testResults.clipEditing.details = 'Skipped - no generated clip';
      console.log('   ⏭️  Skipped - no generated clip');
    }

    // 6. Sharing Test
    console.log('\n6. 🔗 Clip Sharing Test...');
    if (generatedClipId) {
      try {
        const shareResponse = await axios.get(`${API_BASE_URL}/api/clips/share/${generatedClipId}`);

        if (shareResponse.data.success) {
          testResults.sharing.status = '✅';
          testResults.sharing.details = `Share URL generated (${shareResponse.data.provider})`;
          console.log('   ✅ Clip sharing successful');
        }
      } catch (error) {
        testResults.sharing.details = error.response?.data?.message || error.message;
        console.log('   ❌ Clip sharing failed:', error.response?.data?.message || error.message);
      }
    } else {
      testResults.sharing.details = 'Skipped - no generated clip';
      console.log('   ⏭️  Skipped - no generated clip');
    }

    // 7. Cleanup Test
    console.log('\n7. 🧹 Cleanup Test...');
    try {
      const cleanupResponse = await axios.delete(`${API_BASE_URL}/api/clips/cleanup`, {
        data: { olderThanHours: 0 } // Clean all clips
      });

      if (cleanupResponse.data.success) {
        testResults.cleanup.status = '✅';
        testResults.cleanup.details = `Cleaned ${cleanupResponse.data.deletedCount} clips`;
        console.log('   ✅ Cleanup successful');
      }
    } catch (error) {
      testResults.cleanup.details = error.response?.data?.message || error.message;
      console.log('   ❌ Cleanup failed:', error.response?.data?.message || error.message);
    }

  } catch (error) {
    console.error('Unexpected error during testing:', error);
  }

  // Final Results Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 FINAL TEST RESULTS');
  console.log('='.repeat(50));
  
  let totalTests = Object.keys(testResults).length;
  let passedTests = Object.values(testResults).filter(test => test.status === '✅').length;
  
  Object.entries(testResults).forEach(([test, result]) => {
    console.log(`${result.status} ${test.toUpperCase().padEnd(15)} ${result.details}`);
  });
  
  console.log('\n📈 OVERALL SCORE:', `${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL SYSTEMS OPERATIONAL! Application is fully functional.');
  } else if (passedTests >= totalTests * 0.8) {
    console.log('⚠️  Most systems working. Minor issues detected.');
  } else {
    console.log('🚨 Critical issues detected. Application needs attention.');
  }

  return testResults;
}

// Run the comprehensive test
comprehensiveAppTest().catch(console.error);
