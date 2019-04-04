#!/bin/sh

PM2_APP_NAME=${1:-alakajam}
echo "Upgrading $PM2_APP_NAME..."

git checkout -- package-lock.json
git fetch
git reset --hard origin
npm install --production
npm run deployment:build
pm2 restart $PM2_APP_NAME
