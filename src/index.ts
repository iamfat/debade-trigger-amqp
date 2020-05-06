import * as amqp from 'amqplib';
import config from './lib/config';
import callback from './lib/callback';

console.info('>> DeBaDe AMQP Trigger <<');

async function run() {
  console.info(`connecting to ${config.server}...`);
  try {
    const conn = await amqp.connect(config.server);

    console.info('connected.');

    conn
      .on('close', () => {
        console.info('connection was closed.');
        setTimeout(run, 5000);
      })
      .on('error', (e) => {
        console.error('error: ', e?.message || String(e));
      });

    (config.subscribers || []).forEach(async ({ exchange, type, routing_keys, callbacks }) => {
      type = type || 'fanout';
      routing_keys = routing_keys || [''];

      const channel = await conn.createChannel();
      await channel.assertExchange(exchange, type, {
        durable: false,
        autoDelete: true,
      });

      const { queue } = await channel.assertQueue('', {
        exclusive: false,
        autoDelete: true,
      });

      await Promise.all(routing_keys.map((routing_key) => channel.bindQueue(queue, exchange, routing_key)));
      await channel.prefetch(1);

      await channel.consume(queue, (message) => {
        const { fields, content } = message;
        const tag = `${fields.exchange}/${fields.routingKey}/${fields.deliveryTag}`;
        const data = content.toString('utf-8');

        console.debug(`<< message from ${tag} len=${data.length}`);
        Promise.all(callbacks.map((options) => callback(data, options))).finally(() => {
          channel.ack(message);
        });
      });
    });
  } catch (e) {
    console.error('error: ', e?.message || String(e));
    setTimeout(run, 5000);
  }
}

run();
