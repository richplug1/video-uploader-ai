const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const VideoProcessor = require('../services/videoProcessor');

const router = express.Router();

// Configure multer for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads/videos');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueId = uuidv4();
    const extension = path.extname(file.originalname);
    cb(null, `${uniqueId}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video files are allowed!'), false);
    }
  }
});

// Upload video endpoint with cloud storage integration
router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No video file provided' });
    }

    const processor = new VideoProcessor();
    
    try {
      // Process and upload video with metadata and cloud storage
      const processResult = await processor.processAndUploadVideo(req.file.path, req.file.filename);
      
      const videoData = {
        id: uuidv4(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        localPath: req.file.path,
        cloudUrl: processResult.url,
        cloudPath: processResult.cloudPath,
        provider: processResult.provider,
        size: req.file.size,
        metadata: processResult.metadata,
        uploadedAt: new Date().toISOString(),
        processedAt: processResult.processedAt
      };

      // Clean up local file if uploaded to cloud
      if (processResult.provider !== 'local' && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log(`Local video file cleaned up: ${req.file.path}`);
        videoData.localPath = null;
      }

      res.json({
        success: true,
        message: 'Video uploaded and processed successfully',
        video: videoData
      });

    } catch (processingError) {
      console.warn('Processing/upload failed, keeping local file:', processingError);
      
      // Fallback to local storage with basic metadata
      const videoData = {
        id: uuidv4(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        localPath: req.file.path,
        cloudUrl: null,
        cloudPath: null,
        provider: 'local',
        size: req.file.size,
        uploadedAt: new Date().toISOString(),
        error: processingError.message
      };

      try {
        const metadata = await processor.getVideoMetadata(req.file.path);
        videoData.metadata = metadata;
      } catch (metadataError) {
        console.warn('Could not extract metadata:', metadataError);
        videoData.metadata = null;
      }

      res.json({
        success: true,
        message: 'Video uploaded locally (cloud upload failed)',
        video: videoData,
        warning: 'Cloud storage upload failed, video stored locally'
      });
    }

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      error: 'Failed to upload video',
      message: error.message 
    });
  }
});

// Get video info endpoint
router.get('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    
    // In a real app, you'd fetch this from a database
    const videoPath = path.join(__dirname, '../uploads/videos', `${videoId}.mp4`);
    
    if (!fs.existsSync(videoPath)) {
      return res.status(404).json({ error: 'Video not found' });
    }

    const processor = new VideoProcessor();
    const metadata = await processor.getVideoMetadata(videoPath);

    res.json({
      success: true,
      video: {
        id: videoId,
        metadata
      }
    });

  } catch (error) {
    console.error('Get video error:', error);
    res.status(500).json({ 
      error: 'Failed to get video info',
      message: error.message 
    });
  }
});

// Delete video endpoint
router.delete('/:videoId', async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoPath = path.join(__dirname, '../uploads/videos', `${videoId}.mp4`);
    
    if (fs.existsSync(videoPath)) {
      fs.unlinkSync(videoPath);
    }

    res.json({
      success: true,
      message: 'Video deleted successfully'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({ 
      error: 'Failed to delete video',
      message: error.message 
    });
  }
});

module.exports = router;
