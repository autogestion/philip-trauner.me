export const fetchCollection = function(path, session = {}, inbox = false) {
  let headers = { Accept: "application/activity+json" };
  if (session.user && inbox)
    headers["Authorization"] = "Bearer " + session.token;
  return fetch(path, { headers })
    .then(d => d.json())
    .then(d => d);
};
