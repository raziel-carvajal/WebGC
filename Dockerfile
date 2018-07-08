FROM colthreepv/node-chrome:latest


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

expose 5001

CMD ["echo", "well done Y"]

#CMD ["/examples/middleware2014/launch.sh", "5", "2", "://localhost:5012"]
