const RedisTransaction = require("../");
const redisTransaction = new RedisTransaction();

async function start() {
  await redisTransaction.init();
  const result = await redisTransaction.incrWithLimit("count", 20);
  console.log(result);
  await redisTransaction.quit();
}

start();