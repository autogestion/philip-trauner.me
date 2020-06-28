<script>
  export let post, session, showComments;

  import PostContent from "./Post/Content.svelte";
  import Header from "./Post/Header.svelte";
  import Tags from "./Post/Tags.svelte";
  import Overlay from "./Post/Overlay.svelte";
  import Collection from "./Collection.svelte";
  import Publish from "./Publish.svelte";

  import { fetchJSON, outboxPost } from "../utils";

  let pgi = pubgate_instance;
  let showPublish = false;
  let content = "replies";

  let inReply;
  let isReply = false;

  let isID = typeof post === "string";
  // let skip_comments;
  // if (!isID && post.type.startsWith("To")) skip_comments = true;
  let tags = post.tag;

  const togglePublish = ev => {
    ev.preventDefault();
    showPublish = !showPublish;
  };
  const toggleShowComments = ev => {
    ev.preventDefault();
    showComments = !showComments;
  };

  const getReactions = async item => {
    if (!item) return "n/a";
    const data = typeof item === "string" && !pgi ? await fetchJSON(item) : item;
    // TODO only fetch on hover?
    // Should be in cache with backend caching. With FE-caching, IDK

    // TODO mastodon returns first as string: totalItems is higher level than first
    // Not critical with BE caching
    if (typeof data.first === "string") console.log("first is string", data);

    return data;
  };

  let likes = getReactions(post.likes);
  let comments = getReactions(post.replies);
  let announces = getReactions(post.shares);

  let liked;
  let announced;
  if ($session.user && post.reactions) {
    if (post.reactions.Like) {
      if (post.reactions.Like[$session.user.name]) liked = true;
    } else if (post.reactions.Announce) {
      if (post.reactions.Announce[$session.user.name]) announced = true;
    }
  }

  const headers = { Authorization: "Bearer " + $session.token };

  // TODO is it possible to pass type (Like or Announce) and catch event to combine functions?
  // Yes
  const doLike = async ev => {
    ev.preventDefault();
    if (liked) return;
    const object = post.id;
    const cc = [post.attributedTo];
    const body = JSON.stringify({ type: "Like", object, cc });
    const res = await outboxPost($session, body);
    liked = true;
  };

  const doAnnounce = async ev => {
    ev.preventDefault();
    if (announced) return;
    const object = post.id;
    const cc = [post.attributedTo];
    const body = JSON.stringify({ type: "Announce", object, cc });
    const res = await outboxPost($session, body);
    announced = true;
  };
</script>

<style>
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
  button {
    border: none;
    background: none;
  }
  .comments {
    padding-left: 15px;
    border-left: 3px solid #ff0;
  }
</style>

{#if isID}
  <a href={post}>{post}</a>
{:else}
  <Header {post} />
  <Tags {tags} />
  <PostContent {post} />
  <div>
    <div class="rs">
      {#await likes then likes}
        <span class="rs_left">
          <Overlay label={`${likes.totalItems} likes`} data={likes.first} />
        </span>
      {/await}
      {#await comments then comments}
        <span class="rs_right" on:click={toggleShowComments}>
          {comments.totalItems} comments
        </span>
      {/await}
      {#await announces then announces}
        <span class="rs_right">
          <Overlay
            label={`${announces.totalItems} announces`}
            data={announces.first} />
        </span>
      {/await}
    </div>
    {#if $session.user}
      <div class="ra">
        <button class="btn btn-dark ra_item" on:click={doLike}>
          Like
          {#if liked}d{/if}
        </button>
        <button class="btn btn-dark ra_item" on:click={togglePublish}>
          Add comment
        </button>
        <button class="btn btn-dark ra_item" on:click={doAnnounce}>
          Announce
          {#if announced}d{/if}
        </button>
      </div>
      {#if showPublish}
        <Publish reply={post} {session} />
      {/if}
    {/if}
    {#if showComments}
      {#await comments then collection}
        {#if collection.totalItems}
          <div class="comments">
            <Collection {collection} {session} {content} />
          </div>
        {/if}
      {/await}
    {/if}
  </div>
{/if}
