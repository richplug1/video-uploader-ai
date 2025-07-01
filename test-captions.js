const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

async function testCaptionFeatures() {
  try {
    console.log('🎬 Test des fonctionnalités de captions...');
    
    // 1. Upload de la vidéo de test
    console.log('\n1. Upload de la vidéo de test...');
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
    
    console.log('✅ Vidéo uploadée:', uploadResponse.data.video.filename);
    const uploadedVideoPath = uploadResponse.data.video.path;
    
    // 2. Test génération de clips SANS captions
    console.log('\n2. Génération de clips sans captions...');
    const clipsWithoutCaptions = await generateClips(uploadedVideoPath, {
      duration: 10,
      aspectRatio: '16:9',
      numClips: 1,
      captions: false
    });
    console.log('✅ Clip sans captions généré:', clipsWithoutCaptions[0].filename);
    
    // 3. Test génération de clips AVEC captions
    console.log('\n3. Génération de clips avec captions...');
    const clipsWithCaptions = await generateClips(uploadedVideoPath, {
      duration: 10,
      aspectRatio: '16:9',
      numClips: 1,
      captions: true,
      captionOptions: {
        fontSize: 28,
        fontColor: 'yellow',
        position: 'bottom'
      }
    });
    console.log('✅ Clip avec captions généré:', clipsWithCaptions[0].filename);
    
    // 4. Test différents ratios d'aspect avec captions
    console.log('\n4. Test ratios d\'aspect avec captions...');
    const aspectRatios = ['16:9', '9:16', '1:1'];
    
    for (const ratio of aspectRatios) {
      const clips = await generateClips(uploadedVideoPath, {
        duration: 8,
        aspectRatio: ratio,
        numClips: 1,
        captions: true,
        captionOptions: {
          fontSize: 24,
          fontColor: 'white',
          position: 'center'
        }
      });
      console.log(`✅ Clip ${ratio} avec captions généré:`, clips[0].filename);
    }
    
    console.log('\n🎉 Tous les tests de captions sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

async function generateClips(videoPath, settings) {
  const clipSettings = { videoPath, settings };
  
  const response = await axios.post(`${API_BASE_URL}/api/clips/generate`, clipSettings);
  
  if (!response.data.success) {
    throw new Error('Failed to generate clips');
  }
  
  return response.data.clips;
}

// Exécuter le test
testCaptionFeatures();
