FROM node:12-alpine

ADD dist /opt/debade-trigger
ADD package.json /opt/debade-trigger/package.json

RUN cd /opt/debade-trigger && npm install --production

WORKDIR /opt/debade-trigger

CMD ["/usr/local/bin/node", "index.js", "-c", "/etc/debade/trigger.yml"]