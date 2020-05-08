"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const amqp = require("amqplib");
const config_1 = require("./lib/config");
const callback_1 = require("./lib/callback");
const non_secure_1 = require("nanoid/non-secure");
console.info('>> DeBaDe AMQP Trigger <<');
async function run() {
    console.info(`connecting to ${config_1.default.server}...`);
    try {
        const conn = await amqp.connect(config_1.default.server);
        console.info('connected.');
        conn
            .on('close', () => {
            console.info('connection was closed.');
            setTimeout(run, 5000);
        })
            .on('error', (e) => {
            console.error('error: ', (e === null || e === void 0 ? void 0 : e.message) || String(e));
        });
        (config_1.default.subscribers || []).forEach(async ({ exchange, type, routing_keys, callbacks }) => {
            type = type || 'fanout';
            routing_keys = routing_keys || [''];
            const channel = await conn.createChannel();
            const queue = non_secure_1.nanoid();
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
                    console.debug(`<< message from ${tag} len=${data.length}`);
                    Promise.all(callbacks.map((options) => callback_1.default(data, options))).finally(() => {
                        channel.ack(message);
                    });
                });
            }
            catch (e) {
                console.error((e === null || e === void 0 ? void 0 : e.message) || String(e));
            }
        });
    }
    catch (e) {
        console.error('error: ', (e === null || e === void 0 ? void 0 : e.message) || String(e));
        setTimeout(run, 5000);
    }
}
run();
