import React, { useState, useRef } from 'react';
import axios from 'axios';

const VideoUploader = () => {
  const [video, setVideo] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [uploadedVideoPath, setUploadedVideoPath] = useState(null);
  const [settings, setSettings] = useState({
    duration: 15,
    aspectRatio: 16/9,
    numClips: 1,
    captions: false,
    captionStyle: {
      fontSize: 24,
      fontColor: 'white',
      position: 'bottom'
    }
  });

  // Duration options with better structure
  const durationOptions = [
    { value: 15, label: '15s' },
    { value: 30, label: '30s' },
    { value: 60, label: '1m' },
    { value: 120, label: '2m' },
    { value: 180, label: '3m' },
    { value: 300, label: '5m' }
  ];

  // Aspect ratio options with numeric values
  const aspectRatios = [
    { value: 16/9, label: '16:9', display: 'Landscape' },
    { value: 9/16, label: '9:16', display: 'Portrait (Stories)' },
    { value: 1, label: '1:1', display: 'Square' }
  ];
  const [clips, setClips] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState(null);
  const [editingClip, setEditingClip] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const fileInputRef = useRef();

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

  // Format duration for display
  const formatDuration = (seconds) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ${seconds % 60}s`;
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours}h ${minutes}m ${secs}s`;
  };

  // Format aspect ratio for display
  const formatAspectRatio = (ratio) => {
    const aspectRatioObj = aspectRatios.find(ar => Math.abs(ar.value - ratio) < 0.01);
    return aspectRatioObj ? aspectRatioObj.label : `${ratio.toFixed(2)}:1`;
  };

  // Get CSS class for aspect ratio
  const getAspectRatioClass = (ratio) => {
    if (Math.abs(ratio - 16/9) < 0.01) return 'landscape';
    if (Math.abs(ratio - 9/16) < 0.01) return 'portrait';
    if (Math.abs(ratio - 1) < 0.01) return 'square';
    return 'landscape'; // default
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('video/')) {
      setVideo(URL.createObjectURL(file));
      setVideoFile(file);
      setError(null);
      
      // Auto-upload the video
      await uploadVideoToServer(file);
    }
  };

  const uploadVideoToServer = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const formData = new FormData();
      formData.append('video', file);

      const response = await axios.post(`${API_BASE_URL}/api/video/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(progress);
        },
      });

      if (response.data.success) {
        setUploadedVideoPath(response.data.video.path);
        console.log('Video uploaded successfully:', response.data.video);
      }
    } catch (error) {
      console.error('Upload error:', error);
      setError('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const generateClips = async () => {
    if (!uploadedVideoPath && !videoFile) {
      setError('Please upload a video first.');
      return;
    }

    setIsGenerating(true);
    setError(null);
    
    try {
      const requestData = {
        videoPath: uploadedVideoPath,
        settings: {
          ...settings,
          numClips: parseInt(settings.numClips),
          captionOptions: settings.captions ? settings.captionStyle : null
        }
      };

      const response = await axios.post(`${API_BASE_URL}/api/clips/generate`, requestData);

      if (response.data.success) {
        const generatedClips = response.data.clips.map(clip => ({
          ...clip,
          url: clip.cloudUrl || `${API_BASE_URL}${clip.url}`,
          // Keep both URLs for flexibility
          localUrl: `${API_BASE_URL}${clip.url}`,
          cloudUrl: clip.cloudUrl
        }));
        setClips(generatedClips);
        console.log('Clips generated successfully:', generatedClips);
        console.log('Cloud storage info:', response.data.cloudStorage);
        
        // Show cloud storage status
        if (response.data.cloudStorage?.enabled) {
          console.log(`Using ${response.data.cloudStorage.provider} cloud storage`);
        }
      }
    } catch (error) {
      console.error('Clip generation error:', error);
      setError('Failed to generate clips. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  // Enhanced share function with cloud storage support
  const shareClip = async (clip) => {
    try {
      // Get share URL (presigned if from cloud storage)
      const response = await axios.get(`${API_BASE_URL}/api/clips/share/${clip.id}`);
      
      if (response.data.success) {
        const shareUrl = response.data.shareUrl;
        const isCloudUrl = response.data.provider !== 'local';
        
        if (navigator.share) {
          try {
            await navigator.share({
              title: 'Generated Video Clip',
              text: `Check out this video clip generated with AI!${isCloudUrl ? ' (Secure link)' : ''}`,
              url: shareUrl,
            });
          } catch (shareError) {
            console.error('Share error:', shareError);
            // Fallback to clipboard
            await copyToClipboard(shareUrl, isCloudUrl);
          }
        } else {
          // Fallback: copy URL to clipboard
          await copyToClipboard(shareUrl, isCloudUrl);
        }
      } else {
        // Fallback to direct clip URL
        const fallbackUrl = clip.cloudUrl || clip.url;
        await copyToClipboard(fallbackUrl, !!clip.cloudUrl);
      }
    } catch (error) {
      console.error('Share URL generation error:', error);
      // Final fallback to clip URL
      const fallbackUrl = clip.cloudUrl || clip.url;
      await copyToClipboard(fallbackUrl, !!clip.cloudUrl);
    }
  };

  const copyToClipboard = async (url, isCloudUrl) => {
    try {
      await navigator.clipboard.writeText(url);
      alert(`Clip URL copied to clipboard!${isCloudUrl ? ' (Secure cloud link)' : ''}`);
    } catch (error) {
      console.error('Clipboard error:', error);
      alert('Could not copy to clipboard. Please copy the URL manually.');
    }
  };

  // Get clip info including cloud storage status
  const getClipInfo = async (clipId) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/api/clips/info/${clipId}`);
      if (response.data.success) {
        return response.data;
      }
    } catch (error) {
      console.error('Failed to get clip info:', error);
    }
    return null;
  };

  // Download with cloud storage support
  const downloadClip = async (clip) => {
    try {
      // If cloud URL is available, use it directly
      if (clip.cloudUrl && clip.provider !== 'local') {
        const link = document.createElement('a');
        link.href = clip.cloudUrl;
        link.setAttribute('download', clip.filename || `clip_${clip.id}.mp4`);
        link.setAttribute('target', '_blank');
        document.body.appendChild(link);
        link.click();
        link.remove();
        return;
      }

      // Fallback to local download endpoint
      const response = await axios.get(`${API_BASE_URL}/api/clips/download/${clip.id}`, {
        responseType: 'blob',
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', clip.filename || `clip_${clip.id}.mp4`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download error:', error);
      setError('Failed to download clip.');
    }
  };

  // Enhanced delete with cloud storage cleanup
  const deleteClip = async (clipId) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/api/clips/${clipId}`);
      
      if (response.data.success) {
        setClips(clips.filter(clip => clip.id !== clipId));
        console.log('Clip deleted successfully:', response.data);
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError('Failed to delete clip.');
    }
  };

  const editClipDuration = async (clipId, newDuration) => {
    setIsEditing(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/clips/edit/${clipId}/duration`, {
        newDuration: parseInt(newDuration)
      });

      if (response.data.success) {
        const editedClip = {
          ...response.data.editedClip,
          url: `${API_BASE_URL}${response.data.editedClip.url}`
        };
        
        // Add edited clip to the list
        setClips(prevClips => [...prevClips, editedClip]);
        console.log('Clip duration edited successfully:', editedClip);
      }
    } catch (error) {
      console.error('Edit duration error:', error);
      setError('Failed to edit clip duration.');
    } finally {
      setIsEditing(false);
    }
  };

  const toggleClipCaptions = async (clipId, currentCaptionState) => {
    setIsEditing(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/clips/edit/${clipId}/captions`, {
        captionsOn: !currentCaptionState,
        captionOptions: settings.captionStyle
      });

      if (response.data.success) {
        const editedClip = {
          ...response.data.editedClip,
          url: `${API_BASE_URL}${response.data.editedClip.url}`
        };
        
        // Add edited clip to the list
        setClips(prevClips => [...prevClips, editedClip]);
        console.log('Clip captions toggled successfully:', editedClip);
      }
    } catch (error) {
      console.error('Toggle captions error:', error);
      setError('Failed to toggle clip captions.');
    } finally {
      setIsEditing(false);
    }
  };

  const changeClipAspectRatio = async (clipId, newAspectRatio) => {
    setIsEditing(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/clips/edit/${clipId}/aspect-ratio`, {
        newAspectRatio: newAspectRatio
      });

      if (response.data.success) {
        const editedClip = {
          ...response.data.editedClip,
          url: `${API_BASE_URL}${response.data.editedClip.url}`
        };
        
        // Add edited clip to the list
        setClips(prevClips => [...prevClips, editedClip]);
        console.log('Clip aspect ratio changed successfully:', editedClip);
      }
    } catch (error) {
      console.error('Change aspect ratio error:', error);
      setError('Failed to change clip aspect ratio.');
    } finally {
      setIsEditing(false);
    }
  };

  // Edit modal component
  const EditClipModal = ({ clip, onClose }) => {
    const [editDuration, setEditDuration] = useState(clip.duration);
    const [editAspectRatio, setEditAspectRatio] = useState(clip.aspectRatio);

    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h3>Edit Clip</h3>
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
          
          <div className="modal-body">
            <div className="edit-section">
              <h4>Duration</h4>
              <div className="edit-group">
                <input 
                  type="number" 
                  value={editDuration}
                  onChange={(e) => setEditDuration(e.target.value)}
                  min="1"
                  max="300"
                />
                <span>seconds</span>
                <button 
                  onClick={() => editClipDuration(clip.id, editDuration)}
                  disabled={isEditing}
                >
                  {isEditing ? 'Applying...' : 'Apply Duration'}
                </button>
              </div>
            </div>

            <div className="edit-section">
              <h4>Aspect Ratio</h4>
              <div className="edit-group">
                <select 
                  value={editAspectRatio}
                  onChange={(e) => setEditAspectRatio(parseFloat(e.target.value))}
                >
                  {aspectRatios.map(ratio => (
                    <option key={ratio.value} value={ratio.value}>
                      {ratio.label} - {ratio.display}
                    </option>
                  ))}
                </select>
                <button 
                  onClick={() => changeClipAspectRatio(clip.id, editAspectRatio)}
                  disabled={isEditing}
                >
                  {isEditing ? 'Applying...' : 'Apply Ratio'}
                </button>
              </div>
            </div>

            <div className="edit-section">
              <h4>Captions</h4>
              <div className="edit-group">
                <button 
                  onClick={() => toggleClipCaptions(clip.id, clip.captions)}
                  disabled={isEditing}
                  className={clip.captions ? 'captions-on' : 'captions-off'}
                >
                  {isEditing ? 'Toggling...' : 
                   clip.captions ? 'Remove Captions' : 'Add Captions'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="video-uploader">
      {/* Error Message */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={() => setError(null)}>×</button>
        </div>
      )}

      {/* Video Upload Section */}
      <div className="upload-section">
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleUpload} 
          ref={fileInputRef}
          hidden
        />
        <button 
          onClick={() => fileInputRef.current.click()}
          disabled={isUploading}
        >
          {isUploading ? 'Uploading...' : 'Upload Video'}
        </button>
        
        {/* Upload Progress */}
        {isUploading && (
          <div className="upload-progress">
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span>{uploadProgress}%</span>
          </div>
        )}
        
        {video && (
          <div className="video-preview">
            <video 
              src={video} 
              controls 
              style={{ width: '100%', maxWidth: '600px' }}
            />
            {uploadedVideoPath && (
              <div className="upload-success">
                ✅ Video uploaded successfully!
              </div>
            )}
          </div>
        )}
      </div>

      {/* Settings Panel */}
      <div className="settings-panel">
        <h3>Clip Settings</h3>
        
        <div className="setting-group">
          <label>Duration:</label>
          <select 
            value={settings.duration}
            onChange={(e) => setSettings({...settings, duration: parseInt(e.target.value)})}
          >
            {durationOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label>Aspect Ratio:</label>
          <select 
            value={settings.aspectRatio}
            onChange={(e) => setSettings({...settings, aspectRatio: parseFloat(e.target.value)})}
          >
            {aspectRatios.map(ratio => (
              <option key={ratio.value} value={ratio.value}>
                {ratio.label} - {ratio.display}
              </option>
            ))}
          </select>
        </div>

        <div className="setting-group">
          <label>Number of Clips (1-8):</label>
          <input 
            type="number" 
            min="1" 
            max="8" 
            value={settings.numClips}
            onChange={(e) => setSettings({...settings, numClips: e.target.value})}
          />
        </div>

        <div className="setting-group">
          <label>Captions:</label>
          <label className="switch">
            <input 
              type="checkbox" 
              checked={settings.captions}
              onChange={(e) => setSettings({...settings, captions: e.target.checked})}
            />
            <span className="slider"></span>
          </label>
        </div>

        {/* Caption Style Options */}
        {settings.captions && (
          <div className="caption-options">
            <h4>Caption Style</h4>
            
            <div className="setting-group">
              <label>Font Size:</label>
              <select 
                value={settings.captionStyle.fontSize}
                onChange={(e) => setSettings({
                  ...settings, 
                  captionStyle: {...settings.captionStyle, fontSize: parseInt(e.target.value)}
                })}
              >
                <option value={16}>Small (16px)</option>
                <option value={20}>Medium (20px)</option>
                <option value={24}>Large (24px)</option>
                <option value={28}>Extra Large (28px)</option>
                <option value={32}>Huge (32px)</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Font Color:</label>
              <select 
                value={settings.captionStyle.fontColor}
                onChange={(e) => setSettings({
                  ...settings, 
                  captionStyle: {...settings.captionStyle, fontColor: e.target.value}
                })}
              >
                <option value="white">White</option>
                <option value="black">Black</option>
                <option value="yellow">Yellow</option>
                <option value="red">Red</option>
                <option value="blue">Blue</option>
              </select>
            </div>

            <div className="setting-group">
              <label>Position:</label>
              <select 
                value={settings.captionStyle.position}
                onChange={(e) => setSettings({
                  ...settings, 
                  captionStyle: {...settings.captionStyle, position: e.target.value}
                })}
              >
                <option value="bottom">Bottom</option>
                <option value="center">Center</option>
                <option value="top">Top</option>
              </select>
            </div>
          </div>
        )}

        <button 
          onClick={generateClips} 
          disabled={!uploadedVideoPath || isGenerating || isUploading}
          className={isGenerating ? 'generating' : ''}
        >
          {isGenerating ? 'Generating Clips...' : 'Generate Clips'}
        </button>
      </div>

      {/* Generated Clips Section */}
      {clips.length > 0 && (
        <div className="clips-section">
          <h3>Generated Clips</h3>
          <div className="clips-grid">
            {clips.map(clip => (
              <div key={clip.id} className={`clip-card ${getAspectRatioClass(clip.aspectRatio)}`}>
                <div className="clip-header">
                  <div className="clip-status">
                    {clip.provider && clip.provider !== 'local' && (
                      <span className="cloud-badge">☁️ Cloud</span>
                    )}
                    {clip.provider === 'local' && (
                      <span className="local-badge">💾 Local</span>
                    )}
                    {clip.error && (
                      <span className="error-badge">⚠️ Error</span>
                    )}
                  </div>
                </div>
                <video src={clip.cloudUrl || clip.url} controls />
                <div className="clip-meta">
                  <span>Duration: {formatDuration(clip.duration)}</span>
                  <span>Start: {formatDuration(clip.startTime)}</span>
                  <span>Ratio: {formatAspectRatio(clip.aspectRatio)}</span>
                  <span>Captions: {clip.captions ? 'ON' : 'OFF'}</span>
                  {clip.provider && (
                    <span>Storage: {clip.provider === 'local' ? 'Local' : clip.provider.toUpperCase()}</span>
                  )}
                </div>
                <div className="clip-actions">
                  <button onClick={() => downloadClip(clip)}>
                    Download
                  </button>
                  <button onClick={() => shareClip(clip)}>
                    Share
                  </button>
                  <button onClick={() => deleteClip(clip.id)}>
                    Delete
                  </button>
                  <button onClick={() => setEditingClip(clip)}>
                    Edit
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Clip Modal */}
      {editingClip && (
        <EditClipModal 
          clip={editingClip} 
          onClose={() => setEditingClip(null)} 
        />
      )}
    </div>
  );
};

export default VideoUploader;
