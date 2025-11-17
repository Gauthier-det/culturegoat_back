#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
BACKUP_DIR="./backups"
DATE=$(date +"%Y%m%d_%H%M%S")
DB_MODE=${DB_MODE:-POSTGRES}

echo "============================================"
echo "💾 CultureGoat - Backup Script"
echo "============================================"
echo ""

# Créer le dossier de backup
mkdir -p $BACKUP_DIR

# Charger les variables d'environnement
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo -e "${RED}❌ Fichier .env introuvable${NC}"
    exit 1
fi

echo -e "${BLUE}📍 Mode base de données: $DB_MODE${NC}"

# Backup selon le type de BDD
if [ "$DB_MODE" = "POSTGRES" ]; then
    echo "Backup PostgreSQL..."
    BACKUP_FILE="$BACKUP_DIR/culturegoat_${DATE}.sql"
    
    # Extraire les infos de connexion de DB_HOST_PG
    # Format: postgresql://user:pass@host:port/dbname
    
    pg_dump $DB_HOST_PG > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup créé: $BACKUP_FILE${NC}"
        
        # Compresser le backup
        gzip $BACKUP_FILE
        echo -e "${GREEN}✅ Backup compressé: ${BACKUP_FILE}.gz${NC}"
    else
        echo -e "${RED}❌ Erreur lors du backup${NC}"
        exit 1
    fi
    
elif [ "$DB_MODE" = "MYSQL" ]; then
    echo "Backup MySQL..."
    BACKUP_FILE="$BACKUP_DIR/culturegoat_${DATE}.sql"
    
    mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_FILE
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Backup créé: $BACKUP_FILE${NC}"
        
        # Compresser le backup
        gzip $BACKUP_FILE
        echo -e "${GREEN}✅ Backup compressé: ${BACKUP_FILE}.gz${NC}"
    else
        echo -e "${RED}❌ Erreur lors du backup${NC}"
        exit 1
    fi
else
    echo -e "${RED}❌ DB_MODE inconnu: $DB_MODE${NC}"
    exit 1
fi

# Nettoyer les backups de plus de 7 jours
echo ""
echo "🧹 Nettoyage des anciens backups (>7 jours)..."
find $BACKUP_DIR -name "*.sql.gz" -mtime +7 -delete
echo -e "${GREEN}✅ Nettoyage terminé${NC}"

echo ""
echo "============================================"
echo -e "${GREEN}✅ Backup terminé${NC}"
echo "============================================"
echo ""
echo "Fichier: ${BACKUP_FILE}.gz"
echo "Taille: $(du -h ${BACKUP_FILE}.gz | cut -f1)"
echo ""
