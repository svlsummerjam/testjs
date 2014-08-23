#!/bin/bash
sudo apt-get install python-pip curl
sudo pip install virtualenv
virtualenv ~/.virtualenvs/testjs
. ~/.virtualenvs/testjs/bin/activate
pip install -e git+https://github.com/ekalinin/nodeenv.git#egg=nodeenv
nodeenv -p
npm install -g bower
bower install
