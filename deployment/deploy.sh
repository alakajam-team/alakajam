#!/bin/sh

# This temporary script lets you do a build from your machine before deploying it to the server.
# Prerequisite: add your personal SSH key to Alakajam's authorized_keys

npm run build
tar -czf dist.tar.gz dist
scp dist.tar.gz alakajam@alakajam.com:/var/www/alakajam/dist.tar.gz
echo "Archive created."
echo "If package.json has changed, don't forget to do a 'npm install'."
echo "If static files have changed, don't forget to do a 'git pull'."

# Manual actions on the server, as alakajam
# > tar -xzf dist.tar.gz && rm dist.tar.gz && pm2 restart alakajam
