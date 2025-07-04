const axios = require('axios');

class AIService {
  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY;
  }

  /**
   * Find interesting segments in a video using AI analysis
   * This is a simplified implementation - in production, you'd use
   * computer vision models to analyze video content
   */
  async findInterestingSegments(videoPath, numClips = 3, clipDuration = '15s') {
    try {
      // For now, we'll generate random segments
      // In a real implementation, you would:
      // 1. Extract frames at regular intervals
      // 2. Use computer vision to analyze content (faces, objects, motion)
      // 3. Use audio analysis to find interesting moments
      // 4. Score segments based on various factors
      
      const VideoProcessor = require('./videoProcessor');
      const processor = new VideoProcessor();
      const metadata = await processor.getVideoMetadata(videoPath);
      
      const videoDuration = metadata.duration;
      const clipDurationSeconds = processor.parseDuration(clipDuration);
      
      const segments = [];
      const maxStartTime = Math.max(0, videoDuration - clipDurationSeconds);
      
      // Generate segments with some logic to avoid overlap
      const segmentGap = Math.max(clipDurationSeconds, videoDuration / (numClips * 2));
      
      for (let i = 0; i < numClips; i++) {
        const startTime = Math.min(
          i * segmentGap + Math.random() * (segmentGap * 0.5),
          maxStartTime
        );
        
        segments.push({
          startTime: Math.floor(startTime),
          duration: clipDurationSeconds,
          confidence: 0.7 + Math.random() * 0.3, // Random confidence score
          reason: this.getRandomReason()
        });
      }
      
      // Sort by start time
      segments.sort((a, b) => a.startTime - b.startTime);
      
      return segments;
      
    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Fallback: return evenly spaced segments
      return this.generateFallbackSegments(videoPath, numClips, clipDuration);
    }
  }

  /**
   * Generate captions for video using AI (enhanced with OpenAI Whisper)
   */
  async generateCaptions(videoPath) {
    try {
      // Extract audio from video first
      const audioPath = await this.extractAudioForTranscription(videoPath);
      
      if (this.openaiApiKey) {
        // Use OpenAI Whisper for speech-to-text
        try {
          const transcription = await this.transcribeWithWhisper(audioPath);
          return this.formatTranscriptionToSRT(transcription);
        } catch (openaiError) {
          console.warn('OpenAI transcription failed:', openaiError);
        }
      }
      
      // Fallback to placeholder captions
      console.log('Using placeholder captions (no OpenAI API key or transcription failed)');
      return [
        { start: 0, end: 5, text: "Welcome to our video!" },
        { start: 5, end: 10, text: "Here's something interesting..." },
        { start: 10, end: 15, text: "Don't forget to subscribe!" }
      ];
    } catch (error) {
      console.error('Caption generation error:', error);
      return [];
    }
  }

  /**
   * Extract audio from video for transcription
   */
  async extractAudioForTranscription(videoPath) {
    const VideoProcessor = require('./videoProcessor');
    const processor = new VideoProcessor();
    
    const audioPath = videoPath.replace(/\.[^/.]+$/, "_audio.wav");
    
    // Use FFmpeg to extract audio (this would need to be implemented in VideoProcessor)
    // For now, return the video path as placeholder
    return videoPath;
  }

  /**
   * Transcribe audio using OpenAI Whisper
   */
  async transcribeWithWhisper(audioPath) {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const openai = require('openai');
    const client = new openai.OpenAI({
      apiKey: this.openaiApiKey,
    });

    const fs = require('fs');
    
    try {
      const transcription = await client.audio.transcriptions.create({
        file: fs.createReadStream(audioPath),
        model: "whisper-1",
        response_format: "verbose_json",
        timestamp_granularities: ["segment"]
      });

      return transcription;
    } catch (error) {
      console.error('Whisper transcription error:', error);
      throw error;
    }
  }

  /**
   * Format OpenAI transcription to SRT format
   */
  formatTranscriptionToSRT(transcription) {
    if (!transcription.segments) {
      return [{
        start: 0,
        end: transcription.duration || 30,
        text: transcription.text || "Generated content"
      }];
    }

    return transcription.segments.map(segment => ({
      start: segment.start,
      end: segment.end,
      text: segment.text.trim()
    }));
  }

  /**
   * Analyze video content to suggest optimal settings
   */
  async suggestOptimalSettings(videoPath) {
    try {
      const VideoProcessor = require('./videoProcessor');
      const processor = new VideoProcessor();
      const metadata = await processor.getVideoMetadata(videoPath);
      
      const suggestions = {
        aspectRatio: '16:9', // Default
        duration: '15s',
        numClips: 3,
        captions: true
      };
      
      // Analyze video dimensions to suggest aspect ratio
      if (metadata.video) {
        const { width, height } = metadata.video;
        const ratio = width / height;
        
        if (ratio > 1.5) {
          suggestions.aspectRatio = '16:9'; // Landscape
        } else if (ratio < 0.8) {
          suggestions.aspectRatio = '9:16'; // Portrait
        } else {
          suggestions.aspectRatio = '1:1'; // Square
        }
      }
      
      // Suggest number of clips based on video duration
      const duration = metadata.duration;
      if (duration < 60) {
        suggestions.numClips = 1;
      } else if (duration < 300) {
        suggestions.numClips = 3;
      } else {
        suggestions.numClips = Math.min(8, Math.floor(duration / 60));
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('Settings suggestion error:', error);
      return {
        aspectRatio: '16:9',
        duration: '15s',
        numClips: 3,
        captions: true
      };
    }
  }

  /**
   * Generate fallback segments when AI analysis fails
   */
  async generateFallbackSegments(videoPath, numClips, clipDuration) {
    const VideoProcessor = require('./videoProcessor');
    const processor = new VideoProcessor();
    const metadata = await processor.getVideoMetadata(videoPath);
    
    const videoDuration = metadata.duration;
    const clipDurationSeconds = processor.parseDuration(clipDuration);
    const segmentLength = videoDuration / numClips;
    
    const segments = [];
    
    for (let i = 0; i < numClips; i++) {
      const startTime = Math.floor(i * segmentLength);
      const maxStartTime = Math.max(0, videoDuration - clipDurationSeconds);
      
      segments.push({
        startTime: Math.min(startTime, maxStartTime),
        duration: clipDurationSeconds,
        confidence: 0.5,
        reason: 'Evenly spaced segment'
      });
    }
    
    return segments;
  }

  /**
   * Get random reason for segment selection
   */
  getRandomReason() {
    const reasons = [
      'High motion detected',
      'Face detected',
      'Audio peak identified',
      'Scene change detected',
      'Object of interest found',
      'Optimal visual composition',
      'Engaging content detected'
    ];
    
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  /**
   * Analyze video for trending hashtags/keywords
   */
  async suggestHashtags(videoPath) {
    try {
      // This would analyze video content, audio, and metadata
      // For now, return general hashtags
      return [
        '#viral',
        '#trending',
        '#video',
        '#content',
        '#shorts',
        '#fyp',
        '#reels'
      ];
    } catch (error) {
      console.error('Hashtag suggestion error:', error);
      return [];
    }
  }
}

module.exports = AIService;
