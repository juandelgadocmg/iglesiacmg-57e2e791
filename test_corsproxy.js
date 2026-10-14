const crypto = require('crypto');
const https = require('https');

const method = '/v1/info/balance/';
const secret = '20d18884fda09f1f8587';
const key = 'fb94530cb765f6d212e2';
const queryStr = '';

const md5 = crypto.createHash('md5').update(queryStr).digest('hex');
const dataToSign = method + queryStr + md5;
const signature = crypto.createHmac('sha1', secret).update(dataToSign).digest('base64');

const targetUrl = encodeURIComponent(`https://api.zadarma.com${method}`);
const proxyUrl = `https://corsproxy.io/?${targetUrl}`;

const options = {
  method: 'GET',
  headers: {
    'Authorization': `${key}:${signature}`
  }
};

https.get(proxyUrl, options, res => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => console.log('Response:', data));
}).on('error', err => console.log('Error:', err));
