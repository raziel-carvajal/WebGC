FROM node:6

#============================================
 # Google Chrome 
#============================================ 
#ARG CHROME_VERSION="google-chrome-stable"
#RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-#key add - \
#  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/#sources.list.d/google-chrome.list \
#  && apt-get update -qqy \
#  && apt-get -qqy install \
#    ${CHROME_VERSION:-google-chrome-stable} \
#  && rm /etc/apt/sources.list.d/google-chrome.list \
#  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

#================== 
# Chrome driver 
#================== 
#ARG CHROME_DRIVER_VERSION="latest"
#RUN CD_VERSION=$(if [ ${CHROME_DRIVER_VERSION:-latest} = "latest" ]; then echo #$(wget -qO- https://#chromedriver.storage.googleapis.com/LATEST_RELEASE); else #echo $CHROME_DRIVER_VERSION; fi) \
#  && echo "Using chromedriver version: "$CD_VERSION \
#  && wget --no-verbose -O /tmp/chromedriver_linux64.zip https://#chromedriver.storage.googleapis.com/#$CD_VERSION/chromedriver_linux64.zip \
#  && rm -rf /opt/selenium/chromedriver \
#  && unzip /tmp/chromedriver_linux64.zip -d /opt/selenium \
#  && rm /tmp/chromedriver_linux64.zip \
#  && mv /opt/selenium/chromedriver /opt/selenium/chromedriver-$CD_VERSION \
#  && chmod 755 /opt/selenium/chromedriver-$CD_VERSION \
#  && sudo ln -fs /opt/selenium/chromedriver-$CD_VERSION /usr/bin/chromedriver

#COPY generate_config /opt/bin/generate_config


#==================

run npm install -g bower

# Install yarn (instead of bower because it's recomended https://bower.io/blog/2017/how-to-migrate-away-from-bower/ )
run apt-get update && apt-get install -y curl apt-transport-https && \
    curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add - && \
    echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list && \
    apt-get update && apt-get install -y yarn

run yarn global add bower-away 

workdir /usr/webgc

run apt-get update && \
  apt-get install -y --no-install-recommends python


add examples ./examples
add dist ./dist
add src ./src
add pictures ./pictures
add .gitignore ./
add *.js ./

add *.json ./

#---------------------------------------------------------------
# the follows steps are needed to install dependencies with Yarn
#---------------------------------------------------------------

# First We need to install dependencies with bower
run bower install --allow-root

# to update the package.json 
run bower-away --diff && \
    bower-away --apply

# Remove old components directory
run rm -rf bower_components

# install dependencies with Yarn
run yarn

# remove bower.json if still exist
# run rm -rf bower.json

run bower-away

#run npm install

run apt-get install nano

#run cd /usr/webgc/examples/withNodejs && ./launchTest.sh 1 2
CMD ["echo", "well done Y"]


