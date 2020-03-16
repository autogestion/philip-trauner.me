<script>
  export let post;
  export let session;

  import { ensureObject } from "../utils";
  import Publish from "./Publish.svelte";
  import PostContent from "./PostContent.svelte";

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

  let likes = "n/a";
  let comments = "n/a";
  let announces = "n/a";

  if (post.inReplyTo) {
    inReply = pgi
      ? post.inReplyTo
      : ensureObject(post.inReplyTo);
    isReply = true;
  }

  if (post.likes) {
    likes = post.likes.totalItems;
  }

  if (post.shares) {
    announces = post.shares.totalItems;
  }

  if (post.replies) {
    comments = post.replies.totalItems;
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
</style>

{#if isReply == true}
  <div class="reaction">
    {#if typeof inReply === 'object' && typeof inReply.id != 'string'}
      {#await inReply then value}
        <PostContent post={value} />
      {/await}
    {:else}
      <PostContent post={inReply} />
    {/if}
  </div>
{/if}

<PostContent {post} {customType} />

<div class="reactionz">
  <div class="rs">
    <span class="rs_left" on:click={toggleLists}>{likes} likes</span>
    <span class="rs_right" on:click={toggleLists}>{comments} comments</span>
    <span class="rs_right" on:click={toggleLists}>{announces} announces</span>
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
</div>
