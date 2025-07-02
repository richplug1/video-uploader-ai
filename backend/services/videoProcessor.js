const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const CloudStorageService = require('./cloudStorage');

// Set the path to the static ffmpeg and ffprobe binaries
ffmpeg.setFfmpegPath(ffmpegStatic);
ffmpeg.setFfprobePath(ffprobeStatic.path);

class VideoProcessor {
  constructor() {
    this.aspectRatios = {
      '16:9': { width: 1920, height: 1080 },
      '9:16': { width: 1080, height: 1920 },
      '1:1': { width: 1080, height: 1080 }
    };
    this.cloudStorage = new CloudStorageService();
  }

  /**
   * Get video metadata
   */
  async getVideoMetadata(videoPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .ffprobe((err, metadata) => {
          if (err) {
            reject(err);
          } else {
            const videoStream = metadata.streams.find(stream => stream.codec_type === 'video');
            const audioStream = metadata.streams.find(stream => stream.codec_type === 'audio');
            
            resolve({
              duration: parseFloat(metadata.format.duration),
              size: parseInt(metadata.format.size),
              bitrate: parseInt(metadata.format.bit_rate),
              video: videoStream ? {
                codec: videoStream.codec_name,
                width: videoStream.width,
                height: videoStream.height,
                frameRate: eval(videoStream.r_frame_rate),
                aspectRatio: `${videoStream.width}:${videoStream.height}`
              } : null,
              audio: audioStream ? {
                codec: audioStream.codec_name,
                sampleRate: audioStream.sample_rate,
                channels: audioStream.channels
              } : null
            });
          }
        });
    });
  }

  /**
   * Generate a clip from video
   */
  async generateClip({ inputPath, outputPath, startTime, duration, aspectRatio = '16:9', addCaptions = false, captionOptions = {} }) {
    const targetDimensions = this.parseAspectRatio(aspectRatio);
    
    // Parse duration (e.g., "15s", "1m", "30")
    const durationSeconds = this.parseDuration(duration);
    
    // Calculate aspect ratio value for FFmpeg
    const aspectRatioValue = targetDimensions.width / targetDimensions.height;
    
    // Create temporary clip without captions first
    const tempOutputPath = addCaptions ? outputPath.replace('.mp4', '_temp.mp4') : outputPath;
    
    const clipPromise = new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath)
        .seekInput(startTime)
        .duration(durationSeconds)
        .size(`${targetDimensions.width}x${targetDimensions.height}`)
        .aspect(aspectRatioValue)
        .autopad(true, 'black')  // Add padding if needed to maintain aspect ratio
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart'
        ]);

      command
        .output(tempOutputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg command:', commandLine);
        })
        .on('progress', (progress) => {
          console.log('Processing:', progress.percent + '% done');
        })
        .on('end', () => {
          console.log('Clip generation completed');
          resolve(tempOutputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg error:', err);
          reject(err);
        })
        .run();
    });

    const clipPath = await clipPromise;

    // Add captions if requested
    if (addCaptions) {
      try {
        await this.addCaptions(clipPath, outputPath, {
          generateAutoCaption: true,
          ...captionOptions
        });
        
        // Clean up temporary file
        if (fs.existsSync(clipPath)) {
          fs.unlinkSync(clipPath);
        }
        
        return outputPath;
      } catch (captionError) {
        console.warn('Failed to add captions:', captionError);
        // If caption generation fails, return the clip without captions
        if (fs.existsSync(clipPath) && clipPath !== outputPath) {
          fs.renameSync(clipPath, outputPath);
        }
        return outputPath;
      }
    }

    return clipPath;
  }

  /**
   * Extract thumbnails from video
   */
  async extractThumbnails(videoPath, outputDir, count = 5) {
    return new Promise((resolve, reject) => {
      ffmpeg(videoPath)
        .screenshots({
          count: count,
          folder: outputDir,
          filename: 'thumbnail-%i.png',
          size: '320x240'
        })
        .on('end', () => {
          const thumbnails = [];
          for (let i = 1; i <= count; i++) {
            thumbnails.push(`${outputDir}/thumbnail-${i}.png`);
          }
          resolve(thumbnails);
        })
        .on('error', (err) => {
          reject(err);
        });
    });
  }

  /**
   * Parse duration string to seconds
   */
  parseDuration(duration) {
    if (typeof duration === 'number') {
      return duration;
    }

    if (typeof duration === 'string') {
      const match = duration.match(/^(\d+)([smh]?)$/);
      if (match) {
        const value = parseInt(match[1]);
        const unit = match[2] || 's';
        
        switch (unit) {
          case 's': return value;
          case 'm': return value * 60;
          case 'h': return value * 3600;
          default: return value;
        }
      }
    }

    return 15; // Default to 15 seconds
  }

  /**
   * Convert video to different format
   */
  async convertVideo(inputPath, outputPath, format = 'mp4') {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .format(format)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions(['-preset fast', '-crf 23'])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  /**
   * Add watermark to video
   */
  async addWatermark(inputPath, outputPath, watermarkPath, position = 'bottom-right') {
    return new Promise((resolve, reject) => {
      let overlayFilter;
      
      switch (position) {
        case 'top-left':
          overlayFilter = '10:10';
          break;
        case 'top-right':
          overlayFilter = 'main_w-overlay_w-10:10';
          break;
        case 'bottom-left':
          overlayFilter = '10:main_h-overlay_h-10';
          break;
        case 'bottom-right':
        default:
          overlayFilter = 'main_w-overlay_w-10:main_h-overlay_h-10';
          break;
      }

      ffmpeg(inputPath)
        .input(watermarkPath)
        .complexFilter([
          `[0:v][1:v] overlay=${overlayFilter}`
        ])
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  /**
   * Add captions/subtitles to video
   */
  async addCaptions(inputPath, outputPath, captionsOptions = {}) {
    const {
      subtitlesFile,
      generateAutoCaption = false,
      fontSize = 24,
      fontColor = 'white',
      fontFamily = 'Arial',
      position = 'bottom'
    } = captionsOptions;

    return new Promise((resolve, reject) => {
      let command = ffmpeg(inputPath);

      if (subtitlesFile && fs.existsSync(subtitlesFile)) {
        // Use provided subtitles file
        command = command.outputOptions('-vf', `subtitles=${subtitlesFile}:force_style='Fontsize=${fontSize},PrimaryColour=&H${fontColor === 'white' ? 'ffffff' : '000000'}&'`);
      } else if (generateAutoCaption) {
        // Generate auto captions (basic implementation)
        // In a real application, you would use a speech-to-text service like OpenAI Whisper
        command = command.outputOptions('-vf', `drawtext=text='Auto-generated captions':fontfile=/System/Library/Fonts/Arial.ttf:fontsize=${fontSize}:fontcolor=${fontColor}:x=(w-text_w)/2:y=h-text_h-10`);
      } else {
        // Add a simple watermark or timestamp as placeholder
        command = command.outputOptions('-vf', `drawtext=text='Video Clip %{pts\\:hms}':fontsize=${fontSize}:fontcolor=${fontColor}:x=10:y=h-text_h-10`);
      }

      command
        .output(outputPath)
        .on('end', () => resolve(outputPath))
        .on('error', reject)
        .run();
    });
  }

  /**
   * Generate simple SRT subtitles for a clip
   */
  generateSimpleSubtitles(duration, text = 'Generated Video Clip') {
    const srtContent = `1
00:00:00,000 --> ${this.formatSRTTime(duration * 1000)}
${text}

`;
    return srtContent;
  }

  /**
   * Format time for SRT format (HH:MM:SS,mmm)
   */
  formatSRTTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const ms = milliseconds % 1000;
    
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Calculate optimal start time for clip based on index and settings
   */
  calculateStartTime(index, totalClips, videoDuration, clipDuration) {
    // Ensure we don't go beyond video duration
    const maxStartTime = Math.max(0, videoDuration - clipDuration);
    
    if (totalClips === 1) {
      // For single clip, start from middle third of video
      return Math.min(videoDuration * 0.3, maxStartTime);
    }
    
    // For multiple clips, distribute evenly across video
    const segmentLength = videoDuration / totalClips;
    const baseStartTime = index * segmentLength;
    
    // Add some randomness to avoid predictable cuts
    const randomOffset = (Math.random() - 0.5) * (segmentLength * 0.2);
    const startTime = Math.max(0, baseStartTime + randomOffset);
    
    return Math.min(startTime, maxStartTime);
  }

  /**
   * Parse aspect ratio string or number to FFmpeg filter
   */
  parseAspectRatio(aspectRatio) {
    // Handle numeric aspect ratios
    if (typeof aspectRatio === 'number') {
      if (Math.abs(aspectRatio - 16/9) < 0.1) {
        return this.aspectRatios['16:9'];
      } else if (Math.abs(aspectRatio - 9/16) < 0.1) {
        return this.aspectRatios['9:16'];
      } else if (Math.abs(aspectRatio - 1) < 0.1) {
        return this.aspectRatios['1:1'];
      } else {
        // Calculate dimensions for custom aspect ratio
        const width = 1920;
        const height = Math.round(width / aspectRatio);
        return { width, height };
      }
    }

    // Handle string aspect ratios (legacy support)
    const dimensions = this.aspectRatios[aspectRatio];
    if (!dimensions) {
      return { width: 1920, height: 1080 }; // Default to 16:9
    }
    return dimensions;
  }

  /**
   * Generate clips with enhanced logic
   */
  async generateMultipleClips({ inputPath, outputDir, settings }) {
    const { numClips, duration, aspectRatio, captions, captionOptions } = settings;
    
    // Get video metadata first
    const metadata = await this.getVideoMetadata(inputPath);
    const videoDuration = metadata.duration;
    const clipDurationSeconds = this.parseDuration(duration);
    
    if (videoDuration < clipDurationSeconds) {
      throw new Error('Video is shorter than requested clip duration');
    }

    const clips = [];
    const promises = [];

    for (let i = 0; i < numClips; i++) {
      const clipId = uuidv4();
      const clipFilename = `clip_${clipId}.mp4`;
      const outputPath = path.join(outputDir, clipFilename);
      
      const startTime = this.calculateStartTime(
        i, 
        numClips, 
        videoDuration, 
        clipDurationSeconds
      );

      const clipPromise = this.generateClip({
        inputPath,
        outputPath,
        startTime,
        duration: clipDurationSeconds,
        aspectRatio,
        addCaptions: captions,
        captionOptions: captionOptions || {}
      }).then(() => {
        clips.push({
          id: clipId,
          filename: clipFilename,
          path: outputPath,
          startTime,
          duration: clipDurationSeconds,
          aspectRatio,
          captions
        });
      });

      promises.push(clipPromise);
    }

    await Promise.all(promises);
    
    // Sort clips by start time
    clips.sort((a, b) => a.startTime - b.startTime);
    
    return clips;
  }

  /**
   * Edit clip duration
   */
  async editClipDuration({ inputPath, outputPath, newDuration }) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .duration(newDuration)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg edit duration command:', commandLine);
        })
        .on('end', () => {
          console.log('Duration edit completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg duration edit error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Remove captions from video
   */
  async removeCaptions(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg remove captions command:', commandLine);
        })
        .on('end', () => {
          console.log('Caption removal completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg caption removal error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Change aspect ratio of existing clip
   */
  async changeAspectRatio({ inputPath, outputPath, aspectRatio }) {
    return new Promise((resolve, reject) => {
      const targetDimensions = this.parseAspectRatio(aspectRatio);
      const aspectRatioValue = targetDimensions.width / targetDimensions.height;

      ffmpeg(inputPath)
        .size(`${targetDimensions.width}x${targetDimensions.height}`)
        .aspect(aspectRatioValue)
        .autopad(true, 'black')
        .videoCodec('libx264')
        .audioCodec('aac')
        .outputOptions([
          '-preset fast',
          '-crf 23',
          '-movflags +faststart'
        ])
        .output(outputPath)
        .on('start', (commandLine) => {
          console.log('FFmpeg aspect ratio change command:', commandLine);
        })
        .on('end', () => {
          console.log('Aspect ratio change completed');
          resolve(outputPath);
        })
        .on('error', (err) => {
          console.error('FFmpeg aspect ratio change error:', err);
          reject(err);
        })
        .run();
    });
  }

  /**
   * Upload video to cloud storage and return cloud URL
   */
  async uploadVideoToCloud(localPath, filename) {
    try {
      const cloudFileName = `videos/${filename}`;
      const uploadResult = await this.cloudStorage.uploadFile(localPath, cloudFileName, 'video/mp4');
      
      console.log(`Video uploaded to cloud: ${uploadResult.url}`);
      return uploadResult;
    } catch (error) {
      console.error('Cloud upload error:', error);
      throw new Error(`Failed to upload video to cloud: ${error.message}`);
    }
  }

  /**
   * Upload clip to cloud storage and return cloud URL
   */
  async uploadClipToCloud(localPath, filename) {
    try {
      const cloudFileName = `clips/${filename}`;
      const uploadResult = await this.cloudStorage.uploadFile(localPath, cloudFileName, 'video/mp4');
      
      console.log(`Clip uploaded to cloud: ${uploadResult.url}`);
      return uploadResult;
    } catch (error) {
      console.error('Cloud upload error for clip:', error);
      throw new Error(`Failed to upload clip to cloud: ${error.message}`);
    }
  }

  /**
   * Generate clip with cloud storage integration
   */
  async generateClipWithCloudUpload(options) {
    const localPath = await this.generateClip(options);
    const filename = path.basename(localPath);
    
    try {
      // Upload to cloud storage
      const cloudResult = await this.uploadClipToCloud(localPath, filename);
      
      // Clean up local file if cloud upload is enabled and successful
      if (this.cloudStorage.useCloudStorage && this.cloudStorage.storageProvider !== 'local') {
        if (fs.existsSync(localPath)) {
          fs.unlinkSync(localPath);
          console.log(`Local clip file cleaned up: ${localPath}`);
        }
      }
      
      return {
        localPath: this.cloudStorage.useCloudStorage && this.cloudStorage.storageProvider !== 'local' ? null : localPath,
        cloudUrl: cloudResult.url,
        cloudPath: cloudResult.cloudPath,
        provider: cloudResult.provider,
        filename
      };
    } catch (error) {
      console.error('Cloud upload failed, keeping local file:', error);
      return {
        localPath,
        cloudUrl: null,
        cloudPath: null,
        provider: 'local',
        filename,
        error: error.message
      };
    }
  }

  /**
   * Generate multiple clips with cloud storage integration
   */
  async generateMultipleClipsWithCloudUpload({ inputPath, outputDir, settings }) {
    const { numClips, duration, aspectRatio, captions, captionOptions } = settings;
    
    // Get video metadata first
    const metadata = await this.getVideoMetadata(inputPath);
    const videoDuration = metadata.duration;
    const clipDurationSeconds = this.parseDuration(duration);
    
    if (videoDuration < clipDurationSeconds) {
      throw new Error('Video is shorter than requested clip duration');
    }

    const clips = [];
    const promises = [];

    for (let i = 0; i < numClips; i++) {
      const clipId = uuidv4();
      const clipFilename = `clip_${clipId}.mp4`;
      const outputPath = path.join(outputDir, clipFilename);
      
      const startTime = this.calculateStartTime(
        i, 
        numClips, 
        videoDuration, 
        clipDurationSeconds
      );

      const clipPromise = this.generateClipWithCloudUpload({
        inputPath,
        outputPath,
        startTime,
        duration: clipDurationSeconds,
        aspectRatio,
        addCaptions: captions,
        captionOptions: captionOptions || {}
      }).then((result) => {
        clips.push({
          id: clipId,
          filename: clipFilename,
          localPath: result.localPath,
          cloudUrl: result.cloudUrl,
          cloudPath: result.cloudPath,
          provider: result.provider,
          startTime,
          duration: clipDurationSeconds,
          aspectRatio,
          captions,
          error: result.error || null
        });
      });

      promises.push(clipPromise);
    }

    await Promise.all(promises);
    return clips;
  }

  /**
   * Generate multiple clips with AI-detected segments
   */
  async generateMultipleClipsWithAISegments({ inputPath, outputDir, settings, aiSegments = [] }) {
    const { numClips, duration, aspectRatio, captions, captionOptions } = settings;
    
    // Get video metadata first
    const metadata = await this.getVideoMetadata(inputPath);
    const videoDuration = metadata.duration;
    const clipDurationSeconds = this.parseDuration(duration);
    
    if (videoDuration < clipDurationSeconds) {
      throw new Error('Video is shorter than requested clip duration');
    }

    const clips = [];
    const promises = [];

    // Use AI segments if available, otherwise fall back to regular generation
    const useAISegments = aiSegments && aiSegments.length >= numClips;
    
    for (let i = 0; i < numClips; i++) {
      const clipId = uuidv4();
      const clipFilename = `clip_${clipId}.mp4`;
      const outputPath = path.join(outputDir, clipFilename);
      
      let startTime;
      let confidence = 0.5;
      let reason = 'Standard segment';
      
      if (useAISegments && aiSegments[i]) {
        // Use AI-detected segment
        startTime = aiSegments[i].startTime;
        confidence = aiSegments[i].confidence;
        reason = aiSegments[i].reason;
        console.log(`🤖 Using AI segment ${i + 1}: ${reason} (confidence: ${confidence.toFixed(2)})`);
      } else {
        // Fall back to calculated start time
        startTime = this.calculateStartTime(i, numClips, videoDuration, clipDurationSeconds);
        console.log(`📐 Using calculated segment ${i + 1} at ${startTime}s`);
      }

      const clipPromise = this.generateClipWithCloudUpload({
        inputPath,
        outputPath,
        startTime,
        duration: clipDurationSeconds,
        aspectRatio,
        addCaptions: captions,
        captionOptions: captionOptions || {}
      }).then((result) => {
        clips.push({
          id: clipId,
          filename: clipFilename,
          localPath: result.localPath,
          cloudUrl: result.cloudUrl,
          cloudPath: result.cloudPath,
          provider: result.provider,
          startTime,
          duration: clipDurationSeconds,
          aspectRatio,
          captions,
          aiAnalysis: {
            confidence,
            reason,
            isAIGenerated: useAISegments && aiSegments[i] ? true : false
          },
          error: result.error || null
        });
      });

      promises.push(clipPromise);
    }

    await Promise.all(promises);
    return clips;
  }

  /**
   * Get download URL for cloud-stored file
   */
  async getDownloadUrl(cloudPath, expiresIn = 3600) {
    try {
      return await this.cloudStorage.generatePresignedUrl(cloudPath, expiresIn);
    } catch (error) {
      console.error('Failed to generate download URL:', error);
      throw new Error(`Failed to generate download URL: ${error.message}`);
    }
  }

  /**
   * Delete cloud-stored file
   */
  async deleteCloudFile(cloudPath) {
    try {
      return await this.cloudStorage.deleteFile(cloudPath);
    } catch (error) {
      console.error('Failed to delete cloud file:', error);
      throw new Error(`Failed to delete cloud file: ${error.message}`);
    }
  }

  /**
   * Process and upload video with metadata
   */
  async processAndUploadVideo(localPath, filename) {
    try {
      // Get video metadata
      const metadata = await this.getVideoMetadata(localPath);
      
      // Upload to cloud storage
      const cloudResult = await this.uploadVideoToCloud(localPath, filename);
      
      return {
        ...cloudResult,
        metadata,
        processedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Video processing and upload error:', error);
      throw new Error(`Failed to process and upload video: ${error.message}`);
    }
  }
}

module.exports = VideoProcessor;
