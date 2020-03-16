<script>
  export let post;
  export let session;
  import Post from "./Post.svelte";
  import { xhr, ensureObject } from "../utils";

  let pgi = pubgate_instance;
  let postObject;
  let isReaction = false;

  if (["Announce", "Like"].includes(post.type)) {
     postObject = pgi
      ? post.object
      : ensureObject(post.object);
    isReaction = true;
  }
</script>

<style>
  .reaction {
    margin-left: 30px;
  }
</style>

<li class="post">
  {#if isReaction == false}
    <h2 id="">.</h2>
    <Post post={post.object} {session} />
  {:else}
    <div class="metadata">
      <h2 id="">.</h2>
      <a href={post.id}>{post.type}</a>
      by user
      <a href={post.actor}>{post.actor}</a>
      <span class="metadata-seperator">·</span>

      {#if post.published}
        <span>{post.published.replace('T', ' ').replace('Z', ' ')}</span>
      {/if}
    </div>
    <div class="reaction">
      <Post post={postObject} {session} />
    </div>
  {/if}
</li>
