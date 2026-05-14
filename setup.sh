#!/bin/bash

echo "╔════════════════════════════════════════════════╗"
echo "║   Former les Formateurs - Configuration       ║"
echo "╚════════════════════════════════════════════════╝"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé!"
    echo "   Téléchargez-le depuis: https://nodejs.org/"
    exit 1
fi

echo "✓ Node.js version: $(node --version)"
echo "✓ npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installation des dépendances..."
npm install

if [ $? -eq 0 ]; then
    echo "✓ Dépendances installées avec succès"
else
    echo "❌ Erreur lors de l'installation des dépendances"
    exit 1
fi

echo ""

# Initialize database
echo "🗄️  Initialisation de la base de données..."
npm run init-db

if [ $? -eq 0 ]; then
    echo "✓ Base de données initialisée"
else
    echo "❌ Erreur lors de l'initialisation de la base de données"
    exit 1
fi

echo ""
echo "╔════════════════════════════════════════════════╗"
echo "║   ✓ Installation terminée avec succès!        ║"
echo "╠════════════════════════════════════════════════╣"
echo "║   Pour démarrer l'application:                 ║"
echo "║   npm start                                    ║"
echo "║                                                ║"
echo "║   Puis ouvrez: http://localhost:3001          ║"
echo "║                                                ║"
echo "║   Comptes par défaut:                          ║"
echo "║   Admin: admin / admin123                      ║"
echo "║   User:  user / user123                        ║"
echo "╚════════════════════════════════════════════════╝"
