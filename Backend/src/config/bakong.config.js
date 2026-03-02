import bakongConfig from '../../env/bakongConfig.json' with { type: 'json' };

const config = {
    bakong:{
        apiUrl: bakongConfig.BAKONG_API_URL,
        token: bakongConfig.BAKONG_TOKEN,
        accountId: bakongConfig.BAKONG_ACCOUNT_ID,
        merchantName: bakongConfig.BAKONG_MERCHANT_NAME,
        merchantCity: bakongConfig.BAKONG_MERCHANT_CITY,
        qrExpirationSeconds: bakongConfig.BAKONG_QR_EXPIRATION_SECONDS || 300,
        pollIntervalMs: bakongConfig.BAKONG_POLL_INTERVAL_MS || 5000,
    }
}


/* Checking accountId, bakong token debugs if not found bakongConfig.json */
if(!config.bakong.accountId){
    console.log('Bakong accountId is not found in bakongConfig.json');
}

if(!config.bakong.token){
    console.log('Bakong token is not found!');
}