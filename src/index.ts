import minimist from 'minimist';
import amqp from 'amqplib';
import { nanoid } from 'nanoid/non-secure';
import { createHmac } from 'crypto';
import JsonRPC from '@genee/json-rpc';
import fetch from '@genee/fetch';
import Logger from './lib/Logger';
import Config from './lib/Config';

const logger = Logger.of('debade-trigger');

const argv = minimist(process.argv.slice(2));
const config = Config(argv.c || `${process.cwd()}/debade-trigger.yml`);

type Callback = {
  type: 'jsonrpc' | 'rest';
  url: string;
  secret: string;
  method?: string;
}

type Subscriber = {
  exchange: string;
  type: string;
  routing_keys: string[];
  callbacks: Callback[];
}

async function broadcast(subscriber: Subscriber, payload: string) {
  const callbacks: Callback[] = subscriber.callbacks || [];
  return Promise.all(
    callbacks.map(async (hook) => {
          if (hook.type === 'jsonrpc') {
              if (hook.method) {
                  logger.debug(`call ${hook.method} on ${hook.url}`);
                  try {
                      const data = JSON.parse(payload);
                      const rpc = new JsonRPC(async (request) => {
                          try {
                              const body = JSON.stringify(request);
                              await fetch(hook.url, {
                                  method: 'POST',
                                  headers: {
                                      'X-DeBaDe-Token': createHmac('sha1', String(hook.secret))
                                          .update(body, 'utf8')
                                          .digest('base64'),
                                  },
                                  body,
                                  json: true,
                              });
                          } catch (e: any) {
                              logger.warn(`${e.message || String(e)}`);
                          }
                      });
                      rpc.notify(hook.method, [data]);
                  } catch {}
              }
          } else {
              logger.debug(`call ${hook.url}`);
              await fetch(hook.url, {
                  method: 'POST',
                  headers: {
                      'X-DeBaDe-Token': createHmac('sha1', String(hook.secret))
                          .update(payload, 'utf8')
                          .digest('base64'),
                  },
                  body: payload,
                  json: true,
              });
          }
      }),
  );
}


async function main() {
  logger.info(`connecting to ${config.server}...`);
  try {
    const conn = await amqp.connect(config.server);
    logger.info('connected.');

    conn
      .on('close', () => {
        logger.info('connection was closed.');
        setTimeout(main, 5000);
      })
      .on('error', (e) => {
        logger.error('error: ', e?.message || String(e));
      });

    const subscribers: Subscriber[] = config.subscribers || [];
    subscribers.forEach(async (subscriber) => {
      if (!subscriber.exchange) return;

      const exchange = subscriber.exchange;
      const type = subscriber.type || 'fanout';
      const routing_keys = subscriber.routing_keys || [''];

      const channel = await conn.createChannel();
      const queue = nanoid();

      try {
        await Promise.all([
          channel.prefetch(1),
          channel.assertExchange(exchange, type, {
            durable: false,
            autoDelete: true,
          }),
          channel.assertQueue(queue, {
            exclusive: false,
            autoDelete: true,
          }),
        ]);

        await Promise.all(routing_keys.map((routing_key) => channel.bindQueue(queue, exchange, routing_key)));

        await channel.consume(queue, (message) => {
          const { fields, content } = message;
          const tag = `${fields.exchange}/${fields.routingKey}/${fields.deliveryTag}`;
          const data = content.toString('utf-8');
          logger.debug(`<< message from ${tag} len=${data.length}`);
          return broadcast(subscriber, data).finally(() => {
            channel.ack(message);
          });
        });
      } catch (e:any) {
        logger.error(e.message || String(e));
      }
    });
  } catch (e:any) {
    logger.error(e.message || String(e));
    setTimeout(main, 5000);
  }
}

main();
