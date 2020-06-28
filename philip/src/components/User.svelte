<script>
  import { fetchJSON } from "../utils";

  import Collection from "./Collection.svelte";

  export let curRoute;
  export let session;

  const username = $curRoute.match(/^\/@([^\/]+)$/)[1];

  let outbox, followers, following, liked;

  const updateUser = async url => {
    const d = await fetchJSON(url);
    console.log("[User] Fetching timeline", d.outbox);
    outbox = fetchJSON(d.outbox);
    followers = fetchJSON(d.followers);
    following = fetchJSON(d.following);
    liked = fetchJSON(d.liked);
    return d;
  };

  $: profile = updateUser(base_url + $curRoute);
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
