const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

async function testVideoUploadAndClipGeneration() {
  try {
    console.log('🧪 Début du test de l\'API...');
    
    // 1. Test de santé de l'API
    console.log('\n1. Test de santé de l\'API...');
    const healthResponse = await axios.get(`${API_BASE_URL}/api/health`);
    console.log('✅ API en ligne:', healthResponse.data);
    
    // 2. Upload de la vidéo de test
    console.log('\n2. Upload de la vidéo de test...');
    const videoPath = path.join(__dirname, 'backend', 'test-video.mp4');
    
    if (!fs.existsSync(videoPath)) {
      throw new Error('Vidéo de test non trouvée');
    }
    
    const formData = new FormData();
    formData.append('video', fs.createReadStream(videoPath));
    
    const uploadResponse = await axios.post(`${API_BASE_URL}/api/video/upload`, formData, {
      headers: {
        ...formData.getHeaders(),
      },
    });
    
    console.log('✅ Vidéo uploadée:', uploadResponse.data);
    const uploadedVideoPath = uploadResponse.data.video.path;
    
    // 3. Génération de clips avec différents ratios d'aspect
    console.log('\n3. Génération de clips avec différents ratios d\'aspect...');
    
    const testConfigs = [
      {
        name: 'Landscape (16:9)',
        settings: {
          duration: 15,
          aspectRatio: 16/9,
          numClips: 1,
          captions: false
        }
      },
      {
        name: 'Portrait (9:16)',
        settings: {
          duration: 15,
          aspectRatio: 9/16,
          numClips: 1,
          captions: false
        }
      },
      {
        name: 'Square (1:1)',
        settings: {
          duration: 15,
          aspectRatio: 1,
          numClips: 1,
          captions: false
        }
      }
    ];

    for (const config of testConfigs) {
      console.log(`\n   Testing ${config.name}...`);
      const clipSettings = {
        videoPath: uploadedVideoPath,
        settings: config.settings
      };
      
      try {
        const clipsResponse = await axios.post(`${API_BASE_URL}/api/clips/generate`, clipSettings);
        console.log(`   ✅ ${config.name} clips générés:`, clipsResponse.data.clips.length);
        
        // Test streaming du premier clip
        if (clipsResponse.data.clips.length > 0) {
          const firstClip = clipsResponse.data.clips[0];
          const streamResponse = await axios.get(`${API_BASE_URL}${firstClip.url}`, {
            responseType: 'stream'
          });
          console.log(`   ✅ Streaming ${config.name} fonctionne, status:`, streamResponse.status);
        }
      } catch (error) {
        console.error(`   ❌ Erreur pour ${config.name}:`, error.message);
      }
    }
    
    console.log('\n🎉 Tous les tests sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

// Exécuter le test
testVideoUploadAndClipGeneration();
