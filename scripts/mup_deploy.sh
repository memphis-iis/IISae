#!/bin/sh

# Author : Rusty Haner
# Script follows here:

echo "Starting ISSae Deployment. Please answer the following for congiguration."
echo "This script will also create a public key for your server which will be deleted after for security reasons."
echo "Previous keys on this vagrant box will be lost."
echo "Press Enter to Continue or CTRL+C to quit."
read CONTINUE
echo "Author's Gmail <yourname@gmail.com>"
read OWNER_GMAIL
echo "Target URL (http://oji.com)"
read TARGET_URL
echo "Target Server IP (xxx.xxx.xxx.xxx):"
read TARGET_IP
echo "Target Server Username:"
read TARGET_USERNAME

echo "Installing Meteor Up."
npm install mup -g

echo "Deleting previous Meteor Up settings.json."
rm -rf ~/issae/IISAE/.deploy/settings.json

echo "Writing new Meteor Up settings.json."
touch ~/issae/IISAE/.deploy/settings.json

echo "{
    \"public\":{
        \"authors\":[\"$OWNER_GMAIL\"]
    }
}" > ~/iisae/IISAE/.deploy/settings.json

echo "DONE with writing settings.json."

echo "Deleting SSH Keys"
rm -rf ~/.ssh/id_rsa

echo "Creating SSH Key. Press Enter 3 times."
ssh-keygen

echo "Copying SSH Keys to Server"
eval `ssh-agent -s`
ssh-copy-id -i ~/.ssh/id_rsa $TARGET_USERNAME@$TARGET_IP

echo "Setting up server permissions. You might have to type in the root password a lot."
echo "This includes allowing automatic sudo for sudoers in /etc/sudoers. Please be advised."
OUTPUT="%sudo ALL=(ALL) NOPASSWD:ALL"
ssh -t $TARGET_USERNAME@$TARGET_IP "sudo adduser "$TARGET_USERNAME" sudo;
sudo sh -c \"echo '%sudo ALL=(ALL) NOPASSWD:ALL' >> /etc/sudoers\""


echo "DELETING old mup.js."
rm -rf ~/oji/oji/.deploy/mup.js

echo "module.exports = {
  servers: {
    one: {
      host: '"$TARGET_IP"',
      username: '"$TARGET_USERNAME"',
      pem: '~/.ssh/id_rsa'
    }
  },
  app: {
    name: 'Oji',
    path: '../',
    docker: {
      image: 'zodern/meteor:root',
    },
    servers: {
      one: {}
    },
    buildOptions: {
      serverOnly: true
    },
    env: {
      ROOT_URL: '"$TARGET_URL"',
      MONGO_URL: 'mongodb://localhost:27017/oji',
      PORT: 80
    }
  },
  mongo: {
    version: '4.2.0',
    servers: {
      one: {}
    }
  }
};" > ~/issae/IISAE/.deploy/mup.js

echo "DONE with writing mup.js."

echo "Ready to Configure Meteor Server. Enter to continue, CTRL+C to abort."
read CONTINUE
cd ~/issae/IISAE/.deploy
mup setup

echo "Ready to Deploy. Enter to continue, CTRL+C to abort."
read CONTINUE
mup deploy

echo "Deployed at http://$TARGET_IP/"