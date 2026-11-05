async function countKeys(kv, prefix) {
  let total = 0;
  let cursor;
  for (let page = 0; page < 50; page++) {
    const opts = prefix ? { prefix } : {};
    if (cursor) opts.cursor = cursor;
    const res = await kv.list(opts);
    total += res.keys.length;
    if (res.list_complete || !res.cursor || !res.keys.length) break;
    cursor = res.cursor;
  }
  return total;
}
__name(countKeys, "countKeys");
__name2(countKeys, "countKeys");
