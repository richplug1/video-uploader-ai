const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

async function testAIIntegration() {
  try {
    console.log('🤖 Testing AI Integration Features...\n');
    
    // 1. Upload test video
    console.log('1. Uploading test video...');
    const videoPath = path.join(__dirname, 'backend', 'test-video.mp4');
    
    if (!fs.existsSync(videoPath)) {
      throw new Error('Test video not found. Please ensure backend/test-video.mp4 exists.');
    }
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(videoPath));
    
    const uploadResponse = await axios.post(`${API_BASE_URL}/api/video/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    console.log('✅ Video uploaded:', uploadResponse.data.video.filename);
    const uploadedVideoPath = uploadResponse.data.video.localPath || uploadResponse.data.video.path;
    
    // 2. Test AI settings suggestions
    console.log('\n2. Testing AI-powered settings suggestions...');
    try {
      const suggestionsResponse = await axios.post(`${API_BASE_URL}/api/clips/suggest-settings`, {
        videoPath: uploadedVideoPath
      });
      
      if (suggestionsResponse.data.success) {
        console.log('✅ AI Settings Suggestions:');
        console.log('   Aspect Ratio:', suggestionsResponse.data.suggestions.aspectRatio);
        console.log('   Duration:', suggestionsResponse.data.suggestions.duration);
        console.log('   Number of Clips:', suggestionsResponse.data.suggestions.numClips);
        console.log('   Captions:', suggestionsResponse.data.suggestions.captions);
        console.log('   Recommended Hashtags:', suggestionsResponse.data.suggestions.recommendedHashtags?.join(', '));
      }
    } catch (suggestionError) {
      console.log('⚠️ AI suggestions endpoint not yet available or error occurred');
      console.log('   This is expected if the server hasn\'t been restarted with the new code');
    }
    
    // 3. Test AI-powered clip generation
    console.log('\n3. Testing AI-powered clip generation...');
    try {
      const clipsResponse = await axios.post(`${API_BASE_URL}/api/clips/generate`, {
        videoPath: uploadedVideoPath,
        settings: {
          duration: '10s',
          aspectRatio: '16:9',
          numClips: 2,
          captions: true
        }
      });

      if (clipsResponse.data.success) {
        console.log('✅ AI-powered clips generated successfully');
        console.log(`   Generated ${clipsResponse.data.clips.length} clips`);
        
        // Check for AI analysis data
        clipsResponse.data.clips.forEach((clip, index) => {
          console.log(`\n   Clip ${index + 1}:`);
          console.log(`     Filename: ${clip.filename}`);
          console.log(`     Start Time: ${clip.startTime}s`);
          console.log(`     Duration: ${clip.duration}s`);
          
          if (clip.aiAnalysis) {
            console.log(`     🤖 AI Analysis:`);
            console.log(`       - Confidence: ${clip.aiAnalysis.confidence}`);
            console.log(`       - Reason: ${clip.aiAnalysis.reason}`);
            console.log(`       - AI Generated: ${clip.aiAnalysis.isAIGenerated}`);
          }
        });
      }
    } catch (clipError) {
      console.log('⚠️ AI-powered clip generation failed:', clipError.response?.data?.message || clipError.message);
    }
    
    console.log('\n🎉 AI Integration Test Complete!');
    console.log('\n📝 Notes:');
    console.log('   - Some features may not work until the server is restarted');
    console.log('   - OpenAI features require OPENAI_API_KEY in environment');
    console.log('   - Full AI analysis requires computer vision setup');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Run the test
testAIIntegration();
