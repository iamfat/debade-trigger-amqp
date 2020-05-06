"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const cross_fetch_1 = require("cross-fetch");
exports.default = async (data, { type, url, secret, method }) => {
    if (type === 'jsonrpc') {
        try {
            const param0 = JSON.parse(data);
            const body = Buffer.from(JSON.stringify({
                jsonrpc: '2.0',
                method: method,
                params: [param0],
            }), 'utf8');
            await cross_fetch_1.default(url, {
                method: 'POST',
                headers: {
                    'X-DeBaDe-Token': crypto_1.createHmac('sha1', String(secret)).update(body).digest('base64'),
                },
                body,
            });
        }
        catch (_a) { }
    }
    else if (type === 'rest') {
        const body = Buffer.from(data, 'utf8');
        try {
            await cross_fetch_1.default(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json;charset=UTF-8',
                    'X-DeBaDe-Token': crypto_1.createHmac('sha1', String(secret)).update(body).digest('base64'),
                },
                body,
            });
        }
        catch (_b) { }
    }
};
