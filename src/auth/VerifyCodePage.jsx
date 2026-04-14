const initialLogin = useMemo(() => {
  return String(location.state?.login || "").trim();
}, [location.state]);

const initialRole = useMemo(() => {
  return String(location.state?.role || "").trim();
}, [location.state]);

const initialSlug = useMemo(() => {
  return String(location.state?.slug || "").trim();
}, [location.state]);
