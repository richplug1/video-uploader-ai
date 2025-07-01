import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  StatusBar,
} from 'react-native';
import DocumentPicker from 'react-native-document-picker';
import Video from 'react-native-video';
import { Progress } from 'react-native-progress';
import Toast from 'react-native-toast-message';
import Icon from 'react-native-vector-icons/MaterialIcons';

const VideoUploaderScreen = () => {
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [clips, setClips] = useState([]);
  const [settings, setSettings] = useState({
    duration: '15s',
    aspectRatio: '16:9',
    numClips: 1,
    captions: true,
  });

  const selectVideo = async () => {
    try {
      const result = await DocumentPicker.pickSingle({
        type: DocumentPicker.types.video,
        copyTo: 'documentDirectory',
      });

      setSelectedVideo(result);
      Toast.show({
        type: 'success',
        text1: 'Video Selected',
        text2: 'Ready to upload and process',
      });
    } catch (error) {
      if (!DocumentPicker.isCancel(error)) {
        Alert.alert('Error', 'Failed to select video');
      }
    }
  };

  const uploadVideo = async () => {
    if (!selectedVideo) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 1) {
            clearInterval(progressInterval);
            return 1;
          }
          return prev + 0.1;
        });
      }, 200);

      // In a real app, you'd upload to your backend here
      await new Promise(resolve => setTimeout(resolve, 2000));

      clearInterval(progressInterval);
      setUploadProgress(1);
      
      Toast.show({
        type: 'success',
        text1: 'Upload Complete',
        text2: 'Video uploaded successfully',
      });
      
      generateClips();
    } catch (error) {
      Alert.alert('Error', 'Failed to upload video');
    } finally {
      setIsUploading(false);
    }
  };

  const generateClips = async () => {
    try {
      // Simulate clip generation
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const mockClips = [
        {
          id: 1,
          url: selectedVideo?.uri,
          duration: settings.duration,
          captions: settings.captions,
        },
      ];
      
      setClips(mockClips);
      
      Toast.show({
        type: 'success',
        text1: 'Clips Generated',
        text2: `${mockClips.length} clips ready for download`,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to generate clips');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Video Uploader AI</Text>
          <Text style={styles.subtitle}>
            Upload videos and generate engaging short clips
          </Text>
        </View>

        {/* Upload Section */}
        <View style={styles.uploadSection}>
          {!selectedVideo ? (
            <TouchableOpacity style={styles.uploadButton} onPress={selectVideo}>
              <Icon name="cloud-upload" size={48} color="#3b82f6" />
              <Text style={styles.uploadButtonText}>Select Video</Text>
              <Text style={styles.uploadSubtext}>
                Choose a video from your device
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.videoPreview}>
              <Video
                source={{ uri: selectedVideo.uri }}
                style={styles.video}
                controls={true}
                resizeMode="contain"
                paused={true}
              />
              <Text style={styles.videoName} numberOfLines={1}>
                {selectedVideo.name}
              </Text>
              
              {!isUploading && uploadProgress === 0 && (
                <TouchableOpacity 
                  style={styles.processButton} 
                  onPress={uploadVideo}
                >
                  <Text style={styles.processButtonText}>
                    Upload & Process
                  </Text>
                </TouchableOpacity>
              )}
              
              {isUploading && (
                <View style={styles.progressContainer}>
                  <Progress.Bar 
                    progress={uploadProgress} 
                    width={200} 
                    color="#3b82f6"
                    unfilledColor="#e5e7eb"
                    borderWidth={0}
                    height={8}
                  />
                  <Text style={styles.progressText}>
                    {Math.round(uploadProgress * 100)}% uploaded
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>

        {/* Settings Panel */}
        <View style={styles.settingsPanel}>
          <Text style={styles.sectionTitle}>Clip Settings</Text>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Duration</Text>
            <TouchableOpacity style={styles.settingValue}>
              <Text>{settings.duration}</Text>
              <Icon name="keyboard-arrow-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Aspect Ratio</Text>
            <TouchableOpacity style={styles.settingValue}>
              <Text>{settings.aspectRatio}</Text>
              <Icon name="keyboard-arrow-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Number of Clips</Text>
            <TouchableOpacity style={styles.settingValue}>
              <Text>{settings.numClips}</Text>
              <Icon name="keyboard-arrow-down" size={20} color="#666" />
            </TouchableOpacity>
          </View>
          
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>Captions</Text>
            <TouchableOpacity 
              style={[
                styles.toggleSwitch, 
                settings.captions && styles.toggleSwitchActive
              ]}
              onPress={() => setSettings(prev => ({
                ...prev, 
                captions: !prev.captions
              }))}
            >
              <View style={[
                styles.toggleThumb,
                settings.captions && styles.toggleThumbActive
              ]} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Generated Clips */}
        {clips.length > 0 && (
          <View style={styles.clipsSection}>
            <Text style={styles.sectionTitle}>Generated Clips</Text>
            
            {clips.map(clip => (
              <View key={clip.id} style={styles.clipCard}>
                <Video
                  source={{ uri: clip.url }}
                  style={styles.clipVideo}
                  controls={true}
                  resizeMode="contain"
                  paused={true}
                />
                
                <View style={styles.clipMeta}>
                  <Text style={styles.clipDuration}>
                    Duration: {clip.duration}
                  </Text>
                  <Text style={styles.clipCaptions}>
                    Captions: {clip.captions ? 'ON' : 'OFF'}
                  </Text>
                </View>
                
                <View style={styles.clipActions}>
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="download" size={20} color="#3b82f6" />
                    <Text style={styles.actionText}>Download</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="share" size={20} color="#3b82f6" />
                    <Text style={styles.actionText}>Share</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="edit" size={20} color="#3b82f6" />
                    <Text style={styles.actionText}>Edit</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity style={styles.actionButton}>
                    <Icon name="delete" size={20} color="#ef4444" />
                    <Text style={[styles.actionText, { color: '#ef4444' }]}>
                      Delete
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
      
      <Toast />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 24,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#6b7280',
    textAlign: 'center',
    lineHeight: 24,
  },
  uploadSection: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  uploadButton: {
    alignItems: 'center',
    padding: 32,
    borderWidth: 2,
    borderColor: '#e5e7eb',
    borderStyle: 'dashed',
    borderRadius: 12,
  },
  uploadButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#3b82f6',
    marginTop: 12,
  },
  uploadSubtext: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 4,
  },
  videoPreview: {
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  videoName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
    marginTop: 12,
    marginBottom: 16,
  },
  processButton: {
    backgroundColor: '#10b981',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 8,
  },
  processButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    alignItems: 'center',
    marginTop: 16,
  },
  progressText: {
    fontSize: 14,
    color: '#6b7280',
    marginTop: 8,
  },
  settingsPanel: {
    margin: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: '#374151',
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#f9fafb',
    borderRadius: 6,
  },
  toggleSwitch: {
    width: 48,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#d1d5db',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleSwitchActive: {
    backgroundColor: '#3b82f6',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  clipsSection: {
    margin: 16,
  },
  clipCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  clipVideo: {
    width: '100%',
    height: 180,
    borderRadius: 8,
  },
  clipMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginVertical: 12,
  },
  clipDuration: {
    fontSize: 14,
    color: '#6b7280',
  },
  clipCaptions: {
    fontSize: 14,
    color: '#6b7280',
  },
  clipActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#f3f4f6',
    paddingTop: 12,
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#3b82f6',
    marginTop: 4,
  },
});

export default VideoUploaderScreen;
