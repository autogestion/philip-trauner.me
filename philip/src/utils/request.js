const headers = { Accept: "application/activity+json" };
let baseProtocol, baseDomain;
const matchUrl = base_url.match(/^([^:]+):\/\/([^/]+)/);
if (matchUrl) {
  baseProtocol = matchUrl[1];
  baseDomain = matchUrl[2];
} else console.log("matchUrl is null", base_url);

// generic request
// TODO detect local addresses to use fetchLocal,
// TODO otherwise use fetchProxy
export const fetchJSON = (url, params = { headers }, callback = d => d) => {
  console.log("fetching", url, params);
  return fetch(url, params)
    .then(d => d.json())
    .catch(error => console.log("request failed:", url, error))
    .then(callback);
};

export const xhr = (url, options = {}) => {
  let defaultOptions = { headers };
  return fetch(url, Object.assign(defaultOptions, options))
    .then(d => d.json())
    .catch(error => fetchJSON(url, error));
};
const retryFetch = async (url, error) => {
  console.log(`error fetching ${url}: ${error}. Retrying ..`);
  return fetchProxy(url);
};

export const fetchLocal = async (url, params = {}) => {
  return fetchJSON(url, Object.assign({ headers }, params));
};

export const fetchProxy = url => {
  const params = { method: "POST", body: JSON.stringify({ url }) };
  console.log("proxy fetch", url, params);
  return fetchJSON(base_url + "/proxy", params);
};

// Timeline, Collection
export const fetchCollection = function(path, session = {}, inbox = false) {
  console.log("fetching collection", path);
  let Headers = headers;
  if (session.user && inbox)
    Headers["Authorization"] = "Bearer " + session.token;
  return fetchJSON(path, { headers: Headers });
};

// Search
export const fetchOutbox = async url => {
  // TODO check cache
  const res = await fetchProxy(url);
  console.log("outbox", res);
  if (res.error) return res;
  return typeof res.first === "string"
    ? await fetchProxy(res.first)
    : res.first;
};

export const getUserId = (name, domain = baseDomain, fyn = true) => {
  // TODO only for testing
  console.log("getUserId", domain, baseDomain, baseProtocol);
  const protocol = domain === baseDomain ? baseProtocol : "https";

  return (
    `${protocol}://${domain}/` +
    (fyn ? `@${name}` : `.well-known/webfinger?resource=acc:${name}@${domain}`)
  );
};

export const findUser = async (name, domain) => {
  const useProxy = pubgate_instance ? true : false;
  const fynRes = await fetchJSON(getUserId(name, domain));
  //console.log("fyn", fynRes);
  if (fynRes && !fynRes.error) return fynRes;

  const wfRes = await fetchJSON(getUserId(name, domain, false));
  //console.log("wf", wfRes);
  if (!wfRes || wfRes.error) return wfRes;
  const id = wfRes.aliases[1] || wfRes.links[0].href;
  return fetchJSON(url);
};

export const followUser = async (session, body) => {
  const Headers = headers;
  Headers["Authorization"] = "Bearer " + session.token;
  const req = { method: "POST", body, headers: Headers };
  return fetchJSON(session.user.outbox, req);
};

export const findPost = async url => {
  try {
    const response = await xhr(url);
    const { type } = response;
    if (type !== "Note") return { error: `Wrong type: ${type}` };
    return response;
  } catch (e) {
    return { error: e.message };
  }
};

export const outboxPost = (session, body) => {
  try {
    const headers = { Authorization: "Bearer " + session.token };
    const req = { method: "POST", body, headers };
    return fetchJSON(session.user.outbox, req);
  } catch (error) {
    console.log("publish failed", error);
    return { error };
  }
};
