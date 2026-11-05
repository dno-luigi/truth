async function deleteProvisional(env, idOrQuery) {
  const id = normalizeId(idOrQuery);
  const key = KV_PREFIX_PROV + id;
  await env.PROV_TRUTH.delete(key);
  return { id };
}
__name(deleteProvisional, "deleteProvisional");
__name2(deleteProvisional, "deleteProvisional");
