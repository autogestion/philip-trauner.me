<script>
  import Post from "./Post.svelte";

  export let curRoute;
  export let session;
  let pgi = pubgate_instance;
  let id = $curRoute.match(/^\/@([^\/]+)\/object\/(.+)$/)[2];

  const fetchObject = function(path, session = {}) {
    let headers_set = {
      Accept: "application/activity+json",
    };
    const url = pgi ? path + "?cached=1" : path;
    return fetch(base_url + url, { headers: headers_set })
      .then(d => d.json())
      .then(d => d);
  };

  $: object = fetchObject($curRoute, $session);
</script>

{#await object}
  So you want to see object {id}?
{:then post}
  <Post {post} {session} />
{/await}
