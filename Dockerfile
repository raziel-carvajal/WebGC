FROM node:6

#==================

#run npm install -g bower

# Install yarn (instead of bower because it's recomended https://bower.io/blog/2017/how-to-migrate-away-from-bower/ )
run apt-get update && apt-get install -y curl apt-transport-https && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y yarn

#run yarn global add bower-away 

workdir /usr/webgc

run apt-get update && \
  apt-get install -y --no-install-recommends python


add examples ./examples
add dist ./dist
add src ./src
add pictures ./pictures
add .gitignore ./
add *.js ./
add bower_components ./bower_components
add *.json ./

#---------------------------------------------------------------
# the follows steps are needed to install dependencies with Yarn
#---------------------------------------------------------------

# First We need to install dependencies with bower
#run bower install --allow-root

# to update the package.json 
#run bower-away --diff && \
 #   bower-away --apply

# Remove old components directory
#run rm -rf bower_components

# install dependencies with Yarn
run yarn

# remove bower.json if still exist
# run rm -rf bower.json

#run bower-away

#run npm install

run apt-get install nano

#run cd /usr/webgc/examples/withNodejs && ./launchTest.sh 1 2
CMD ["echo", "well done Y"]


