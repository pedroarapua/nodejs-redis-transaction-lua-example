const redis = require("redis");
const fs = require("fs");
const path = require("path");

class RedisTransaction {
  /**
   * Constructs a RedisTransaction object
   * @param {object} options options object
   * @param {object} [options.redis] redis connections object.
   * If this is not defined, default connection options will be used. THis object will be
   * passed to `redis.createClient` method.
   * Alternatively, you can provide a `RedisClient` instance of `redis`
   * library as `options.redisClient` argument.
   * @param {string} [options.redis.host] redis connection host
   * @param {number} [options.redis.port] redis connection port
   * @param {string} [options.redis.password] redis password, if any
   * @param {object} [options.redisClient] as instance of redis.RedisClient class. If this is provided,
   * it will be used as the redis client for this `RedisJson` instance.
   */
  constructor(options = {}) {
    console.debug("constructor, options: %j", options);
    this.settings = {
      ownClient: true
    }
    /**
     * @type {redis.RedisClient}
     */
    this.redisClient;
    if (options.redisClient) {
      this.settings.ownClient = false;
      this.redisClient = options.redisClient;
    } else {
      this.redisClient = redis.createClient(options.redis);
    }
    this.scriptHashes = {};
  }

  /**
   * Quits internal `redis` client, if it was created, or does nothing,
   * if external client was provided on connection within the `options.redisClient`
   * parameter.
   */
  quit() {
    if (this.settings.ownClient) {
      this.redisClient.quit();
    }
  }

  /**
   * Loads a script into redis cache
   * @param {string} scriptName means nothing, but should be unique. script will be saved in the 
   * scriptHashes object by this name.
   * @param {string} pathToFile path to file where script resides. absolute or relative to cwd.
   * @returns {Promise<object,object>} A promise which rejects with an error if we could not read file or
   * could not load script into redis cache, or resolves with script sha hash, if it was loaded successfully.
   */
  loadScript(scriptName, pathToFile) {
    console.debug("loadScript %s from file %s", scriptName, pathToFile);
    return new Promise((resolve, reject) => {
      fs.readFile(pathToFile, { encoding: "utf8" }, (err, script) => {
        if (err) {
          console.debug("file read error: %j", err);
          return reject(err);
        }
        this.redisClient.script("load", script, (err, hash) => {
          if (err) {
            console.debug("Error loading script %s from file %s:", scriptName, pathToFile, err);
            reject(err);
          } else {
            this.scriptHashes[scriptName] = hash;
            resolve(hash);
          }
        });
      });
    });
  }

  /**
   * Inits this `RedisJson` instance by loading lua scripts into redis cache.
   * @returns {Promise<void,object>} a Promise which resolves once scripts have been loaded. A rejection
   * with an error object is possible.
   */
  async init() {
    await this.loadLuaScripts();
  }

  /**
   * Increments by 1 json key of a json object stored in redis under plain key (i.e. key which you can get with redis's `get` command)
   * @param {string} redisKey redis key where json object is stored
   * @param {...any} args list of any number of arguments in the following order:
   *  - `arg_1`: json key name to incrmenet
   *  - `arg_2`: increment value
   * 
   * `arg_2` may be followed by another `arg_1` or may be the last argument in
   * the sequence. `arg_1` should always be followed by `arg_2`, unless there is just 1 argument, in which case `arg_2` is
   * assumed to be equal to 1 by default. 
   * @returns {Promise<string,string>} a Promise which resolves with an error string or a JSON string representing new object
   * once script has been executed.
   */
  incrWithLimit(redisKey, ...args) {
      console.debug("incrWithLimit %s -> args: %j", redisKey, args);
      if (args.length === 1) {
        args.push(1);
      }
      return new Promise((resolve) => {
        this.redisClient.evalsha(this.scriptHashes.incrWithLimit, "1", redisKey, ...args, (err, resp) => {
          resolve(err || resp);
        });
      });
  }

  async loadLuaScripts() {
    await Promise.all([
      this.loadScript("incrWithLimit", path.resolve(__dirname, "lua/incr_limit.lua"))
    ]);
  }
}

module.exports = RedisTransaction;