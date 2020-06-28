<script>
  export let session;
  export let curRoute;

  import { findUser, fetchOutbox, findPost, followUser } from "../utils";
  import Collection from "./Collection.svelte";
  import Post from "./Post.svelte";

  // search user
  let username = "";
  let profile = null;
  let following = false;
  let outbox_collection = null;

  // search post
  let loadedPost = "";
  let postLink = "";
  let errorUser = "";
  let errorPost = "";
  let errorFollow = "";

  const handleSearchUser = async event => {
    errorUser = "";
    profile = null;
    outbox_collection = null;
    let name, domain, url;

    const pair = username.split("@");
    if (username.match(/^http/) || pair.length !== 2 || pair[0] === "") {
      return (errorUser = "Use this format: username@domain");
    }
    name = pair[0];
    domain = pair[1];

    const result = await findUser(name, domain);
    if (!result) errorUser = "Empty response.";
    else if (result.error) errorUser = result.error;
    if (!result.outbox) {
      errorUser = result.error || "User not found.";
      return;
    }
    profile = result;
    errorFollow = "";

    outbox_collection =
      typeof profile.outbox === "string"
        ? await fetchOutbox(profile.outbox)
        : profile.outbox;
  };

  const handleSearchPost = async event => {
    if (postLink === "" || !postLink.match("^http")) {
      errorPost = "Not an URL.";
      return;
    }
    errorPost = loadedPost = "";
    const result = await findPost(postLink);
    if (!result) errorPost = "Empty response.";
    else if (result.error) {
      errorPost = result.error;
      return;
    }
    loadedPost = result;
    postLink = "";
  };

  const handleFollow = async event => {
    if (!$session.user) {
      errorFollow = "You are not logged in.";
      return;
    }

    const type = event.target.innerText;
    const { id, name } = profile;
    const body = JSON.stringify({ type, object: id });

    const res = await followUser($session, body);
    if (!res) errorFollow = `Empty response trying to ${type} ${name}`;
    else if (res.Created === "success")
      following = type === "Follow" ? true : false;
    else if (res.error)
      if (res.error === "This user is already followed") following = true;
      else errorFollow = JSON.stringify(res.error);
    else errorFollow = "Something went wrong.";
  };
</script>

<style>
  .error {
    margin-left: 10px;
    font-size: 15px;
  }
</style>

<br />
Search accounts
<form on:submit|preventDefault={handleSearchUser}>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      type="text"
      placeholder="Format: username@domain"
      bind:value={username} />
  </fieldset>
  <button
    class="btn btn-sm pull-xs-right btn-info"
    type="submit"
    disabled={!username}>
    Find User
  </button>
  <span class="error text-danger">{errorUser}</span>
</form>
<br />
<br />
Load Post by link
<form on:submit|preventDefault={handleSearchPost}>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      type="text"
      placeholder="Enter a link here"
      bind:value={postLink} />
  </fieldset>
  <button
    class="btn btn-sm pull-xs-right btn-info"
    type="submit"
    disabled={!postLink}>
    Find Post
  </button>
  <span class="error text-danger">{errorPost}</span>
</form>
<br />
<br />

{#if profile}
  <h2>
    {profile.name}
    <button class="btn btn-sm pull-xs-right btn-info" on:click={handleFollow}>
      {#if following}Unfollow{:else}Follow{/if}
    </button>
    <span class="error text-danger">{errorFollow}</span>
  </h2>
  {profile.summary}
  {#if outbox_collection}
    <Collection {session} collection={outbox_collection} />
  {/if}
{/if}

{#if typeof loadedPost === 'object'}
  <Post post={loadedPost} {session} />
{/if}
