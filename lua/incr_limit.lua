local counter_key = KEYS[1];
local counter_limit = tonumber(ARGV[1]);

if type(counter_limit) ~= "number" then
  error("args[1] must be a number");
end

local counter_current = redis.call("get", KEYS[1]);

if not counter_current then
  counter_current = 0;
else
  counter_current = tonumber(counter_current);
end

if counter_current < counter_limit then
  return redis.call("incr", counter_key);
end