# Video Uploader AI 🎥✨

Un système cross-platform de téléchargement vidéo avec génération automatique de clips courts par IA. Parfait pour créer du contenu pour les réseaux sociaux comme TikTok, Instagram Reels, et YouTube Shorts.

## ✅ État du Projet - FONCTIONNEL

🎉 **Le projet est maintenant pleinement opérationnel avec toutes les fonctionnalités de base implementées !**

### 🚀 Fonctionnalités Implémentées

#### Interface Web (React/Next.js)
- ✅ **Upload de vidéos** avec barre de progression en temps réel
- ✅ **Génération de clips multiples** avec paramètres configurables  
- ✅ **Interface moderne** avec Tailwind CSS et composants réactifs
- ✅ **Gestion d'erreurs** et feedback utilisateur
- ✅ **Prévisualisation vidéo** et lecture des clips générés
- ✅ **Modal d'édition** pour modifier la durée, sous-titres et format

#### Backend API (Node.js/Express)
- ✅ **API RESTful complète** avec documentation
- ✅ **Traitement vidéo FFmpeg** pour clips professionnels
- ✅ **Support multi-formats** : 16:9, 9:16, 1:1
- ✅ **Génération de sous-titres** automatiques
- ✅ **Stockage cloud** (AWS S3) avec fallback local
- ✅ **URLs presignées** pour partage sécurisé
- ✅ **Gestion avancée des erreurs** et logs détaillés

#### Cloud Storage & CDN
- ✅ **Intégration AWS S3** avec support CloudFront CDN
- ✅ **Mode hybride** local/cloud avec basculement automatique
- ✅ **URLs de partage sécurisées** avec expiration
- ✅ **Nettoyage automatique** des fichiers temporaires
- ✅ **Support multi-provider** (local, S3, Firebase prévu)

#### Tests & Monitoring
- ✅ **Suite de tests complète** pour toutes les fonctionnalités
- ✅ **Health check système** avec monitoring temps réel
- ✅ **Scripts de déploiement** automatisés
- ✅ **Documentation détaillée** du cloud storage

### 🏗️ Architecture Complète

```
Frontend (React/Next.js) 
  │
  │ HTTP Requests
  ▼
Backend API (Node/Express) 
  │
  │ Video Processing
  ▼
FFmpeg Engine
  │
  │ Processed Files
  ▼
Cloud Storage (AWS S3 / Local)
  │
  │ CDN Delivery
  ▼
User Download/Share
```

## 🛠️ Stack Technique

### Frontend (Web)
- **Next.js 14** - Framework React avec SSR
- **React 18** - Interface utilisateur moderne  
- **Tailwind CSS** - Framework CSS utility-first
- **Framer Motion** - Animations fluides
- **Axios** - Client HTTP pour communication API

### Backend
- **Node.js** - Runtime JavaScript
- **Express.js** - Framework web application
- **FFmpeg** - Traitement et manipulation vidéo
- **Multer** - Gestion upload multipart
- **AWS SDK** - Intégration cloud storage S3

### Infrastructure
- **AWS S3** - Stockage cloud évolutif
- **CloudFront CDN** - Distribution de contenu global  
- **Docker** - Conteneurisation (prévu)
- **Monitoring** - Health checks automatisés
- **CORS** - Cross-origin resource sharing
- **Helmet** - Security middleware

### AI & Processing
- **FFmpeg** - Professional video processing
- **OpenAI API** - For content analysis (optional)
- **Computer Vision** - Frame analysis for interesting segment detection

## Project Structure 📁

```
video-uploader-ai/
├── src/                          # Web frontend
│   ├── components/
│   │   └── VideoUploader.jsx     # Main upload component
│   ├── pages/
│   │   ├── index.js              # Home page
│   │   └── _app.js               # App wrapper
│   └── styles/
│       ├── globals.css           # Global styles
│       └── components.css        # Component styles
├── backend/                      # API server
│   ├── routes/
│   │   ├── video.js              # Video upload routes
│   │   └── clips.js              # Clip generation routes
│   ├── services/
│   │   ├── videoProcessor.js     # FFmpeg wrapper
│   │   └── aiService.js          # AI analysis service
│   ├── uploads/                  # File storage
│   └── server.js                 # Express server
├── mobile/                       # React Native app
│   ├── src/
│   │   └── screens/
│   │       └── VideoUploaderScreen.js
│   ├── App.js                    # Main app component
│   └── package.json
├── package.json                  # Web dependencies
└── README.md                     # This file
```

## Quick Start 🏃‍♂️

### Prerequisites
- Node.js (v16+)
- FFmpeg installed on your system
- npm or yarn package manager

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd video-uploader-ai
```

### 2. Install Dependencies

**Web Frontend:**
```bash
npm install
```

**Backend API:**
```bash
cd backend
npm install
```

**Mobile App:**
```bash
cd mobile
npm install
```

### 3. Environment Setup

**Backend Environment:**
```bash
cd backend
cp .env.example .env
# Edit .env with your configuration
```

### 4. Start Development Servers

**Backend API (Terminal 1):**
```bash
cd backend
npm run dev
```

**Web Frontend (Terminal 2):**
```bash
npm run dev
```

**Mobile App (Terminal 3):**
```bash
cd mobile
# For iOS
npm run ios

# For Android
npm run android
```

### 5. Access the Applications
- **Web App**: http://localhost:3000
- **API**: http://localhost:3001
- **Mobile**: Device/Simulator

## Usage Guide 📖

### Web Application

1. **Upload Video**: Click "Upload Video" or drag and drop a video file
2. **Configure Settings**:
   - **Duration**: Choose clip length (15s, 30s, 1m, 2m, 3m, custom)
   - **Aspect Ratio**: Select 16:9 (landscape), 9:16 (portrait), or 1:1 (square)
   - **Number of Clips**: Choose how many clips to generate (1-8)
   - **Captions**: Toggle automatic caption generation
3. **Generate Clips**: Click "Generate Clips" to start AI processing
4. **Download/Share**: Use the action buttons on generated clips

### Mobile Application

1. **Select Video**: Tap "Select Video" to choose from device library
2. **Upload & Process**: Tap "Upload & Process" to begin
3. **Monitor Progress**: Watch the upload progress bar
4. **View Results**: Browse generated clips in the clips section
5. **Share/Download**: Use action buttons to share or save clips

### API Endpoints

**Upload Video:**
```http
POST /api/video/upload
Content-Type: multipart/form-data
Body: { video: file }
```

**Generate Clips:**
```http
POST /api/clips/generate
Content-Type: application/json
Body: {
  "videoPath": "/path/to/video.mp4",
  "settings": {
    "duration": "15s",
    "aspectRatio": "16:9",
    "numClips": 3,
    "captions": true
  }
}
```

**Download Clip:**
```http
GET /api/clips/download/:clipId
```

## Configuration ⚙️

### Video Processing Settings

The system supports various video processing options:

```javascript
// Duration formats
"15s"     // 15 seconds
"1m"      // 1 minute
"2m30s"   // 2 minutes 30 seconds
30        // 30 seconds (number)

// Aspect ratios
"16:9"    // Landscape (1920x1080)
"9:16"    // Portrait (1080x1920)
"1:1"     // Square (1080x1080)

// Quality settings (backend)
{
  preset: 'fast',     // Encoding speed
  crf: 23,           // Quality (lower = better)
  bitrate: '2M'      // Target bitrate
}
```

### Environment Variables

**Backend (.env):**
```env
PORT=3001
NODE_ENV=development
FRONTEND_URL=http://localhost:3000
MAX_FILE_SIZE=500MB
FFMPEG_PATH=/usr/local/bin/ffmpeg
```

**Frontend (next.config.js):**
```javascript
env: {
  BACKEND_URL: 'http://localhost:3001'
}
```

## Deployment 🚀

### Web Application (Vercel)

1. **Deploy to Vercel:**
```bash
npm install -g vercel
vercel
```

2. **Environment Variables:**
   - Set `BACKEND_URL` to your backend API URL

### Backend (Railway/Heroku)

1. **Prepare for deployment:**
```bash
cd backend
# Ensure FFmpeg is available in production
npm run build
```

2. **Deploy to Railway:**
```bash
railway login
railway init
railway up
```

### Mobile Application

**iOS (App Store):**
```bash
cd mobile
cd ios
xcodebuild -workspace VideoUploaderMobile.xcworkspace \
           -scheme VideoUploaderMobile \
           -configuration Release \
           -destination generic/platform=iOS \
           -archivePath VideoUploaderMobile.xcarchive archive
```

**Android (Google Play):**
```bash
cd mobile
cd android
./gradlew assembleRelease
```

## Development 🛠️

### Adding New Features

1. **New Video Processing Option:**
   - Update `backend/services/videoProcessor.js`
   - Add option to frontend settings
   - Update mobile settings panel

2. **New AI Analysis:**
   - Extend `backend/services/aiService.js`
   - Add new analysis parameters
   - Update clip generation logic

3. **New Platform Support:**
   - Create new mobile app (Flutter, Xamarin, etc.)
   - Implement API client
   - Follow existing patterns

### Testing

**Backend Tests:**
```bash
cd backend
npm test
```

**Frontend Tests:**
```bash
npm run test
```

**Mobile Tests:**
```bash
cd mobile
npm test
```

## Troubleshooting 🔧

### Common Issues

1. **FFmpeg not found:**
   ```bash
   # Install FFmpeg
   # macOS
   brew install ffmpeg
   
   # Ubuntu
   sudo apt update
   sudo apt install ffmpeg
   
   # Windows
   # Download from https://ffmpeg.org/download.html
   ```

2. **Large file uploads failing:**
   - Check `MAX_FILE_SIZE` in backend .env
   - Ensure server has sufficient disk space
   - Consider implementing chunked uploads

3. **Mobile build errors:**
   ```bash
   cd mobile
   # Clean and reinstall
   rm -rf node_modules
   npm install
   
   # iOS
   cd ios && pod install
   
   # Android
   cd android && ./gradlew clean
   ```

### Performance Optimization

1. **Video Processing:**
   - Use appropriate FFmpeg presets
   - Implement queue system for concurrent processing
   - Consider GPU acceleration

2. **File Storage:**
   - Implement cloud storage (AWS S3, Google Cloud)
   - Add CDN for clip delivery
   - Implement automatic cleanup

3. **API Response:**
   - Add caching for processed clips
   - Implement pagination for clip lists
   - Use compression for API responses

## Contributing 🤝

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License 📄

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support 💬

- **Documentation**: Check this README and inline code comments
- **Issues**: Create a GitHub issue for bugs or feature requests
- **Discussions**: Use GitHub Discussions for general questions

## Roadmap 🗺️

### Phase 1 (Current)
- ✅ Basic video upload and processing
- ✅ Web and mobile frontends
- ✅ AI-powered clip generation
- ✅ Multiple aspect ratio support

### Phase 2 (Next)
- [ ] Cloud storage integration
- [ ] User authentication and accounts
- [ ] Advanced AI features (sentiment analysis, object detection)
- [ ] Real-time collaboration

### Phase 3 (Future)
- [ ] Live streaming support
- [ ] Advanced editing features
- [ ] Social media direct publishing
- [ ] Analytics dashboard

---

Made with ❤️ for content creators worldwide