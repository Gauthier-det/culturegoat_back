#!/bin/bash

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "============================================"
echo "🚀 CultureGoat Backend - Deploy Script"
echo "============================================"
echo ""

# Vérifier qu'on est sur la bonne branche
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
echo -e "${BLUE}📍 Branche actuelle: $CURRENT_BRANCH${NC}"

if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo -e "${YELLOW}⚠️  Vous n'êtes pas sur main/master${NC}"
    read -p "Voulez-vous continuer ? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Déploiement annulé"
        exit 1
    fi
fi

# Pull les dernières modifications
echo ""
echo "📥 Récupération des dernières modifications..."
git pull origin $CURRENT_BRANCH

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du git pull${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Code mis à jour${NC}"
echo ""

# Installer/mettre à jour les dépendances
echo "📦 Mise à jour des dépendances..."
npm install --production

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dépendances à jour${NC}"
echo ""

# Vérifier PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}⚠️  PM2 n'est pas installé globalement${NC}"
    echo "Installation de PM2..."
    npm install -g pm2
fi

# Redémarrer l'application avec PM2
echo "🔄 Redémarrage de l'application..."

if pm2 list | grep -q "culturegoat-api"; then
    echo "Application existante détectée, reload..."
    pm2 reload culturegoat-api --update-env
else
    echo "Première installation, start..."
    pm2 start ecosystem.config.js --env production
fi

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors du redémarrage PM2${NC}"
    exit 1
fi

# Sauvegarder la configuration PM2
pm2 save

echo -e "${GREEN}✅ Application redémarrée${NC}"
echo ""

# Afficher les logs
echo "📊 Status de l'application :"
pm2 status

echo ""
echo "============================================"
echo -e "${GREEN}✅ Déploiement terminé avec succès !${NC}"
echo "============================================"
echo ""
echo "Commandes utiles :"
echo "  - Voir les logs:    pm2 logs culturegoat-api"
echo "  - Voir le status:   pm2 status"
echo "  - Redémarrer:       pm2 restart culturegoat-api"
echo "  - Arrêter:          pm2 stop culturegoat-api"
echo ""
