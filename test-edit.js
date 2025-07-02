const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');
const path = require('path');

const API_BASE_URL = 'http://localhost:3001';

async function testEditFeatures() {
  try {
    console.log('✏️  Test des fonctionnalités d\'édition...');
    
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
    const uploadedVideoPath = uploadResponse.data.video.localPath || uploadResponse.data.video.path;
    
    // 2. Génération d'un clip de base
    console.log('\n2. Génération d\'un clip de base...');
    const originalClip = await generateClip(uploadedVideoPath, {
      duration: 20,
      aspectRatio: '16:9',
      numClips: 1,
      captions: false
    });
    console.log('✅ Clip de base généré:', originalClip.filename);
    
    // 3. Test édition de durée
    console.log('\n3. Test édition de durée...');
    const editedDurationClip = await editClipDuration(originalClip.id, 10);
    console.log('✅ Durée éditée:', editedDurationClip.filename, 'Duration:', editedDurationClip.duration + 's');
    
    // 4. Test ajout de captions
    console.log('\n4. Test ajout de captions...');
    const captionedClip = await toggleCaptions(originalClip.id, true);
    console.log('✅ Captions ajoutées:', captionedClip.filename, 'Captions:', captionedClip.captions);
    
    // 5. Test changement de ratio d'aspect
    console.log('\n5. Test changement de ratio d\'aspect...');
    const aspectRatioClip = await changeAspectRatio(originalClip.id, '9:16');
    console.log('✅ Ratio changé:', aspectRatioClip.filename, 'Aspect Ratio:', aspectRatioClip.aspectRatio);
    
    // 6. Test suppression de captions
    console.log('\n6. Test suppression de captions...');
    const noCaptionClip = await toggleCaptions(captionedClip.id, false);
    console.log('✅ Captions supprimées:', noCaptionClip.filename, 'Captions:', noCaptionClip.captions);
    
    console.log('\n🎉 Tous les tests d\'édition sont passés avec succès !');
    
  } catch (error) {
    console.error('❌ Erreur lors du test:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

async function generateClip(videoPath, settings) {
  const clipSettings = { videoPath, settings };
  
  const response = await axios.post(`${API_BASE_URL}/api/clips/generate`, clipSettings);
  
  if (!response.data.success) {
    throw new Error('Failed to generate clips');
  }
  
  return response.data.clips[0];
}

async function editClipDuration(clipId, newDuration) {
  const response = await axios.post(`${API_BASE_URL}/api/clips/edit/${clipId}/duration`, {
    newDuration: newDuration
  });
  
  if (!response.data.success) {
    throw new Error('Failed to edit clip duration');
  }
  
  return response.data.editedClip;
}

async function toggleCaptions(clipId, captionsOn) {
  const response = await axios.post(`${API_BASE_URL}/api/clips/edit/${clipId}/captions`, {
    captionsOn: captionsOn,
    captionOptions: {
      fontSize: 24,
      fontColor: 'white',
      position: 'bottom'
    }
  });
  
  if (!response.data.success) {
    throw new Error('Failed to toggle captions');
  }
  
  return response.data.editedClip;
}

async function changeAspectRatio(clipId, newAspectRatio) {
  const response = await axios.post(`${API_BASE_URL}/api/clips/edit/${clipId}/aspect-ratio`, {
    newAspectRatio: newAspectRatio
  });
  
  if (!response.data.success) {
    throw new Error('Failed to change aspect ratio');
  }
  
  return response.data.editedClip;
}

// Exécuter le test
testEditFeatures();
