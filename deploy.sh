#!/bin/bash
# xvistoria — Deploy script
# Uso: bash deploy.sh
# Requer: ~/.ssh/hetzner_key configurada

set -e

SERVER="root@46.225.191.114"
KEY="$HOME/.ssh/hetzner_key"
REMOTE_DIR="/opt/xvistoria"
SSH="ssh -i $KEY"
SCP="scp -i $KEY"

echo "==> X Vistoria Deploy"
echo "==> Servidor: $SERVER"
echo ""

# 1. Cria diretório no servidor
echo "[1/5] Criando diretório no servidor..."
$SSH $SERVER "mkdir -p $REMOTE_DIR"

# 2. Copia arquivos
echo "[2/5] Enviando arquivos..."
$SSH $SERVER "mkdir -p $REMOTE_DIR/site"
$SCP schema.sql $SERVER:$REMOTE_DIR/schema.sql
$SCP fix-triggers.sql $SERVER:$REMOTE_DIR/fix-triggers.sql
$SCP docker-compose.yml $SERVER:$REMOTE_DIR/docker-compose.yml
$SCP .env $SERVER:$REMOTE_DIR/.env
$SSH $SERVER "chmod 600 $REMOTE_DIR/.env"
$SCP site/index.html $SERVER:$REMOTE_DIR/site/index.html
$SCP site/contrato.html $SERVER:$REMOTE_DIR/site/contrato.html
$SCP site/logo.png $SERVER:$REMOTE_DIR/site/logo.png
$SCP site/robots.txt $SERVER:$REMOTE_DIR/site/robots.txt
$SCP site/sitemap.xml $SERVER:$REMOTE_DIR/site/sitemap.xml
$SCP site/sitemap-site.xml $SERVER:$REMOTE_DIR/site/sitemap-site.xml

# 3. Copia código (tar+ssh — funciona em Windows Git Bash, WSL, Linux, Mac)
echo "[3/5] Enviando código fonte..."
$SSH $SERVER "mkdir -p $REMOTE_DIR/api $REMOTE_DIR/web $REMOTE_DIR/pwa"

echo "  -> api/"
tar --exclude=node_modules --exclude=dist --exclude=.git -cf - -C api . | \
  $SSH $SERVER "tar xf - -C $REMOTE_DIR/api/"

echo "  -> web/"
tar --exclude=node_modules --exclude=dist --exclude=.git -cf - -C web . | \
  $SSH $SERVER "tar xf - -C $REMOTE_DIR/web/"

echo "  -> pwa/"
tar --exclude=node_modules --exclude=dist --exclude=.git --exclude=android -cf - -C pwa . | \
  $SSH $SERVER "tar xf - -C $REMOTE_DIR/pwa/"

# 4. Build e start no servidor (remove container site antigo se existir)
echo "[4/5] Build e inicialização..."
$SSH $SERVER "cd $REMOTE_DIR && docker stop xvistoria-site 2>/dev/null; docker rm xvistoria-site 2>/dev/null; docker compose build --no-cache && docker compose up -d"

# 5. Status
echo "[5/5] Verificando status..."
$SSH $SERVER "cd $REMOTE_DIR && docker compose ps"

echo ""
echo "==> Deploy concluído!"
echo "==> Home:   https://xvistoria.com.br"
echo "==> Login:  https://xvistoria.com.br/login"
echo "==> API:    https://api.xvistoria.com.br"
echo "==> App:    https://app.xvistoria.com.br"
echo "==> Sindico: https://sindico.xvistoria.com.br"
