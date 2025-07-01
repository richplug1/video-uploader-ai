const express = require('express');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const VideoProcessor = require('../services/videoProcessor');
const AIService = require('../services/aiService');

const router = express.Router();

// Generate clips from video with cloud storage integration
router.post('/generate', async (req, res) => {
  try {
    const { 
      videoPath,
      settings = {
        duration: '15s',
        aspectRatio: '16:9',
        numClips: 1,
        captions: true
      }
    } = req.body;

    if (!videoPath) {
      return res.status(400).json({ error: 'Video path required' });
    }

    // Ensure videoPath exists
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video file not found' });
    }

    const processor = new VideoProcessor();
    const clipsDir = path.join(__dirname, '../uploads/clips');
    
    if (!fs.existsSync(clipsDir)) {
      fs.mkdirSync(clipsDir, { recursive: true });
    }

    // Generate multiple clips with cloud storage integration
    const generatedClips = await processor.generateMultipleClipsWithCloudUpload({
      inputPath: videoPath,
      outputDir: clipsDir,
      settings: {
        ...settings,
        numClips: parseInt(settings.numClips) || 1
      }
    });

    // Format response with URLs (cloud or local)
    const clipsWithUrls = generatedClips.map(clip => ({
      id: clip.id,
      filename: clip.filename,
      localPath: clip.localPath,
      cloudUrl: clip.cloudUrl,
      provider: clip.provider,
      url: clip.cloudUrl || `/api/clips/stream/${clip.id}`,
      downloadUrl: clip.cloudUrl || `/api/clips/download/${clip.id}`,
      shareUrl: clip.cloudUrl || `/api/clips/share/${clip.id}`,
      startTime: clip.startTime,
      duration: clip.duration,
      aspectRatio: clip.aspectRatio,
      captions: clip.captions,
      createdAt: new Date().toISOString(),
      error: clip.error || null
    }));

    const successfulClips = clipsWithUrls.filter(clip => !clip.error);
    const failedClips = clipsWithUrls.filter(clip => clip.error);

    res.json({
      success: true,
      message: `Generated ${successfulClips.length} clips successfully${failedClips.length > 0 ? ` (${failedClips.length} failed)` : ''}`,
      clips: successfulClips,
      failed: failedClips.length > 0 ? failedClips : undefined,
      cloudStorage: {
        enabled: processor.cloudStorage.useCloudStorage,
        provider: processor.cloudStorage.storageProvider
      }
    });

  } catch (error) {
    console.error('Generate clips error:', error);
    res.status(500).json({ 
      error: 'Failed to generate clips',
      message: error.message 
    });
  }
});

// Download clip
router.get('/download/:clipId', (req, res) => {
  try {
    const { clipId } = req.params;
    const clipPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);

    if (!fs.existsSync(clipPath)) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    res.download(clipPath, `clip_${clipId}.mp4`);

  } catch (error) {
    console.error('Download clip error:', error);
    res.status(500).json({ 
      error: 'Failed to download clip',
      message: error.message 
    });
  }
});

// Stream clip
router.get('/stream/:clipId', (req, res) => {
  try {
    const { clipId } = req.params;
    const clipPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);

    if (!fs.existsSync(clipPath)) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    const stat = fs.statSync(clipPath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(clipPath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      };
      res.writeHead(200, head);
      fs.createReadStream(clipPath).pipe(res);
    }

  } catch (error) {
    console.error('Stream clip error:', error);
    res.status(500).json({ 
      error: 'Failed to stream clip',
      message: error.message 
    });
  }
});

// Delete clip
router.delete('/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const processor = new VideoProcessor();
    const cloudPath = `clips/clip_${clipId}.mp4`;
    const localPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
    
    const deleteResults = {
      cloud: null,
      local: null
    };

    // Try to delete from cloud storage first
    if (processor.cloudStorage.useCloudStorage) {
      try {
        const cloudExists = await processor.cloudStorage.fileExists(cloudPath);
        if (cloudExists) {
          deleteResults.cloud = await processor.deleteCloudFile(cloudPath);
          console.log('Cloud file deleted:', deleteResults.cloud);
        } else {
          deleteResults.cloud = { exists: false, message: 'File not found in cloud storage' };
        }
      } catch (cloudError) {
        console.error('Cloud deletion failed:', cloudError);
        deleteResults.cloud = { success: false, error: cloudError.message };
      }
    }

    // Try to delete local file
    if (fs.existsSync(localPath)) {
      try {
        fs.unlinkSync(localPath);
        deleteResults.local = { success: true, message: 'Local file deleted' };
        console.log('Local file deleted:', localPath);
      } catch (localError) {
        console.error('Local deletion failed:', localError);
        deleteResults.local = { success: false, error: localError.message };
      }
    } else {
      deleteResults.local = { exists: false, message: 'Local file not found' };
    }

    // Determine overall success
    const cloudSuccess = !deleteResults.cloud || deleteResults.cloud.success !== false;
    const localSuccess = !deleteResults.local || deleteResults.local.success !== false;
    const overallSuccess = cloudSuccess && localSuccess;

    res.json({
      success: overallSuccess,
      message: overallSuccess ? 'Clip deleted successfully' : 'Partial deletion occurred',
      deletedAt: new Date().toISOString(),
      details: deleteResults
    });

  } catch (error) {
    console.error('Delete clip error:', error);
    res.status(500).json({ 
      error: 'Failed to delete clip',
      message: error.message 
    });
  }
});



// Edit clip duration
router.post('/edit/:clipId/duration', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { newDuration } = req.body;
    
    if (!newDuration || newDuration <= 0) {
      return res.status(400).json({ error: 'Valid duration required' });
    }

    const originalClipPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
    
    if (!fs.existsSync(originalClipPath)) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Create new filename for edited clip
    const editedClipId = uuidv4();
    const editedClipPath = path.join(__dirname, '../uploads/clips', `clip_${editedClipId}.mp4`);
    
    const processor = new VideoProcessor();
    
    // Edit the clip duration
    await processor.editClipDuration({
      inputPath: originalClipPath,
      outputPath: editedClipPath,
      newDuration: parseInt(newDuration)
    });

    res.json({
      success: true,
      message: 'Clip duration edited successfully',
      editedClip: {
        id: editedClipId,
        filename: `clip_${editedClipId}.mp4`,
        url: `/api/clips/stream/${editedClipId}`,
        downloadUrl: `/api/clips/download/${editedClipId}`,
        duration: parseInt(newDuration),
        editedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Edit duration error:', error);
    res.status(500).json({ 
      error: 'Failed to edit clip duration',
      message: error.message 
    });
  }
});

// Toggle captions on/off
router.post('/edit/:clipId/captions', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { captionsOn, captionOptions = {} } = req.body;
    
    const originalClipPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
    
    if (!fs.existsSync(originalClipPath)) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Create new filename for edited clip
    const editedClipId = uuidv4();
    const editedClipPath = path.join(__dirname, '../uploads/clips', `clip_${editedClipId}.mp4`);
    
    const processor = new VideoProcessor();
    
    if (captionsOn) {
      // Add captions
      await processor.addCaptions(originalClipPath, editedClipPath, {
        generateAutoCaption: true,
        fontSize: captionOptions.fontSize || 24,
        fontColor: captionOptions.fontColor || 'white',
        position: captionOptions.position || 'bottom'
      });
    } else {
      // Remove captions (copy without caption filters)
      await processor.removeCaptions(originalClipPath, editedClipPath);
    }

    res.json({
      success: true,
      message: `Captions ${captionsOn ? 'added to' : 'removed from'} clip successfully`,
      editedClip: {
        id: editedClipId,
        filename: `clip_${editedClipId}.mp4`,
        url: `/api/clips/stream/${editedClipId}`,
        downloadUrl: `/api/clips/download/${editedClipId}`,
        captions: captionsOn,
        editedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Toggle captions error:', error);
    res.status(500).json({ 
      error: 'Failed to toggle captions',
      message: error.message 
    });
  }
});

// Edit clip aspect ratio
router.post('/edit/:clipId/aspect-ratio', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { newAspectRatio } = req.body;
    
    if (!newAspectRatio) {
      return res.status(400).json({ error: 'Aspect ratio required' });
    }

    const originalClipPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
    
    if (!fs.existsSync(originalClipPath)) {
      return res.status(404).json({ error: 'Clip not found' });
    }

    // Create new filename for edited clip
    const editedClipId = uuidv4();
    const editedClipPath = path.join(__dirname, '../uploads/clips', `clip_${editedClipId}.mp4`);
    
    const processor = new VideoProcessor();
    
    // Change aspect ratio
    await processor.changeAspectRatio({
      inputPath: originalClipPath,
      outputPath: editedClipPath,
      aspectRatio: newAspectRatio
    });

    res.json({
      success: true,
      message: 'Aspect ratio changed successfully',
      editedClip: {
        id: editedClipId,
        filename: `clip_${editedClipId}.mp4`,
        url: `/api/clips/stream/${editedClipId}`,
        downloadUrl: `/api/clips/download/${editedClipId}`,
        aspectRatio: newAspectRatio,
        editedAt: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Change aspect ratio error:', error);
    res.status(500).json({ 
      error: 'Failed to change aspect ratio',
      message: error.message 
    });
  }
});

// Cleanup old clips
router.delete('/cleanup', async (req, res) => {
  try {
    const { olderThanHours = 24 } = req.body;
    const clipsDir = path.join(__dirname, '../uploads/clips');
    
    if (!fs.existsSync(clipsDir)) {
      return res.json({ success: true, message: 'No clips directory found', deletedCount: 0 });
    }

    const files = fs.readdirSync(clipsDir);
    const cutoffTime = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
    let deletedCount = 0;

    for (const file of files) {
      const filePath = path.join(clipsDir, file);
      const stats = fs.statSync(filePath);
      
      if (stats.mtime < cutoffTime) {
        fs.unlinkSync(filePath);
        deletedCount++;
      }
    }

    res.json({
      success: true,
      message: `Cleaned up ${deletedCount} old clips`,
      deletedCount
    });

  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({ 
      error: 'Failed to cleanup clips',
      message: error.message 
    });
  }
});

// Generate presigned URL for secure sharing
router.get('/share/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const { expires = 3600 } = req.query; // Default 1 hour expiration
    
    const processor = new VideoProcessor();
    const cloudPath = `clips/clip_${clipId}.mp4`;
    
    try {
      // Check if file exists in cloud storage
      const fileExists = await processor.cloudStorage.fileExists(cloudPath);
      if (!fileExists) {
        // Fallback to local file streaming
        const localPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
        if (fs.existsSync(localPath)) {
          return res.json({
            success: true,
            shareUrl: `/api/clips/stream/${clipId}`,
            provider: 'local',
            expiresAt: null,
            message: 'Serving from local storage'
          });
        }
        return res.status(404).json({ error: 'Clip not found' });
      }
      
      // Generate presigned URL for cloud storage
      const presignedUrl = await processor.getDownloadUrl(cloudPath, parseInt(expires));
      
      res.json({
        success: true,
        shareUrl: presignedUrl,
        provider: processor.cloudStorage.storageProvider,
        expiresAt: new Date(Date.now() + parseInt(expires) * 1000).toISOString(),
        expiresIn: parseInt(expires)
      });
      
    } catch (cloudError) {
      console.warn('Cloud share URL generation failed:', cloudError);
      
      // Fallback to local streaming
      const localPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
      if (fs.existsSync(localPath)) {
        res.json({
          success: true,
          shareUrl: `/api/clips/stream/${clipId}`,
          provider: 'local',
          expiresAt: null,
          message: 'Cloud sharing unavailable, serving from local storage'
        });
      } else {
        res.status(404).json({ error: 'Clip not found' });
      }
    }

  } catch (error) {
    console.error('Share URL generation error:', error);
    res.status(500).json({ 
      error: 'Failed to generate share URL',
      message: error.message 
    });
  }
});

// Get cloud storage status and file info
router.get('/info/:clipId', async (req, res) => {
  try {
    const { clipId } = req.params;
    const processor = new VideoProcessor();
    const cloudPath = `clips/clip_${clipId}.mp4`;
    const localPath = path.join(__dirname, '../uploads/clips', `clip_${clipId}.mp4`);
    
    const info = {
      clipId,
      cloudStorage: {
        enabled: processor.cloudStorage.useCloudStorage,
        provider: processor.cloudStorage.storageProvider
      },
      locations: {
        cloud: null,
        local: null
      }
    };
    
    // Check cloud storage
    if (processor.cloudStorage.useCloudStorage) {
      try {
        const cloudExists = await processor.cloudStorage.fileExists(cloudPath);
        if (cloudExists) {
          const metadata = await processor.cloudStorage.getFileMetadata(cloudPath);
          info.locations.cloud = {
            exists: true,
            path: cloudPath,
            ...metadata
          };
        } else {
          info.locations.cloud = { exists: false };
        }
      } catch (cloudError) {
        info.locations.cloud = { exists: false, error: cloudError.message };
      }
    }
    
    // Check local storage
    if (fs.existsSync(localPath)) {
      const stats = fs.statSync(localPath);
      info.locations.local = {
        exists: true,
        path: localPath,
        size: stats.size,
        lastModified: stats.mtime
      };
    } else {
      info.locations.local = { exists: false };
    }
    
    res.json({
      success: true,
      ...info
    });

  } catch (error) {
    console.error('File info error:', error);
    res.status(500).json({ 
      error: 'Failed to get file info',
      message: error.message 
    });
  }
});

module.exports = router;
