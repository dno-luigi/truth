async function deleteMaster(env, idOrQuery) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_MASTER + id;
  await env.MASTER_TRUTHS.delete(key);
  return { id };
}
__name(deleteMaster, "deleteMaster");
__name2(deleteMaster, "deleteMaster");
