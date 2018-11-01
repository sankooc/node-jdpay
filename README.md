## Node for 京东H5支付

### 安装

` npm install jdpay `

### 功能

#### 发起支付

```

const JDpay = require('jdpay');

const desKey = 'xxxxxxxxxx';
const config = {
  privateKey: fs.readFileSync('/config/jd_private.key').toString(),
  publicKey: fs.readFileSync('/config/jd_public.pem').toString(),
  desKey: Buffer.from(desKey, 'base64'),
  merchant: '00000001111',
};
const jpay = new JDpay(config);
const ops = {
  tradeNum: '00000000000001',
  tradeName: 'commodity',
  amount: '100',
  orderType: '0',
  currency: 'CNY',
  callbackUrl: 'http://host/jdpaydemo/showPayPage.htm',
  notifyUrl: 'http://host/asynNotify.htm',
  userId: 'useruserid',
};
const param = await jpay.pay(ops);
console.log(param);

```

### 订单退款

```

const tradeNum = '00000001112';
const oTradeNum = '00000001111';
const amount = '100';
const data = await jpay.refund({ tradeNum, oTradeNum, amount });
const rs = await jpay.parseCallback(data, true);

```

### 订单查询

```
const tradeNum = '00000001111';
const tradeType = '0';
const data = await jpay.query({ tradeNum, tradeType });
const rs = await jpay.parseCallback(data, true);

```

## Doc

请求和响应字段说明参考 [京东开发文档](https://payapi.jd.com/)