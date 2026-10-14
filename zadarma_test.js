const crypto = require('crypto');
const https = require('https');

const KEY = 'fb94530cb765f6d212e2';
const SECRET = '20d18884fda09f1f8587';
const method = '/v1/info/balance/';

function getZadarmaSignature(method, params, secret) {
    const sortedKeys = Object.keys(params).sort();
    let queryStr = '';
    sortedKeys.forEach(k => {
        queryStr += k + '=' + encodeURIComponent(params[k]) + '&';
    });
    if (queryStr.length > 0) queryStr = queryStr.slice(0, -1);

    const md5 = crypto.createHash('md5').update(queryStr).digest('hex');
    const data = method + queryStr + md5;
    const signature = crypto.createHmac('sha1', secret).update(data).digest('hex');
    // base64 encoding of hex? Zadarma doc says Base64 of HMAC-SHA1. Wait. Let's check.
    // Actually Zadarma signature is: base64_encode(hash_hmac('sha1', method + params_string + md5(params_string), secret))
    const hmac = crypto.createHmac('sha1', secret).update(data).digest('base64');
    return hmac;
}

const params = {};
const sortedKeys = Object.keys(params).sort();
let queryStr = '';
sortedKeys.forEach(k => {
    queryStr += k + '=' + encodeURIComponent(params[k]) + '&';
});
if (queryStr.length > 0) queryStr = queryStr.slice(0, -1);

const signature = getZadarmaSignature(method, params, SECRET);

const options = {
  hostname: 'api.zadarma.com',
  port: 443,
  path: method + (queryStr ? '?' + queryStr : ''),
  method: 'GET',
  headers: {
    'Authorization': KEY + ':' + signature
  }
};

const req = https.request(options, res => {
  let data = '';
  res.on('data', chunk => { data += chunk; });
  res.on('end', () => { console.log('Response:', data); });
});

req.on('error', e => { console.error('Error:', e); });
req.end();
