function slugify(input) {
  return String(input || "").trim().toLowerCase().replace(/[^\w\s-]/g, "").replace(/[\s_]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").substring(0, 100);
}
__name(slugify, "slugify");
__name2(slugify, "slugify");
