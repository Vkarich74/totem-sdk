const role = location.state?.role;
const slug = location.state?.slug;
const effectiveRole = role || query.get("role") || "";
const effectiveSlug = slug || query.get("slug") || "";
