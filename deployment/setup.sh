#!/bin/bash
set -e
set -u


# This script assumes a Debian server. The main steps it does not cover are:
# - Setting up the PostgreSQL database & configuration
# - Setting up the Apache sites configuration
# - Installing and configuring nvm & pm2
# - Configuring the site itself in config.js


# Variables.
ADMINS=${ADMINS:-$USER}
if [[ -z "${SSH_PORT:-}" ]]; then echo "Please set SSH_PORT"; exit 1; fi
SMTP_ENABLED=${SMTP_ENABLED:-0}


echo -e "Welcome to the Alakajam server initialisation script!\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllccclllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllc:;;;;:cllllllllllllllllllll\n
lllllllllllllllllllllllllllllccc:::::::::::::cccllc::lolcc;;::clllllllllllllllll\n
lllllllllllllllllllllllllllcc:::::::::::::::::::cc;,:oOxdl;,,,:lllllllllllllllll\n
llllllllllllllllllllllllllc:::cccllllllllllllc:;::,';cllc:,,,,:lllllllllllllllll\n
lllllllllllllllllllllllcc::::cclllooooooooolllc:::;,;:cccc;,,,:lllllllllllllllll\n
llllllllllllllllllllllc::;:ccllloolllllccccllllccc::::cccc:,,,:lllllllllllllllll\n
lllllllllllllllllllcc::::cclllooolc::;;,,,,,;;:cclc::::;,,;:clllllllllllllllllll\n
lllllllllllllllolc::::cclllollollc;,,''''''''',;;:::::;;,';cclllllllllllllllllll\n
lllllllllllllllolc;;:clllooooool:;'''''','',,,,,,,;:::;;,';cclllllllllllllllllll\n
lllllllllllllllll:;::clllllllool:;'''',;:;;;;;;,'';:::;,,';clollllllllllllllllll\n
llllllllllllllccc:::cllcccccclllc:;,,,:looooloc;;,;c::;;,';clollllllllllllllllll\n
llllllllllllllc:;:clllc::;codxdollcclldO0OOOOOxol:cc::;,,';clollllllllllllllllll\n
llllllllllllllc:;:lllc::::oO00kdollldxOKXXKXXXOxolc:ccc:;,;clollllllllllllllllll\n
llllllllllllllc::clllc::::dO0OxdolcclokKKKKKKKkdl:::coxo:,;cllllllllllllllllllll\n
llllllllllllllcccc:ccc::::lodolllc:ccldkkkkkkkdlc:codk0xl;;cllllllllllllllllllll\n
lllllllllllllllllc:::ccc:;;;::;;;;:::cloooooooc:::cdkO0xl;;cllllllllllllllllllll\n
llllllllllllllllllcclllc:;;:::;;;;:::ccccccccc::;;:cccl:;,;cllllllllllllllllllll\n
llllllllllllllllllllllc::;::::;;;;::cccccccccc:;;;;;;;;,,';cllllllllllllllllllll\n
llllllllllllllllllllllccc:::::;;;;:ccccccccccc:;;;:::::;,';cllllllllllllllllllll\n
llllllllllllllllllllllllllc::;;;::cclllccccccc:::;:ccc:;;';cllllllllllllllllllll\n
llllllllllllllllllllllllllc:;;::cclllollcccccc::;;;;;::;,';cclllllllllllllllllll\n
llllllllllllllllllllllllllc:;:cclclollollc::::::;;,,,,,,'';cclllllllllllllllllll\n
llllllllllllllllllllllllccc::colcccollool:;;:::::::;,,'''';cclllllllllllllllllll\n
llllllllllllllllllllllcc:::::clllccllllll:;:::c::::;,,'''';cllllllllllllllllllll\n
llllllllllllllllllllllc::;;:::cclllllolcc::::::::::;,''''';cllllllllllllllllllll\n
llllllllllllllllllllllcc:;;:;;;:cclllolccc::::;;;:;;;,'',,;cclllllllllllllllllll\n
lllllllllllllllllllllllllccccccccc::::::::::ccccccccccccccclllllllllllllllllllll\n
lllllllllllllllllllllllllllllllllllcccccccclllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
llllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllllll\n
"


echo "Creating admin users: $ADMINS"
for admin in $ADMINS; do
  adduser $admin
  usermod -aG sudo $admin
done


# Install and configure ufw.
echo "Installing and configuring firewall"
echo "Installing ufw"
sudo apt update
sudo apt install --yes ufw
sudo ufw allow OpenSSH
sudo ufw allow ssh
sudo ufw allow "$SSH_PORT/tcp" # SSH
sudo ufw allow 80/tcp # HTTP
sudo ufw allow 443/tcp # SSL
if $SMTP_ENABLED; then
  sudo ufw allow 25/tcp
fi
sudo ufw show added
sudo ufw enable
sudo ufw status
echo "Firewall configured"


# Reconfigure SSH:
# - change the default port (an easy way to cut down brute force attempts);
# - prevent root login (sudoers can still `su - root`);
# - turn OFF password authentication (only public key auth permitted).
echo "Reconfiguring SSH"
sshd_config=/etc/ssh/sshd_config
sudo cp "$sshd_config" "$sshd_config.bak"
sudo cat "$sshd_config.bak" | sed \
  -e "s/^#Port 22/Port $SSH_PORT/" \
  -e "s/^PermitRootLogin yes/PermitRootLogin no/" \
  -e "s/^PasswordAuthentication yes/PasswordAuthentication no/" \
  > "$sshd_config"
echo "Restarting sshd"
sudo service sshd restart


# Configure timezones (this requires some manual interaction).
sudo dpkg-reconfigure tzdata


# Configure NTP.
sudo apt-get install ntp


# General dependencies
sudo apt-get install man-db git vim apache2 make gcc g++ python2.7 postgresql borgbackup
sudo a2enmod headers proxy proxy_http reqtimeout rewrite ssl proxy_wstunnel
sudo service apache2 restart
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.37.2/install.sh | bash
nvm install 14


# Add Alakajam! user
adduser alakajam
usermod -aG www-data $admin
mkdir -p /var/www/alakajam
cd /var/www/alakajam
git clone https://github.com/alakajam-team/alakajam.git
chown -R alakajam:alakajam /var/www


# Certbot
apt-get install snapd
sudo snap install core
sudo snap refresh core
sudo snap install --classic certbot
sudo ln -s /snap/bin/certbot /usr/bin/certbot


echo "All done."
echo ""
echo "IMPORTANT:"
echo "I recommend trying to SSH in from a different terminal, to verify that"
echo "you still have access to the machine. DO NOT close this terminal until"
echo "you have done so!"
echo ""
echo "When that's complete, you should run"
echo ""
echo "  sudo shutdown --reboot"
echo ""
echo "to ensure all changes take effect."

