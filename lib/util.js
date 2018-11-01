const crypto = require('crypto');
const parseString = require('xml2js').parseString;
const request = require('request');
const algorithm = 'des-ede3';
const autopad = false;

exports.normalize = data => Object.keys(data).sort().map(k => `${k}=${data[k]}`).join('&');

exports.hash = (str, al = 'md5') => {
  const hash = crypto.createHash(al);
  hash.update(str, 'utf8');
  return hash.digest('hex');
};

exports.parseXml = data => new Promise((resolve, reject) => {
  parseString(data, { trim: true, explicitArray: false, explicitRoot: false }, (err, rs) => {
    if (err) {
      reject(err);
      return;
    }
    resolve(rs);
    return;
  });
});

const flush = (cipher, buf) => {
  const arr = [];
  arr.push(cipher.update(buf));
  arr.push(cipher.final());
  return Buffer.concat(arr);
};
const toBuffer = (text, encode = 'utf-8') => {
  if (text instanceof Buffer) {
    return text;
  }
  const str = text.toString();
  return Buffer.from(str, encode);
};

const _padText = (text) => {
  const buf = toBuffer(text);
  const len = buf.length;
  const mod = (len + 4) % 8;
  let nfb;
  if (mod === 0) {
    nfb = Buffer.alloc(len + 4);
  } else {
    nfb = Buffer.alloc(len + 4 + (8 - mod));
  }
  nfb.writeInt32BE(len, 0);
  buf.copy(nfb, 4, 0, len);
  return nfb;
};
const _rText = (buf) => {
  const datasize = buf.readInt32BE(0);
  if (datasize > buf.length - 4) {
    throw new Error('data_length_error');
  }
  const nc = Buffer.alloc(datasize);
  buf.copy(nc, 0, 4, datasize + 4);
  return nc.toString();
}
exports.encryptDES3 = (key, plaintext) => {
  const buf = _padText(plaintext);
  const cipher = crypto.createCipheriv(algorithm, key, new Buffer(0));
  cipher.setAutoPadding(autopad);
  return flush(cipher, buf);
};

exports.dencryptDES3 = (key, data) => {
  const decipher = crypto.createDecipheriv(algorithm, key, new Buffer(0));
  decipher.setAutoPadding(autopad);
  const buf = flush(decipher, data);
  return _rText(buf);
};

exports.xml_post = (url, qs, xml) => new Promise((resolve, reject) => {
  const opt = {
    url,
    qs,
    headers: {
      'content-type': 'application/xml',
    },
    body: xml,
  };
  request.post(opt, (err, resp, body) => {
    if (err) {
      reject(err);
      return;
    }
    if (resp.statusCode !== 200) {
      console.error('request failed [%s]', resp.statusCode);
      console.error(body);
      reject(body);
      return;
    }
    resolve(body);
  });
});

