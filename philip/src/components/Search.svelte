<script>
  export let session;
  export let curRoute;

  import { xhr, findUser, fetchOutbox } from "../utils";
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
  let error = "";

  const search = async event => {
    error = "";
    profile = null;
    outbox_collection = null;
    let name, domain, url;
    if (username.match(/^http/)) {
      url = username; // TODO
      error = "we could do the request for you, but we don't";
      return;
    }

    const pair = username.split("@");
    if (pair.length !== 2) {
      return (error = "Use this format: username@domain");
    }
    name = pair[0];
    domain = pair[1];


    const res = await handleResult(findUser(name, domain));
    if (!res.outbox) return;
    profile = res;

    outbox_collection =
      typeof profile.outbox === "string"
        ? await handleResult(fetchOutbox(profile.outbox))
        : profile.outbox;
  };

  const handleResult = async promise => {
    const result = await promise;
    if (!result) error = "Empty response.";
    else if (result.error) error = result.error;
    return result;
  };

  const follow = async event => {
    const type = event.target.innerText;
    const { id, name } = profile; // OPTIMIZE kind of quirky to pull this form parent
    if (!$session.user) error = "You are not logged in.";
    else if (pubgate_instance) {
      const body = JSON.stringify({ type, object: id });
      const headers = { Authorization: "Bearer " + $session.token };
      const outbox = $session.user.outbox;
      const req = { method: "POST", body, headers };
      const res = await fetch(outbox, req).then(d => d.json());
      if (!res) error = `Empty response trying to ${type} ${name}`;
      else if (res.Created === "success")
        following = type === "Follow" ? true : false;
      else if (res.error)
        if (res.error === "This user is already followed") following = true;
        else error = JSON.stringify(res.error);
      else error = "Something went wrong.";
    }
  };

  async function loadPost(event) {
    error = loadedPost = "";
    try {
      const response = await xhr(postLink);
      const { type } = response;
      if (type !== "Note") {
        return (error = `Wrong type: ${type}`);
      }
      loadedPost = response;
      postLink = "";
    } catch (e) {
      error = e.message;
    }
  }
</script>

<br />
Search accounts
<form on:submit|preventDefault={search}>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      type="text"
      placeholder="Search format: username@domain"
      bind:value={username} />
  </fieldset>
  <button
    class="btn btn-sm pull-xs-right btn-info"
    type="submit"
    disabled={!username}>
    Search user
  </button>
</form>
<br />
<br />
Load Post by link
<form on:submit|preventDefault={loadPost}>
  <fieldset class="form-group">
    <input
      class="form-control form-control-lg"
      type="text"
      placeholder="Copy a link here"
      bind:value={postLink} />
  </fieldset>
  <button
    class="btn btn-sm pull-xs-right btn-info"
    type="submit"
    disabled={!postLink}>
    Load post
  </button>
</form>
<br />
<br />

{#if profile}
  <h2>
    {profile.name}
    <button class="btn btn-sm pull-xs-right btn-info" on:click={follow}>
      {#if following}Unfollow{:else}Follow{/if}
    </button>
  </h2>
  {profile.summary}
  {#if outbox_collection}
    <Collection {session} collection={outbox_collection} />
  {/if}
{/if}

{#if typeof loadedPost === 'object'}
  <Post post={loadedPost} {session} />
{/if}

<p class="text-danger">{error}</p>
