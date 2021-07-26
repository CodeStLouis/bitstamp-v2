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
    'ETH',
    'LTC'
]
let t = new Date
const rawUtcTimeNow = (Math.floor(t.getTime()))

const sma = require('trading-indicator').sma
async function getSMANine(s, i){
   // console.log(s, 'in sma9')
    let usableSymbol = s + '/USDT'
    console.log(usableSymbol, 'in sma9')
    let smaData = await limiter.schedule(() =>sma(10, "close", "binance", usableSymbol, "1m", false))
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
async function getAssetBalance(asset){
    global.bitstampData.symbol = asset
    let assetToLowercase = asset.toLowerCase()
    let assetInAvailableFormat = assetToLowercase + '_available'
    const balance = await limiter.schedule(() =>bitstamp.balance().then(({body:data}) => data));
    const assetBalance = balance[`${assetInAvailableFormat}`]
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
        sma9Promise(a, '1m').then(sma9 =>{
            console.log(a, 'return from sma nine', sma9)
            const tickerSymbol = a + '_USD'
            global.bitstampBuyData.symbolInTrade = a
            const ticker = limiter.schedule(() =>bitstamp.ticker(CURRENCY[`${tickerSymbol}`]).then(({status, headers, body}) =>{
                global.bitstampSellData.symbolInTrade = a
                global.bitstampBuyData.symbolInTrade = a
                global.bitstampData.symbol = a
                global.bitstampBuyData.buyPrice = parseFloat(body.ask)
                global.bitstampSellData.sellPrice = parseFloat(body.bid)
                let amountToNumbers = global.buyingPower / body.ask
                global.bitstampBuyData.buyAmount = +$$(
                    $(amountToNumbers), subtractPercent(5)).toNumber().toFixed(6)
                global.bitstampData.close = body.last
                    console.log(a, body)
                global.bitstampBuyData.buy = sma9 < global.bitstampData.close
                global.bitstampSellData.sell = sma9 > global.bitstampData.close
                console.log(a, sma9, 'sma nine lower than close', global.bitstampData.close, 'buy?', global.bitstampBuyData.buy)
                console.log(a, sma9, 'sma nine greater than close', global.bitstampData.close, 'sell?', global.bitstampSellData.sell)
                if (global.bitstampSellData.sell === true){
                    getAssetBalance(a).then(amount =>{
                        global.bitstampSellData.sellAmount = amount
                        let value = amount * global.bitstampSellData.sellPrice
                        console.log('value', value)
                        if(value < 10){
                            console.log('dont own asset')
                            return 'Dont own that asset'
                        } else {
                            console.log('selling', amount, global.bitstampSellData.sellPrice, global.bitstampSellData.symbolInTrade)
                            sellPromiseBitstamp(amount, global.bitstampSellData.sellPrice, global.bitstampSellData.symbolInTrade).then(data=>{
                                console.log('placed sell')
                            }).catch(err =>{
                                console.log(err, 'in selling line 152')
                            })
                        }
                    })
                }
                let minOrder = global.buyingPower * global.bitstampBuyData.buyPrice
                    console.log('Min order', minOrder)
                if (global.bitstampBuyData.buy === true && global.buyingPower > 20 && minOrder > 20){
                        buyPromiseBitstamp(global.bitstampBuyData.buyAmount, global.bitstampBuyData.buyPrice, global.bitstampBuyData.symbolInTrade).then(data =>{
                            console.log('bought stuff')
                        }).catch(err =>{
                            console.log(err, 'buying error line 161')
                        })
                }
                    console.log('buying data', global.bitstampBuyData, 'selling data', global.bitstampSellData, 'buying power', global.buyingPower)
            }

            ));
        })
    }

}, 20000)

const bitstampStream = new BitstampStream();

/*await bitstamp.buyLimitOrder(amount, price, currency, limit_price, daily_order);

await bitstamp.sellLimitOrder(amount, price, currency, limit_price, daily_order);*/
app.listen(process.env.PORT);
