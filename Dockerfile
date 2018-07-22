FROM node:6

#============================================
 # Google Chrome 
#============================================ 
ARG CHROME_VERSION="google-chrome-stable"
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - \
  && echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list \
  && apt-get update -qqy \
  && apt-get -qqy install \
    ${CHROME_VERSION:-google-chrome-stable} \
  && rm /etc/apt/sources.list.d/google-chrome.list \
  && rm -rf /var/lib/apt/lists/* /var/cache/apt/*

#================== 
# Chrome driver 
#================== 
#ARG CHROME_DRIVER_VERSION="latest"
#RUN CD_VERSION=$(if [ ${CHROME_DRIVER_VERSION:-latest} = "latest" ]; then echo $(wget -qO- https://#chromedriver.storage.googleapis.com/LATEST_RELEASE); else echo $CHROME_DRIVER_VERSION; fi) \
#  && echo "Using chromedriver version: "$CD_VERSION \
#  && wget --no-verbose -O /tmp/chromedriver_linux64.zip https://chromedriver.storage.googleapis.com/#$CD_VERSION/chromedriver_linux64.zip \
#  && rm -rf /opt/selenium/chromedriver \
#  && unzip /tmp/chromedriver_linux64.zip -d /opt/selenium \
#  && rm /tmp/chromedriver_linux64.zip \
#  && mv /opt/selenium/chromedriver /opt/selenium/chromedriver-$CD_VERSION \
#  && chmod 755 /opt/selenium/chromedriver-$CD_VERSION \
#  && sudo ln -fs /opt/selenium/chromedriver-$CD_VERSION /usr/bin/chromedriver

#COPY generate_config /opt/bin/generate_config


#==================

run npm install -g bower

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
run bower install --allow-root


CMD ["echo", "well done Y"]


