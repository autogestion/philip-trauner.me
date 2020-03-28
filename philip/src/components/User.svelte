<script>
  import Collection from "./Collection.svelte";

  export let curRoute;
  export let session;

  const username = $curRoute.match(/^\/@([^\/]+)$/)[1];
  let outbox, followers, following, liked;

  let headers = { Accept: "application/activity+json" };
  const fetchJSON = (url, cb = d => d) =>
    fetch(url, { headers })
      .then(d => d.json())
      .then(cb);

  const fetchUser = path => {
    return fetch(base_url + path, { headers })
      .then(d => d.json())
      .then(d => {
        console.log("[User]Fetching timeline", d.outbox);
        outbox = fetchJSON(d.outbox, d => d);
        followers = fetchJSON(d.followers);
        following = fetchJSON(d.following);
        liked = fetchJSON(d.liked);
        return d;
      });
  };

  $: profile = fetchUser($curRoute);
</script>

{#await profile}
  Shortly this page will show info about
  <b>{username}</b>
{:then user}
  <h2>
    <a href={user.url}>{user.name}</a>
  </h2>
  <p>
    <a href={user.followers}>Followers</a>
    |
    <a href={user.following}>Following</a>
    |
    <a href={user.outbox}>Timeline</a>
    |
    <a href={user.liked}>Liked</a>
  </p>

  <p>{user.summary}</p>

  {#await followers then collection}
    {#if collection.length}
      <h3>Followers</h3>
      <Collection {session} {collection} />
    {/if}
  {/await}

  {#await following then collection}
    {#if collection.length}
      <h3>Following</h3>
      <Collection {session} {collection} />
    {/if}
  {/await}

  {#await liked then collection}
    {#if collection.length}
      <h3>Liked</h3>
      <Collection {session} {collection} />
    {/if}
  {/await}

  {#await outbox then collection}
    <h3>Posts</h3>
    <Collection {session} {collection} />
  {/await}
{/await}
