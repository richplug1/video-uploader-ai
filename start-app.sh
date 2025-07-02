#!/bin/bash

# Script de démarrage automatique pour l'application Video Uploader AI
echo "🚀 Démarrage de l'application Video Uploader AI..."

# Fonction pour tuer les processus en arrière-plan à la fin
cleanup() {
    echo "🛑 Arrêt des serveurs..."
    pkill -f "node server.js" 2>/dev/null
    pkill -f "next dev" 2>/dev/null
    exit 0
}
trap cleanup SIGINT SIGTERM

# Fonction pour vérifier si un port est occupé
check_port() {
    local port=$1
    if lsof -ti:$port > /dev/null 2>&1; then
        echo "⚠️  Port $port déjà utilisé, arrêt du processus..."
        kill $(lsof -ti:$port) 2>/dev/null
        sleep 2
    fi
}

# Nettoyage des ports
echo "🧹 Nettoyage des ports..."
check_port 3000
check_port 3001

# Installation des dépendances si nécessaire
echo "📦 Vérification des dépendances..."
cd /workspaces/video-uploader-ai
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances frontend..."
    npm install
fi

cd backend
if [ ! -d "node_modules" ]; then
    echo "Installation des dépendances backend..."
    npm install
fi

# Démarrage du backend
echo "🔧 Démarrage du serveur backend sur le port 3001..."
cd /workspaces/video-uploader-ai/backend
node server.js &
BACKEND_PID=$!

# Attendre que le backend démarre
echo "⏳ Attente du démarrage du backend..."
for i in {1..10}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "✅ Backend démarré avec succès !"
        break
    fi
    sleep 1
    echo "   Tentative $i/10..."
done

# Vérification finale du backend
if ! curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
    echo "❌ Échec du démarrage du backend"
    exit 1
fi

# Démarrage du frontend
echo "🎨 Démarrage du serveur frontend sur le port 3000..."
cd /workspaces/video-uploader-ai
npm run dev &
FRONTEND_PID=$!

# Attendre que le frontend démarre
echo "⏳ Attente du démarrage du frontend..."
for i in {1..15}; do
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        echo "✅ Frontend démarré avec succès !"
        break
    fi
    sleep 1
    echo "   Tentative $i/15..."
done

# Test de connectivité finale
echo ""
echo "🧪 Test de connectivité finale..."
if curl -s http://localhost:3001/api/health | grep -q "OK"; then
    echo "✅ Backend API: http://localhost:3001 - FONCTIONNEL"
else
    echo "❌ Backend API: http://localhost:3001 - ERREUR"
fi

if curl -s http://localhost:3000 | grep -q "Video Uploader AI"; then
    echo "✅ Frontend: http://localhost:3000 - FONCTIONNEL"
else
    echo "❌ Frontend: http://localhost:3000 - ERREUR"
fi

echo ""
echo "✅ Application démarrée avec succès !"
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:3001"
echo "📱 Mobile App: cd mobile && npm start"
echo ""
echo "📊 Statut des serveurs:"
echo "   Backend PID: $BACKEND_PID"
echo "   Frontend PID: $FRONTEND_PID"
echo ""
echo "🛑 Appuyez sur Ctrl+C pour arrêter tous les serveurs"

# Attendre indéfiniment (les serveurs tournent en arrière-plan)
wait
