#!/bin/sh

cd `dirname $0`

# Kill previously running server
cat server.pid | xargs kill -TERM

# Update sources and reset data
rm -r ../../data
git pull

# Start new server
node ../../server.js > server.log 1>&1 &
echo "Server launched with pid $!"

# Save PID
echo $! > server.pid

