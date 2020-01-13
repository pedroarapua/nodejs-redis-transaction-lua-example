const RedisTransaction = require("..");
const redis = require("redis");
const bluebird = require("bluebird");
bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

async function runRedisTransactionBenchmarkIncrWithLimit(time) {
    const redisClient = new RedisTransaction();
    await redisClient.init();
    
    let done = false;
    setTimeout(() => {
        done = true;
    }, time);
    let n = 0;
    while (!done) {
        await redisClient.incrWithLimit("countIncrWithLimit", 1000000);
        n++;
    }
    console.log("incrWithLimit: completed %s redisTransaction.incrWithLimit operations within %sms", n, time);
    redisClient.quit();
    return n;
}

async function runRedisBenchmarkIncr(time) {
    const redisClient = redis.createClient();
    let done = false;
    setTimeout(() => {
        done = true;
    }, time);
    let n = 0;
    while (!done) {
        let multi = redisClient.multi();
        multi.getAsync("countIncr");
        multi.incrAsync("countIncr");
        result = await multi.execAsync();
        console.log(result);
        n++;
    }
    console.log("incr: completed %s redisClient.incr operations within %sms", n, time);
    redisClient.quit();
    return n;
}

async function run(n) {
    await runRedisTransactionBenchmarkIncrWithLimit(n);
    await runRedisBenchmarkIncr(n);
}

async function start() {
  await run(1000);
}

start();