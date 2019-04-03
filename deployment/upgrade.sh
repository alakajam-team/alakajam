#!/bin/sh

git checkout -- package-lock.json
git pull
npm install --production
npm run deployment:build
pm2 restart alakajam
