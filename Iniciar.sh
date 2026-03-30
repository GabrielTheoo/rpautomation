#!/bin/bash
cd "$(dirname "$0")"
echo ""
echo " =========================================="
echo "       RPAutomation | Sistema Anne"
echo " =========================================="
echo ""
if ! command -v node &> /dev/null; then
    echo " [ERRO] Node.js nao encontrado."
    echo " Instale em: https://nodejs.org"
    exit 1
fi
echo " [OK] Node.js $(node -v)"
if [ ! -d "node_modules" ]; then
    echo " [..] Instalando dependencias..."
    npm install || exit 1
fi
if [ ! -d ".next" ]; then
    echo " [..] Compilando..."
    npm run build || exit 1
fi
(sleep 4 && open http://localhost:3000 2>/dev/null || xdg-open http://localhost:3000 2>/dev/null) &
echo " PRONTO! Acesse: http://localhost:3000"
npm start