import { useSearchParams } from "react-router-dom";

function LoginPage() {
  const [query] = useSearchParams();

  const role = query.get("role") || "";
  const slug = query.get("slug") || "";

  const effectiveRole = role;
  const effectiveSlug = slug;

  // rest of component code
}
