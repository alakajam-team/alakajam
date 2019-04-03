#!/bin/sh

git checkout -- package-lock.json
git pull
npm install
npm run production:build
pm2 restart alakajam
