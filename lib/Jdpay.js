const { normalize, hash, encryptDES3, dencryptDES3, parseXml, xml_post } = require('./util');
const crypto = require('crypto');
const Builder = require('xml2js').Builder;

const rsaEncrypt = (data, key) => crypto.privateEncrypt({
  key,
  padding: crypto.constants.RSA_PKCS1_PADDING,
}, data);

const rsaDecrypt = (data, key) => crypto.publicDecrypt({
  key,
  padding: crypto.constants.RSA_PKCS1_PADDING,
}, data);

const buildXml = (data) => {
  const builder = new Builder({ rootName: 'jdpay', xmldec: { version: '1.0', encoding: 'UTF-8' }, renderOpts: { newline: '', spacebeforeslash: ' ' } });
  return builder.buildObject(data);
}

class JDpay {
  constructor(config) {
    this.config = config;
  }
  xmlReq(ops, url){
    const { desKey, privateKey, merchant } = this.config;
    const base = {
      version: 'V2.0',
      merchant,
    };
    const xml1 = buildXml(ops);
    const sign = hash(xml1, 'sha256');
    ops.sign = rsaEncrypt(Buffer.from(sign), privateKey).toString('base64');
    const signedXml = buildXml(ops);
    const hex = encryptDES3(desKey, signedXml).toString('hex');
    const encrypt = Buffer.from(hex, 'utf-8').toString('base64');
    const fin = Object.assign({}, base, { encrypt });
    const rs = buildXml(fin);
    return xml_post(url, {}, rs);
  }
  pay(option) {
    const { desKey, privateKey, merchant } = this.config;
    const base = {
      version: 'V2.0',
      merchant,
      amount: '1',
      orderType: '0',
      currency: 'CNY',
    };
    const ops = Object.assign({}, base, option);
    const s1 = normalize(ops);
    const sign = hash(s1, 'sha256');
    const data = rsaEncrypt(Buffer.from(sign), privateKey).toString('base64');
    ops.sign = data;
    for (const k of Object.keys(ops)) {
      switch (k) {
        case 'version':
        case 'merchant':
        case 'sign':
          break;
        default:
          ops[k] = encryptDES3(desKey, ops[k]).toString('hex');
      }
    }
    return ops;
  }
  refund(option) {
    const { merchant } = this.config;
    const url = 'https://paygate.jd.com/service/refund';
    const base = {
      version: 'V2.0',
      merchant,
      currency: 'CNY',
    };
    const ops = Object.assign({}, base, option);
    return this.xmlReq(ops, url);
    // const xml1 = buildXml(ops);
    // const sign = hash(xml1, 'sha256');
    // ops.sign = rsaEncrypt(Buffer.from(sign), privateKey).toString('base64');
    // const signedXml = buildXml(ops);
    // const hex = encryptDES3(desKey, signedXml).toString('hex');
    // const encrypt = Buffer.from(hex, 'utf-8').toString('base64');
    // const fin = Object.assign({}, base, { encrypt });
    // const rs = buildXml(fin);
    // return xml_post(url, {}, rs);
  }
  query(option){
    const { merchant } = this.config;
    const url = 'https://paygate.jd.com/service/query';
    const base = {
      version: 'V2.0',
      merchant,
    };
    const ops = Object.assign({}, base, option);
    return this.xmlReq(ops, url);
  }
  parseCallback(xml, verify) {
    const { desKey, publicKey } = this.config;
    const verifyXml = (inXml) => {
      if(verify){
        const sign_inx = inXml.indexOf('<sign>');
        if(sign_inx >= 0) {
          console.log('do_verify');
          // 奇葩的京东xml
          const linx = inXml.indexOf('</sign>');
          const s1 = inXml.substring(0, sign_inx);
          const s2 = inXml.substring(linx + 7);
          const inSignEnc = inXml.substring(sign_inx + 6, linx);
          const sign_data = Buffer.from(inSignEnc, 'base64');
          const inSign = rsaDecrypt(sign_data, publicKey).toString('utf-8');
          const _sign = hash(s1 + s2, 'sha256');
          if(_sign !== inSign){
            console.error('sign:', inSign);
            throw new Error('京东验签失败');
          }
        } else {
          throw new Error('签名字段不存在');
        }
      }
      return parseXml(inXml);
    }
    const decry = (cdata) => {
      if (cdata.result.code === '000000') {
        const encrypt = cdata.encrypt;
        const raw = Buffer.from(encrypt, 'base64');
        const str = raw.toString('utf-8');
        const data = Buffer.from(str, 'hex');
        const inXml = dencryptDES3(desKey, data);
        return verifyXml(inXml);
      }
      console.log('request_failed');
      console.log(cdata);
      throw new Error('backFaild');
    };
    return parseXml(xml).then(decry);
  }
}
module.exports = JDpay;
