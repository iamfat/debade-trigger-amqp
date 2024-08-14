FROM node:20-alpine

ADD dist /opt/debade-trigger
WORKDIR /opt/debade-trigger

ENTRYPOINT ["/usr/local/bin/node"]
CMD ["index.js", "-c", "/etc/debade/trigger.yml"]