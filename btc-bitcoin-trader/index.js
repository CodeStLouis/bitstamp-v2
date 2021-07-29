const express = require('express');
const app = express();
require('dotenv').config()
const dotenv = require('dotenv')
const Bottleneck = require("bottleneck");
const { $, gt } = require('moneysafe');
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

const limiter = new Bottleneck({
    maxConcurrent: 5,
    minTime: 500
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
    buy:{}
}
global.bitstampData ={
    symbol:{},
    amount:{},
    close:{},
    smaNine:{}
}
global.buyingPower={}
const crypto = [
   'BTC'
]
let t = new Date
const rawUtcTimeNow = (Math.floor(t.getTime()))

const sma = require('trading-indicator').sma
async function getSMANine(s, i){
    // console.log(s, 'in sma9')
    let usableSymbol = s + '/USDT'
    console.log(usableSymbol, 'in sma9')
    let smaData = await limiter.schedule(() =>sma(20, "close", "binance", usableSymbol, "1m", false))
    let lastSMANinecandle = smaData[smaData.length - 1]
    // console.log(s, lastSMANinecandle)
    return lastSMANinecandle

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
    let smaData = await limiter.schedule(() => sma(9, "close", "binance", usableSymbol, i, false))
    let lastSMAFiveCandle = smaData[smaData.length - 1]
    //console.log(s, lastSMAFiveCandle)
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
async function isSma5AboveNine(asset){
    await getSMANine(asset, '1m').then(sma9 =>{
        const smaNine = sma9
        getSMAFive(asset, '1m').then(sma5 =>{
            /* let smaFive = +$$(
                 $(sma5), subtractPercent(1))*/
            let smaFiveIsAboveNine = sma5 > smaNine // buy a certain percentage
            console.log(asset, 'Sma five is greater than 9? 5m', smaFiveIsAboveNine,'sma9=', smaNine, 'sma5=', sma5)
            global.bitstampData.fiveAboveTheNine = smaFiveIsAboveNine
            return smaFiveIsAboveNine
        })

    })

}
async function getAssetBalance(asset){
    global.bitstampData.symbol = asset
    let assetToLowercase = asset.toLowerCase()
    let assetInAvailableFormat = assetToLowercase + '_available'
    const balance = await limiter.schedule(() =>bitstamp.balance().then(({body:data}) => data));
    const assetBalance = balance[`${assetInAvailableFormat}`]
    console.log(asset, 'balance in balance', assetBalance)
    let assetConvertedAmount = $.of(assetBalance).valueOf();
    global.bitstampData.amount = assetConvertedAmount
    return assetConvertedAmount
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
function buyPromiseBitstamp(amount, price, currency){
    return new Promise((Resolve, Reject)=>{
        buyAssetOnBitstamp(amount, price, currency).then(resp=>{
            Resolve(resp)
        }).catch(err =>{
            console.log(err, 'buying err in promise line 102', amount, price, currency)
        })
    })
}
async function sellAssetOnBitstamp(amount, price, currency){
    let bitstampSymbol = currency.toLowerCase() + 'usd'
    console.log('selling ', bitstampSymbol,'params', amount, price, currency)
    await bitstamp.sellLimitOrder(amount, price, bitstampSymbol, null, false);
}
function sellPromiseBitstamp(amount, price, currency){
    return new Promise ((Resolve, Reject)=>{
        sellAssetOnBitstamp(amount, price, currency).then(resp =>{
            console.log('placed sell order on Bitstamp', resp)
            Resolve(resp)
        })
    })
}
async function cancelOrders(){
    let orders = await bitstamp.cancelOrdersAll();
    return orders
}
setInterval(function(){
    cancelOrders().then(data =>{
        console.log('canceled orders', data.body)
    })
    getBuyingPower().then(data =>{
        console.log('buying power', data)
    })
    for(let a of crypto){
        getAssetBalance(a).then(b =>{
            console.log('new balance', b)
        })
        isSma5AboveNine(a).then(fiveAboveNine =>{
            console.log(a,'returned from five is above nine ', global.bitstampData.fiveAboveTheNine)
            global.bitstampData.fiveAboveTheNine = fiveAboveNine
        })
        sma9Promise(a, '1m').then(sma9 =>{
            console.log(a, 'return from sma nine', sma9)
            const tickerSymbol = a + '_USD'
            global.bitstampData.symbol = a
            global.bitstampData.smaNine = sma9
            const ticker = limiter.schedule(() =>bitstamp.ticker(CURRENCY[`${tickerSymbol}`]).then(({status, headers, body}) =>{
                    let amountToNumbers = global.buyingPower / body.ask
                    global.bitstampBuyData.buyAmount = +$$(
                        $(amountToNumbers), subtractPercent(5)).toNumber().toFixed(6)
                    global.bitstampData.close = body.last
                    console.log(a, body)
                    global.bitstampBuyData.buy = sma9 < global.bitstampData.close && global.bitstampData.fiveAboveTheNine === true
                    global.bitstampBuyData.symbolInTrade = a
                    global.bitstampBuyData.buyPrice = parseFloat(body.bid)
                    global.bitstampSellData.sell = sma9 > global.bitstampData.close
                    console.log(a, sma9, 'sma nine lower than close', global.bitstampData.close, 'buy?', global.bitstampBuyData.buy, '5 above 9', global.bitstampData.fiveAboveTheNine)
                    console.log(a, sma9, 'sma nine greater than close', global.bitstampData.close, 'sell?', global.bitstampSellData.sell)
                    if (global.bitstampSellData.sell === true){
                        console.log('inside sell')
                        getAssetBalance(a).then(amount =>{
                            global.bitstampSellData.symbolInTrade = a
                            global.bitstampSellData.sellAmount = amount
                            global.bitstampSellData.sellPrice = parseFloat(body.ask)
                            let value = amount * global.bitstampSellData.sellPrice
                            console.log(a, 'amount= ',amount, 'value= ', value, 'about to sell', global.bitstampSellData)
                            if(value < 20 ){
                                return 'Dont own that asset'
                            } else {
                                if(global.bitstampSellData.sellAmount > 0){
                                    console.log(a,'amount to sell', global.bitstampSellData.sellAmount)
                                    console.log('selling line 200', global.bitstampSellData.sellAmount, global.bitstampSellData.sellPrice, a)
                                    sellPromiseBitstamp(global.bitstampSellData.sellAmount, global.bitstampSellData.sellPrice, global.bitstampSellData.symbolInTrade).then(data=>{
                                        console.log('placed sell')
                                    }).catch(err =>{
                                        console.log(err, 'in selling line 152')
                                    })
                                }

                            }
                        })
                    }
                    let minOrder = global.buyingPower / global.bitstampBuyData.buyPrice
                    console.log('Min order', minOrder)
                    if (global.bitstampBuyData.buy === true && global.buyingPower > 20 && global.bitstampData.fiveAboveTheNine === true){
                        console.log('buying conditions', global.bitstampBuyData.buy === true && global.buyingPower > 20 && global.bitstampData.fiveAboveTheNine === true)
                        console.log('about to buy', global.bitstampBuyData)
                        buyPromiseBitstamp(global.bitstampBuyData.buyAmount, global.bitstampBuyData.buyPrice, global.bitstampBuyData.symbolInTrade).then(data =>{
                            console.log('bought stuff')
                        }).catch(err =>{
                            console.log(err, 'buying error line 161')
                        })
                    }
                    console.log('bitstamp data', global.bitstampData, 'buying data', global.bitstampBuyData, 'selling data', global.bitstampSellData, 'buying power', global.buyingPower)
                }

            ));
        })
        sma5Promise(a, '1m').then(sma5 =>{
            console.log(a ,sma5 ,'sma 5 and close' ,global.bitstampData.close)
            global.bitstampSellData.sell = global.bitstampData.close < sma5
            console.log(global.bitstampData.symbol,'sma 5 and close sell signal at sma 5=' , global.bitstampSellData.sell)
            if(global.bitstampData.sell === true){
                getAssetBalance(a).then(amount =>{
                    global.bitstampSellData.sellAmount = amount
                    let value = amount * global.bitstampSellData.sellPrice
                    console.log('value', value)
                    if(value < 20 ){
                        console.log(a,'dont own asset')
                        return 'Dont own that asset'
                    } else {
                        if(amount > 0){
                            console.log('selling', amount, global.bitstampSellData.sellPrice, global.bitstampSellData.symbolInTrade)
                            sellPromiseBitstamp(amount, global.bitstampSellData.sellPrice, global.bitstampSellData.symbolInTrade).then(data=>{
                                console.log('placed sell')
                            }).catch(err =>{
                                console.log(err, 'in selling line 152')
                            })
                        }

                    }
                })
            }


        })
    }

}, 20000)

const bitstampStream = new BitstampStream();

/*await bitstamp.buyLimitOrder(amount, price, currency, limit_price, daily_order);

await bitstamp.sellLimitOrder(amount, price, currency, limit_price, daily_order);*/
app.listen(process.env.PORT);
