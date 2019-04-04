#!/bin/sh
# Usage: upgrade.sh [pm2 app] [--reset]

cd "$(dirname "$0")/.."

PM2_APP_NAME=${1:-alakajam}

if [ `git rev-parse --abbrev-ref HEAD` != "master" ]; then
  echo "This scripts only supports the server being on the 'master' branch. Please upgrade manually."
  exit 1
fi
exit 0

if [ "${2}" = "--reset" ]; then
  echo "Resetting $PM2_APP_NAME data..."
  rm -rf data
  rm -rf static/uploads
fi

echo "Upgrading $PM2_APP_NAME..."
git checkout -- .
git fetch
git reset --hard origin/master
npm install --production
npm run deployment:build

pm2 restart $PM2_APP_NAME
