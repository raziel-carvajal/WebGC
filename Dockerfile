FROM node:6
<<<<<<< HEAD


#============================================
 # Google Chrome 
#============================================ 
RUN wget -q -O - https://dl-ssl.google.com/linux/linux_signing_key.pub | apt-key add - && \
    echo "deb http://dl.google.com/linux/chrome/deb/ stable main" >> /etc/apt/sources.list.d/google-chrome.list && \
    apt-get update -qqy && \
    apt-get -qqy install google-chrome-stable && \
    rm /etc/apt/sources.list.d/google-chrome.list && \
    rm -rf /var/lib/apt/lists/* /var/cache/apt/*
#================== 
# Chrome driver 
#================== 

ARG CHROME_DRIVER_VERSION=2.27 RUN wget -O /tmp/chromedriver.zip https://chromedriver.storage.googleapis.com/$CHROME_DRIVER_VERSION/chromedriver_linux64.zip && \
    rm -rf /opt/selenium/chromedriver && \
    unzip /tmp/chromedriver.zip -d /opt/selenium && \
    rm /tmp/chromedriver.zip && \
    mv /opt/selenium/chromedriver /opt/selenium/chromedriver-$CHROME_DRIVER_VERSION && \
    chmod 755 /opt/selenium/chromedriver-$CHROME_DRIVER_VERSION && \
    ln -fs /opt/selenium/chromedriver-$CHROME_DRIVER_VERSION /usr/bin/chromedriver

=======
>>>>>>> 533fbf28bcce9cd938eb54899c7d9377b028c7b5


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
<<<<<<< HEAD
=======


>>>>>>> 533fbf28bcce9cd938eb54899c7d9377b028c7b5
