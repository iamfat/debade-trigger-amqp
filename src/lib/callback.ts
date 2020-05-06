import { createHmac } from 'crypto';
import fetch from 'cross-fetch';

export default async (data, { type, url, secret, method }) => {
  if (type === 'jsonrpc') {
    try {
      const param0 = JSON.parse(data);
      const body = Buffer.from(
        JSON.stringify({
          jsonrpc: '2.0',
          method: method,
          params: [param0],
        }),
        'utf8',
      );
      await fetch(url, {
        method: 'POST',
        headers: {
          'X-DeBaDe-Token': createHmac('sha1', String(secret)).update(body).digest('base64'),
        },
        body,
      });
    } catch {}
  } else if (type === 'rest') {
    const body = Buffer.from(data, 'utf8');
    try {
      await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json;charset=UTF-8',
          'X-DeBaDe-Token': createHmac('sha1', String(secret)).update(body).digest('base64'),
        },
        body,
      });
    } catch {}
  }
};
