// Client-side adapter: validation enabled only in strict Staging builds.
import { createStageLinkPolicy } from "./stageLinkPolicy.js";

export const stageLinkPolicy = createStageLinkPolicy({
  strict: import.meta.env?.VITE_STAGE_STRICT === "1",
  appOrigin: import.meta.env?.VITE_STAGE_APP_ORIGIN || "",
  publicOrigin: import.meta.env?.VITE_STAGE_PUBLIC_ORIGIN || ""
});
