FROM node:6


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


