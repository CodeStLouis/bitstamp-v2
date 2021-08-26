const express = require('express');
const app = express();
require('dotenv').config()
const { v4: uuidv4 } = require('uuid');
const dotenv = require('dotenv')
const fetch = require("node-fetch");
const taapi = require("taapi");
const Bottleneck = require("bottleneck");
const { $, gt } = require('moneysafe');
const BinanceUS = require('node-binance-us-api');
const { $$, subtractPercent, addPercent } = require('moneysafe/ledger');
const {BitstampStream, Bitstamp, CURRENCY} = require("node-bitstamp");
const key = process.env.key;
const secret = process.env.secret;
const clientId = process.env.clientId
const bitstamp = new Bitstamp({
    key,
    secret,
    clientId,
    timeout: 5000,
    rateLimit: true //turned on by default
});
const binanceUS = new BinanceUS().options({
    APIKEY: 'EvAfOIdc9XQjAKljZrzCVKoGXVtTxpd5nAjmJVQnKy6jsAUDlgRbvLATdTMJbqxo',
    APISECRET: 'ijDMxrLhpPeD3LrV4Sockgcq9g9tCxaUqIkR3vhpRQ1mxUHdCV93J8VttXvIklCO',
    useServerTime: true,
    recvWindow: 60000, // Set a higher recvWindow to increase response timeout
    verbose: true,
});
const limiter = new Bottleneck({
    maxConcurrent: 3,
    minTime: 3000
});
global.bitstampSellData ={
    symbolInTrade:{},
    sellPrice:{},
    sellAmount:{},
    sell:{}
}
global.bitstampBuyData = {
    symbolInTrade:{},
    buyPrice:{},
    buyAmount:{},
    buy:{},
    engulfingBuy:{},
    smaHasCrossedSincePurchase: {}
}
global.binanceData ={
    symbol:{},
    amount:{},
    sellPrice: {},
    buyPrice: {},
    orderType: {},
    buyingPower:{}
}
global.tradeData ={
    symbol:{},
    amount:{},
    open:{},
    close:{},
    sma9:{},
    sar:{},
    smaFiveAboveNine:{},
    engulfedValue:{},
    MACDHistogram:{},
    undersold:{},
    oversold:{},
    stochasticRsiKaboveD:{},
    MACDHasCrossedSinceLastBuy:{},
    UUID:{},
    time:{}
}
global.buyingPower={}
const crypto = [
   'ETH','BTC'
]
const binanceSymbols = [

]
let t = new Date
const rawUtcTimeNow = (Math.floor(t.getTime()))
async function getBinanceBuyingPower(){
    await binanceUS.balance((error, balances) => {
        if (error) return console.error(error, 'in balance why?');
        // console.info("balances()", balances);
        console.info( " buying power on binance ", balances.USD.available);

        global.binanceData.buyingPower = balances.USD.balances
        let amount = +$$(
            $(balances.USD.available),
            subtractPercent(10)).toNumber().toFixed(2)
        global.binanceData.buyingPower = amount
        console.log( 'amount after subtract 10% and dropped decimal to 2 places line 74', amount, balances.USD.available)
    });
}
async function getBinanceBalance(b){
    await binanceUS.balance((error, balances) => {
        if (error) return console.error(error, 'in balance why?',);
        // console.info("balances()", balances);
        console.info(b, " balance: ", balances[b].available);

        global.binanceData.amount = balances[`${b}`]
        let amount = +$$(
            $(balances[b].available),
            subtractPercent(10)).toNumber().toFixed(2)
        console.log(b, 'amount after subtract 10% and dropped decimal to 2 places line 105', amount, balances[b].available)
    });
}
async function getBinanceOrderBook(a){
    const symbolBinance = a +'USD'
    binanceUS.websockets.depthCache([`${symbolBinance}`], (symbol, depth) => {
        let bids = binance.sortBids(depth.bids);
        let asks = binance.sortAsks(depth.asks);
        console.info("best bid: "+binance.first(bids));
        console.info("best ask: "+binance.first(asks));
      //  console.info("last updated: " + new Date(depth.eventTime));
    });
}
async function sellOnBinance(price, currency){
   await getBinanceBalance(currency).then(b =>{
       const quantity = b
       const binanceSymbol = currency + 'USD'
       console.log('placed sell order on binance', binanceSymbol, quantity, price)
         binanceUS.sell(binanceSymbol, quantity, price).then(resp =>{
            console.log('placed sell order on binance', resp)
        })
    })

}
async function buyOnBinance(price, currency){
    let amount = global.binanceData.buyingPower / price
}

async function MACD(cryptoSymbol, interval){
    const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyYW5kb24udHdpdHR5QGNvZGVzdGxvdWlzLmNvbSIsImlhdCI6MTYyNzgzNTAxNCwiZXhwIjo3OTM1MDM1MDE0fQ.xIHv_5dom5WBNjoIHDvKkitZl7P7tErl0boQO-Vl1_g'
    const symbol = cryptoSymbol + '/USDT'
    const requestMACD = await limiter.schedule(() => fetch(
        `https://api.taapi.io/macd?secret=${secret}&exchange=binance&symbol=${symbol}&interval=${interval}`,
    ));
    const macdValue = await requestMACD.json();
    Object.entries(macdValue).forEach(([key, value]) => {
        if (key === 'valueMACDHist' && macdValue.valueMACDHist > 0){
            const MACDHist = macdValue.valueMACDHist

            //   console.log('crypto symbol:', cryptoSymbol, 'MACD = ', MACDPositiveSymbols)
            return MACDHist
        }

    })
   // console.log(symbol,'MACD in function symbol', macdValue.valueMACDHist, macdValue)
    return macdValue.valueMACDHist
}
async function readableTimestamp(timestamp){

    let unix_timestamp = timestamp
// Create a new JavaScript Date object based on the timestamp
// multiplied by 1000 so that the argument is in milliseconds, not seconds.
    var date = new Date(unix_timestamp * 1000);
// Hours part from the timestamp
    var hours = date.getHours();
// Minutes part from the timestamp
    var minutes = "0" + date.getMinutes();
// Seconds part from the timestamp
    var seconds = "0" + date.getSeconds();

// Will display time in 10:30:23 format
    var formattedTime = hours + ':' + minutes.substr(-2) + ':' + seconds.substr(-2);

    console.log(formattedTime, 'inside timestamp function');
}
async function RSI(cryptoSymbol, interval){
    const taapiSymbol = cryptoSymbol + '/USDT'
    //console.log('rsi symbol', taapiSymbol)
    const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyYW5kb24udHdpdHR5QGNvZGVzdGxvdWlzLmNvbSIsImlhdCI6MTYyNzgzNTAxNCwiZXhwIjo3OTM1MDM1MDE0fQ.xIHv_5dom5WBNjoIHDvKkitZl7P7tErl0boQO-Vl1_g'
    const requestRSI = await limiter.schedule(() => fetch(
        `https://api.taapi.io/rsi?secret=${secret}&exchange=binance&symbol=${taapiSymbol}&interval=${interval}`,
    ));
    const rsiValue = await requestRSI.json()
    Object.entries(rsiValue).forEach(([key, value]) => {
        //  console.log('crypto symbol:', cryptoSymbol, 'RSI = ', value.value)
      //  global.bitstampData.undersold = value.value < 35
        //   console.log('in rsi function', interval, ' rsi low =', value.value )
    })
     //console.log(cryptoSymbol,'returned rsi value in function', rsiValue)
    return rsiValue.value
}
async function parabolicSAR(cryptoSymbol, interval){
    const taapiSymbol = cryptoSymbol + '/USDT'
    //console.log('sar symbol', taapiSymbol)
    const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyYW5kb24udHdpdHR5QGNvZGVzdGxvdWlzLmNvbSIsImlhdCI6MTYyNzgzNTAxNCwiZXhwIjo3OTM1MDM1MDE0fQ.xIHv_5dom5WBNjoIHDvKkitZl7P7tErl0boQO-Vl1_g'

    const requestSAR = await limiter.schedule(() => fetch(
        `https://api.taapi.io/sar?secret=${secret}&exchange=binance&symbol=${taapiSymbol}&interval=${interval}`,
    ));
    const SARValue = await requestSAR.json()
    Object.entries(SARValue).forEach(([key, value]) => {
        //  console.log('crypto symbol:', cryptoSymbol, 'RSI = ', value.value)

        //   console.log('in rsi function', interval, ' rsi low =', value.value )
    })
    //console.log(taapiSymbol,'sar value in function =', SARValue.value)

    return SARValue.value
}
async function candles(a, i){
    const taapiSymbol = a + '/USDT'
    //console.log('rsi symbol', taapiSymbol)
    const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyYW5kb24udHdpdHR5QGNvZGVzdGxvdWlzLmNvbSIsImlhdCI6MTYyNzgzNTAxNCwiZXhwIjo3OTM1MDM1MDE0fQ.xIHv_5dom5WBNjoIHDvKkitZl7P7tErl0boQO-Vl1_g'
    // const interval = '1h'
    const requestCandles = await limiter.schedule(() => fetch(
        `https://api.taapi.io/candles?secret=${secret}&exchange=binance&symbol=${taapiSymbol}&interval=${i}`,
    ));
    const candles = await requestCandles.json()
   // console.log(a,'at interval' ,i , 'candles returned from taapi inside function ', candles[candles.length - 1]);

    return candles
}
async function stochRSI(cryptoSymbol, interval){
    const taapiSymbol = cryptoSymbol + '/USDT'
    //console.log('rsi symbol', taapiSymbol)
    const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyYW5kb24udHdpdHR5QGNvZGVzdGxvdWlzLmNvbSIsImlhdCI6MTYyNzgzNTAxNCwiZXhwIjo3OTM1MDM1MDE0fQ.xIHv_5dom5WBNjoIHDvKkitZl7P7tErl0boQO-Vl1_g'
    // const interval = '1h'
    const requestStochRSI = await limiter.schedule(() => fetch(
        `https://api.taapi.io/stochrsi?secret=${secret}&exchange=binance&symbol=${taapiSymbol}&interval=${interval}&kPeriod=3&dPeriod=3`,
    ));
    const stochRsiValue = await requestStochRSI.json()
    Object.entries(stochRsiValue).forEach(([key, value]) => {
        //  console.log('crypto symbol:', cryptoSymbol, 'RSI = ', value.value)

        //   console.log('in rsi function', interval, ' rsi low =', value.value )
    })
    //console.log(taapiSymbol,'returned Stochastic RSI k value =', stochRsiValue.valueFastK, 'd period value =', stochRsiValue.valueFastD)
    return stochRsiValue
}
async function engulfedCandle(cryptoSymbol, interval){
    const symbol = cryptoSymbol + '/USDT'
    const secret = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImJyYW5kb24udHdpdHR5QGNvZGVzdGxvdWlzLmNvbSIsImlhdCI6MTYyNzgzNTAxNCwiZXhwIjo3OTM1MDM1MDE0fQ.xIHv_5dom5WBNjoIHDvKkitZl7P7tErl0boQO-Vl1_g'
    // const interval = '1h'
    const requestIfCandleIsEngulfed = await limiter.schedule(() => fetch(
        `https://api.taapi.io/engulfing?secret=${secret}&exchange=binance&symbol=${symbol}&interval=${interval}`,
    ));
    const engulfedValue = await requestIfCandleIsEngulfed.json()
    /*Object.entries(engulfedValue).forEach(([key, value]) => {
        if (key === 'value' && engulfedValue > 0){
            const MACDHist = engulfedValue

            //   console.log('crypto symbol:', cryptoSymbol, 'MACD = ', MACDPositiveSymbols)
            return engulfedValue
        }

    })*/
    return engulfedValue.value
}
const sma = require('trading-indicator').sma
async function getSMANine(s, i){
    // console.log(s, 'in sma9')
    let usableSymbol = s + '/USDT'
    console.log(usableSymbol, 'in sma9')
    let smaData = await limiter.schedule(() =>sma(30, "close", "binance", usableSymbol, i, false))
    let lastSMANinecandle = smaData[smaData.length - 1]

    //console.log(s, 'sma buy or sma 9', lastSMANinecandle)
    return lastSMANinecandle

}
function stochRSIPromise(a,i){
    return new Promise((Resolve, Reject)=>{
        stochRSI(a,i).then(data=>{
            if(data){
                Resolve(data)
            } else{
                Reject('You Suck Stoch RSI')
            }

        })
    })
}
function candlesPromise(a,i){
    return new Promise((Resolve, Reject)=>{
        candles(a,i).then(candles =>{
            if(candles){
                Resolve(candles)
            } else {
                Reject('You Suck Candles')
            }
        })
    })
}
function MACDPromise(a,i){
    return new Promise((Resolve, Reject) =>{
        MACD(a,i).then( macd =>{
            if(macd){
                Resolve(macd)
            } else{
                Reject('You Suck MACD')
            }
        })
    })
}
function SARPromise(a,i){
    return new Promise((Resolve, Reject) =>{
        parabolicSAR(a,i).then(sar =>{
            if (sar){
                Resolve(sar)
            } else{
                Reject('YOU suck Parabolic SAR')
            }
        })

    })
}
function sma9Promise(asset, i){
    return new Promise((resolve, reject)=>{
        getSMANine(asset, i).then(data =>{
            //console.log(data)
            if(data){
                resolve(data)
            }else{
                reject('you suck')
            }
        })
    })
}
async function getSMAFive(s, i){
    // 5 Dya moving average
    // console.log(s, 'in sma')
    let usableSymbol = s + '/USDT'
    let smaData = await limiter.schedule(() => sma(15, "close", "binance", usableSymbol, i, false))
    let lastSMAFiveCandle = smaData[smaData.length - 1]
    //console.log(s,'sma sell or sma 5', lastSMAFiveCandle)
    return lastSMAFiveCandle

}
function sma5Promise(asset, i){
    return new Promise((resolve, reject)=>{
        getSMAFive(asset, i).then(data =>{
            if(data){
                resolve(data)
            }else{
                reject('you suck')
            }
        })
    })
}
async function isSma5AboveNine(asset, interval){
    await sma9Promise(asset, interval).then(sma9 =>{
        const smaNine = sma9
        sma5Promise(asset, interval).then(sma5 =>{
            /* let smaFive = +$$(
                 $(sma5), subtractPercent(1))*/
            let smaFiveIsAboveNine = sma5 >= smaNine // buy a certain percentage
            console.log(asset, 'Sma five is greater than 9?', smaFiveIsAboveNine,'sma9=', smaNine, 'sma5=', sma5)
            global.tradeData.fiveAboveTheNine = smaFiveIsAboveNine
            global.bitstampBuyData.smaHasCrossedSincePurchase = smaFiveIsAboveNine
            return smaFiveIsAboveNine
        })

    })

}
async function getAssetBalance(asset){
    console.log('getting balance for asset', asset)
    let assetToLowercase = asset.toLowerCase()
    let assetInAvailableFormat = assetToLowercase + '_available'
    const balance = await limiter.schedule(() =>bitstamp.balance().then(({body:data}) => data)).catch(err =>{console.log(err, 'in balance function')});
    const assetBalance = balance[`${assetInAvailableFormat}`]
   // console.log(asset, 'balance in balance', assetBalance)
    let assetConvertedAmount = $.of(assetBalance).valueOf();
    return assetConvertedAmount
}
function assetBalancePromise(a){
    return new Promise((Resolve, Reject) =>{
        getAssetBalance(a).then(b =>{
            if(b){
                Resolve(b)
                return b
            } else {
                Reject("you suck balance")
            }
        })
    })
}
async function getBuyingPower(){
    let asset = 'USD'
    let assetToLowercase = asset.toLowerCase()
    let assetInAvailableFormat = assetToLowercase + '_available'
    const balance = await limiter.schedule(() =>bitstamp.balance().then(({body:data}) => data));
    const assetBalance = balance['usd_available']
    let assetConvertedAmount = $.of(assetBalance).valueOf();
    global.buyingPower = assetConvertedAmount
    return assetConvertedAmount
}
async function buyAssetOnBitstamp(amount, price, currency){
    let bitstampSymbol = currency.toLowerCase() + 'usd'
    await bitstamp.buyLimitOrder(amount, price, bitstampSymbol, null, false);
}
function buyPromiseBitstamp(price, currency){
    return new Promise((Resolve, Reject)=>{
        if (global.buyingPower > 20){
            let amount = global.buyingPower / price
            console.log('buying params passed in buy function', amount, price, currency)
            let value1 = Number(amount)
            let value2 = Number(5)/ 100
            let newAmount = value1 - (value1 * value2)
            let newAmountToDecimalFixed = newAmount.toFixed(6)
            console.log('buy with new amount', newAmountToDecimalFixed, price, currency)
            buyAssetOnBitstamp(newAmountToDecimalFixed, price, currency).then(buy =>{
                if(buy){
                    Resolve(buy)
                }
                console.log('placed buy order on bitstamp the params =', newAmount, price, currency, 'the response =', buy)
            }).catch(err =>{
                console.log(err, 'buying err in promise line 225', amount, price, currency)
                let value1 = Number(amount)
                let value2 = Number(5)/ 100
                let newAmount = value1 - (value1 * value2)
                let newAmountToDecimalFixed = newAmount.toFixed(6)
                console.log('retrying buy with new amount log', newAmountToDecimalFixed, price, currency)
                buyAssetOnBitstamp(newAmountToDecimalFixed, price, currency).then(buy =>{
                    console.log('purchased after error', newAmount, price, currency)
                })
            })
        } else {
            return 'no buying power get to stepping'
        }

    })
}
async function sellAssetOnBitstamp(amount, price, currency){
    let bitstampSymbol = currency.toLowerCase() + 'usd'
    console.log('selling ', bitstampSymbol,'params', amount, price, currency)
    await bitstamp.sellLimitOrder(amount, price, bitstampSymbol, null, false);
}
function sellPromiseBitstamp(price, currency){
    return new Promise ((Resolve, Reject)=>{
        getAssetBalance(currency).then(amount => {
            global.bitstampSellData.symbolInTrade = currency
            global.bitstampSellData.sellAmount = amount
            let value = amount * price
            console.log(currency, 'amount= ', amount, 'value= ', value, 'before sell function in promise , data =', global.bitstampSellData)
            if (value < 20) {
                return 'Dont own that asset'
            } else {
                if (amount > 0) {
                    console.log(currency, 'amount to sell', global.bitstampSellData.sellAmount)
                    sellAssetOnBitstamp(amount, price, currency).then(resp =>{
                        console.log('placed sell order on Bitstamp', resp)
                        Resolve(resp)
                    }).catch(err =>{
                        console.log(err, 'selling error inside sell promise line 257, the sell data', global.bitstampSellData)
                    })
                }

            }
        })

    })
}
async function cancelBitStampOrders(){
    let orders = await bitstamp.cancelOrdersAll();
    return orders
}

setInterval(function(){
    //console.log('customers bot'. process.env.CLIENTNAME)
    cancelBitStampOrders().then(data =>{
        console.log('canceled orders on Bitstamp', data.body)
    })
    getBuyingPower().then(data =>{
        console.log('buying power', data)
    })

    for(let a of crypto) {
        /**
         * set interval
         * @type {string}
         */
       // console.log('symbol in loop', a)
        const i = '1m'
        const symbol = a +'USD'
        const tickerSymbol = a + '_USD'
       /* const ticker = limiter.schedule(() => bitstamp.tickerHour(CURRENCY[`${tickerSymbol}`]).then(({status, headers, body}) => {
            //console.log(a,'ticker information 1 hour interval from bitstamp', body)
            /!*global.bitstampData.close = body.last
            global.bitstampData.open = body.open*!/
            global.bitstampBuyData.buyPrice = parseFloat(body.bid)
            global.bitstampSellData.sellPrice = parseFloat(body.ask)
            global.bitstampData.time = body.timestamp
            readableTimestamp(body.timestamp).then()

        })).catch(err =>{
            console.log(a,'error when getting ticker', err)
        })*/
        getAssetBalance(a).then(b => {
            global.tradeData.amount = b
            console.log(a, 'new balance from promise', global.tradeData.amount)

        }).catch( err =>{
          console.log(err, 'in getting balance')
        })
        candles(a,i).then(data =>{
            global.tradeData.symbol = a
            global.tradeData.open = data[data.length - 1].open
            global.tradeData.close = data[data.length - 1].close
          //  console.log(a, 'candles in interval calling promise', data[data.length -1])
        }).then(z =>{
           return MACD(a, i).then(macd =>{
                 global.tradeData.MACDHistogram = macd
                 global.tradeData.MACDHasCrossedSinceLastBuy = macd >= 0
                 console.log(a, 'setting MACD signal has crossed since buy', macd, global.tradeData.MACDHasCrossedSinceLastBuy)
                 /*if(macd >= 0 && global.buyingPower > 20){
                       return buyPromiseBitstamp(global.bitstampBuyData.buyPrice, a)
                      }
                       let sell = macd <= 0
                      //  console.log(a, '$elling on MACD signal', macd, sell, 'amount', global.bitstampData.amount)
                       if (macd <= 0 && global.bitstampData.amount > 0){
                           // return sellPromiseBitstamp(global.bitstampBuyData.buyPrice, a)
                         }*/
             })
         }).then(b =>{
            return getSMANine(a,i).then(sma =>{
                 console.log(a, 'the close',global.tradeData.close, 'the sma', sma)
                 global.tradeData.sma9 = sma
                 if (global.tradeData.close < global.tradeData.sma9 && global.tradeData.amount > 0 && global.tradeData.MACDHasCrossedSinceLastBuy === true){
                     return sellPromiseBitstamp(global.bitstampSellData.sellPrice, global.tradeData.symbol)
                 }

             })
         }).then(r =>{
             return RSI(a,i).then(rsi => {
                 if (rsi < 43) {
                     global.tradeData.undersold = true
                 }
             })
         }).then(o =>{
            return stochRSI(a,i).then(data =>{
                 global.tradeData.stochValueK = data.valueFastK
                 global.tradeData.stochValueD = data.valueFastD
                 // console.log(a, 'return from stoch rsi call fast k =', global.bitstampData.stochValueK, 'value fast D', global.bitstampData.stochValueD)
                 global.tradeData.stochasticRsiKaboveD = global.tradeData.stochValueK > global.tradeData.stochValueD
                 if (global.tradeData.stochasticRsiKaboveD === true && global.buyingPower > 20 && global.tradeData.undersold === true){
                     global.tradeData.MACDHasCrossedSinceLastBuy = false
                     global.tradeData.undersold = false
                     console.log(a,'about to buy based on stochastic rsi cross. are they crossed?',global.tradeData.stochasticRsiKaboveD, ' setting macd has not crossed since buy to false ',global.tradeData.MACDHasCrossedSinceLastBuy)
                     return buyPromiseBitstamp(global.bitstampBuyData.buyPrice, global.tradeData.symbol)
                 }
                 if(global.tradeData.MACDHistogram < 0 && global.tradeData.amount > 20 && global.tradeData.MACDHasCrossedSinceLastBuy === true){
                    return sellPromiseBitstamp(global.bitstampSellData.sellPrice, global.tradeData.symbol)
                 }
             })
         }).then(e =>{
            return parabolicSAR(a, i).then(sar =>{
                 global.tradeData.sar = sar
                 // console.log('Parabolic SAR value', sar)
             })
         }).then(c =>{
             console.log('end of interval what was scanned', global.tradeData)
         })





        // Periods: 1m,3m,5m,15m,30m,1h,2h,4h,6h,8h,12h,1d,3d,1w,1M
        /**
         * set global sell signal
         */
   /*     sma9Promise(a, i).then(sma9 =>{
            console.log('sma9 =',sma9, 'close=', global.bitstampData.close, 'open =',  global.bitstampData.open)
            if(sma9 < global.bitstampData.open && global.buyingPower > 20){
                buyPromiseBitstamp(global.bitstampBuyData.buyPrice, a).then(data =>{
                    console.log('placed buy order on Bitstamp', 'sma9 =',sma9, 'close=', global.bitstampData.close, 'open =',  global.bitstampData.open)
                })
            }
            if (sma9 > global.bitstampData.close){
                sellPromiseBitstamp(global.bitstampSellData.sellPrice, a).then(data =>{
                    console.log('placed sell order', 'sma9 =',sma9, 'close=', global.bitstampData.close, 'open =',  global.bitstampData.open)
                })
            }
        })*/
       /* isSma5AboveNine(a).then(fiveAboveNine => {
            console.log('sma above 5 y is the condition not met', global.bitstampData.smaFiveAboveNine)
            if (global.bitstampData.smaFiveAboveNine === true){
                global.bitstampBuyData.smaHasCrossedSincePurchase = true
                console.log('has sma crossed since purchase? why is this not true', global.bitstampBuyData.smaHasCrossedSincePurchase)
            }

            if (global.bitstampData.fiveAboveTheNine === true && global.buyingPower > 20){
                console.log('placed buy based on sma crossed no RSI', global.bitstampBuyData)
                /!*buyPromiseBitstamp(global.bitstampBuyData.buyPrice, a).then(buy =>{
                    global.bitstampBuyData.smaHasCrossedSincePurchase = false

                })*!/
            }
            console.log(a, 'if bought while five is below nine, sma has crossed since purchase is set to false. On first cross after initial purchase, set sma has crossed to true to allow the asset to be sold. Is five above nine? ', global.bitstampData.fiveAboveTheNine)
            if (global.bitstampData.fiveAboveTheNine === false && global.bitstampBuyData.smaHasCrossedSincePurchase === false){
                console.log('waiting for first cross since buy')
                return 'waiting for first cross since buy'
            }
            if(global.bitstampBuyData.fiveAboveTheNine === true && global.bitstampBuyData.smaHasCrossedSincePurchase === false){
                global.bitstampBuyData.smaHasCrossedSincePurchase = true
                console.log('sma crossed for the first time since buy setting the signal to true', global.bitstampBuyData.smaHasCrossedSincePurchase)
            }
            if(global.bitstampData.fiveAboveTheNine === false && global.bitstampBuyData.smaHasCrossedSincePurchase === true){
                sellPromiseBitstamp(global.bitstampSellData.sellPrice, a).then(sell =>{
                    console.log('placing sell order')
                })
            }
            console.log('has sma crossed since purchase?', global.bitstampBuyData.smaHasCrossedSincePurchase)

        })*/
    }
}, 30000)

app.listen(process.env.PORT);
