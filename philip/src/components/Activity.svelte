<script>
  import Post from "./Post.svelte";
  import Header from "./Post/Header.svelte";
  import { xhr, ensureObject } from "../utils";

  export let post;
  export let session;

  let pgi = pubgate_instance;
  let postObject;
  let isReaction = false;

  if (["Announce", "Like"].includes(post.type) || post.object.inReplyTo) {
    postObject = pgi ? post.object : ensureObject(post.object);
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
    <Post post={post.object} {session} />
  {:else}
    <Header {post} />
    <div class="reaction">
      <Post post={postObject} {session} />
    </div>
  {/if}
</li>
