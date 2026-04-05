export function setMeta(name, content, property = false) {
  const selector = property
    ? `meta[property="${name}"]`
    : `meta[name="${name}"]`;

  let tag = document.querySelector(selector);

  if (!tag) {
    tag = document.createElement("meta");
    if (property) tag.setAttribute("property", name);
    else tag.setAttribute("name", name);
    document.head.appendChild(tag);
  }

  tag.setAttribute("content", content);
}

export function setCanonical(url) {
  let link = document.querySelector("link[rel='canonical']");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

export function setJSONLD(data) {
  let script = document.querySelector("#ld-json");
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = "ld-json";
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}