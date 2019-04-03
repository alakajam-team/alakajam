#!/bin/sh

cd `dirname $0`
cd ../..

# Kill previously running server
cat server.pid | xargs kill -TERM

# Update sources and reset data
rm -r data
git checkout -- .
git pull
npm install

# Build server
tsc

# Start new server
node dist/server/index.ts > server.log 1>&1 &
echo "Server launched with pid $!"

# Save PID
echo $! > server.pid
