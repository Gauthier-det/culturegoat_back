#!/bin/bash

# Couleurs pour l'output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo "🚀 CultureGoat Backend - Setup Script"
echo "============================================"
echo ""

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    echo "Installez Node.js v18+ depuis https://nodejs.org"
    exit 1
fi

NODE_VERSION=$(node -v)
echo -e "${GREEN}✅ Node.js version: $NODE_VERSION${NC}"

# Vérifier npm
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm n'est pas installé${NC}"
    exit 1
fi

NPM_VERSION=$(npm -v)
echo -e "${GREEN}✅ npm version: $NPM_VERSION${NC}"
echo ""

# Installer les dépendances
echo "📦 Installation des dépendances..."
npm install

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Erreur lors de l'installation des dépendances${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dépendances installées${NC}"
echo ""

# Créer le dossier logs
echo "📁 Création du dossier logs..."
mkdir -p logs
touch logs/.gitkeep
echo -e "${GREEN}✅ Dossier logs créé${NC}"
echo ""

# Vérifier le fichier .env
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  Fichier .env manquant${NC}"
    echo "📝 Création d'un fichier .env à partir de .env.example..."
    
    if [ -f .env.example ]; then
        cp .env.example .env
        echo -e "${GREEN}✅ Fichier .env créé${NC}"
        echo -e "${YELLOW}⚠️  IMPORTANT: Éditez le fichier .env avec vos vraies valeurs !${NC}"
        echo ""
        echo "Variables à configurer obligatoirement :"
        echo "  - JWT_SECRET (min 32 caractères)"
        echo "  - ADMIN_PASSWORD"
        echo "  - CREATOR_PASSWORD"
        echo "  - DB_HOST_PG (ou DB_HOST + credentials MySQL)"
        echo ""
    else
        echo -e "${RED}❌ .env.example n'existe pas${NC}"
        exit 1
    fi
else
    echo -e "${GREEN}✅ Fichier .env détecté${NC}"
fi

echo ""
echo "============================================"
echo -e "${GREEN}✅ Setup terminé avec succès !${NC}"
echo "============================================"
echo ""
echo "Prochaines étapes :"
echo "  1. Éditez le fichier .env avec vos valeurs"
echo "  2. Lancez en dev:  npm run dev"
echo "  3. Ou en prod:     npm run pm2:start"
echo ""
