#!/bin/sh

npm run build
tar -czf dist.tar.gz dist
scp dist.tar.gz alakajam@alakajam.com:/var/www/alakajam/dist.tar.gz

# Manual actions on the server, as alakajam

# tar -xzf dist.tar.gz
# pm2 restart alakajam
