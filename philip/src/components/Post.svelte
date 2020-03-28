<script>
  export let post;
  export let session;

  import { ensureObject } from "../utils";
  import Publish from "./Publish.svelte";
  import PostContent from "./Post/Content.svelte";
  import Collection from "./Collection.svelte";

  let pgi = pubgate_instance;
  let showPublish = false;

  const togglePublish = ev => {
    ev.preventDefault();
    showPublish = !showPublish;
  };

  const toggleLists = ev => {
    ev.preventDefault();
  };

  let liked;
  let announced;
  if ($session.user) {
    if (post.reactions) {
      if (post.reactions.Like) {
        if (post.reactions.Like[$session.user.name]) {
          liked = true;
        }
      }
    }

    if (post.reactions) {
      if (post.reactions.Announce) {
        if (post.reactions.Announce[$session.user.name]) {
          announced = true;
        }
      }
    }
  }

  let inReply;
  let isReply = false;

  const getCount = async (item, returnAll = false) => {
    if (!item) return "n/a";
    const data = typeof item === "string" ? await fetchItem(item) : item;
    return returnAll ? data : data.totalItems;
  };

  const fetchItem = path => {
    let headers = { Accept: "application/activity+json" };
    const url = pgi ? path + "?cached=1" : path;
    return fetch(url, { headers })
      .then(d => d.json())
      .then(d => d);
  };

  let likes = getCount(post.likes);
  let comments = getCount(post.replies, true);
  let announces = getCount(post.shares);

  if (post.inReplyTo) {
    inReply = pgi ? post.inReplyTo : ensureObject(post.inReplyTo);
    isReply = true;
  }

  let customType = isReply ? "Reply" : null;

  async function doLike(ev) {
    ev.preventDefault();
    if (!liked) {
      let ap_object = {
        type: "Like",
        object: post.id,
        cc: [post.attributedTo],
      };
      const response = await fetch($session.user.outbox, {
        method: "POST",
        body: JSON.stringify(ap_object),
        headers: {
          Authorization: "Bearer " + $session.token,
        },
      }).then(d => d.json());
      liked = true;
    }
  }

  async function doAnnounce(ev) {
    ev.preventDefault();
    if (!announced) {
      let ap_object = {
        type: "Announce",
        object: post.id,
        cc: [post.attributedTo],
      };
      const response = await fetch($session.user.outbox, {
        method: "POST",
        body: JSON.stringify(ap_object),
        headers: {
          Authorization: "Bearer " + $session.token,
        },
      }).then(d => d.json());
      announced = true;
    }
  }
</script>

<style>
  .reactionz {
    font-size: 18px;
  }
  .rs {
    border-bottom: 1px solid #dadde1;
    display: flex;
  }
  .ra {
    padding: 4px 0;
    display: flex;
  }

  .rs_left {
    flex-grow: 1;
  }
  .rs_right {
    margin-left: 7px;
  }
  .ra_item {
    flex: 1 0;
    align-items: center;
    color: #606770;
    display: flex;
    font-weight: 600;
    height: 32px;
    justify-content: center;
  }

  .reaction {
    margin-left: 30px;
  }
  button {
    border: none;
    background: none;
  }

  .comments {
    margin-bottom: 15px;
    padding-left: 15px;
    border-left: 3px solid #ff0;
  }
</style>

{#if isReply == true}
  <div class="reaction">
    {#if typeof inReply === 'object' && typeof inReply.id != 'string'}
      {#await inReply then value}
        <PostContent post={value} />
      {/await}
    {/if}
  </div>
{/if}

<PostContent {post} {customType} />

<div class="reactionz">
  <div class="rs">
    {#await likes then likes}
      <span class="rs_left" on:click={toggleLists}>{likes} likes</span>
    {/await}
    {#await comments then comments}
      <span class="rs_right" on:click={toggleLists}>
        {comments.totalItems !== null ? comments.totalItems : comments} comments
      </span>
    {/await}
    {#await announces then announces}
      <span class="rs_right" on:click={toggleLists}>{announces} announces</span>
    {/await}
  </div>
  {#if $session.user}
    <div class="ra">
      <button class="ra_item">
        Like{#if liked}d{/if}
      </button>
      <button class="ra_item" on:click={togglePublish}>Add comment</button>
      <button class="ra_item" on:click={doAnnounce}>
        Announce{#if announced}d{/if}
      </button>
    </div>
    {#if showPublish}
      <Publish reply={post} {session} />
    {/if}
  {/if}
  {#await comments then collection}
    {#if collection.totalItems}
      <div class="comments">
        <Collection {session} {collection} />
      </div>
    {/if}
  {/await}
</div>
