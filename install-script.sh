#!/bin/bash
sudo apt-get install python-pip curl
sudo pip install virtualenv
virtualenv ~/.virtualenvs/"$1"
. ~/.virtualenvs/"$1"/bin/activate
pip install -e git+https://github.com/ekalinin/nodeenv.git#egg=nodeenv
nodeenv -p
npm install -g bower
bower install
