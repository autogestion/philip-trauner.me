<script>
  import Post from "./Post.svelte";
  import Header from "./Post/Header.svelte";
  import { ensureObject } from "../utils";

  export let post, session, content;

  let pgi = pubgate_instance;
  let postObject, isReply, isReaction;

  if (content == "replies") {
    post.object.type = "Reply";
  } else if (
    ["Announce", "Like"].includes(post.type) ||
    post.object.inReplyTo
  ) {
    postObject = pgi ? post.object : ensureObject(post.object);

    if (["Announce", "Like"].includes(post.type)) {
      isReaction = true;
    } else if (postObject.inReplyTo) {
      isReply = true;
      postObject.type = "Reply";
      if (typeof postObject.inReplyTo !== "string") {
        postObject.inReplyTo.type = "To " + postObject.inReplyTo.type;
      }
    }
  }
  let showComments = true;
  let notShowComments = false
</script>

<style>
  .reaction {
    margin-left: 30px;
  }
</style>

<li class="post">
  {#if content == 'replies'}
    <div class="reaction">
      <Post post={post.object} {session} showComments={showComments} />
    </div>
  {:else}
    <h2 id="">.</h2>
    {#if isReaction}
      <Header {post} />
      <div class="reaction">
        <Post post={postObject} {session} showComments={notShowComments} />
      </div>
    {:else if isReply}
      <Post post={postObject} {session} showComments={notShowComments} />
      <div class="reaction">
        <Post post={postObject.inReplyTo} {session} showComments={notShowComments} />
      </div>
    {:else}
      <Post post={post.object} {session} showComments={showComments} />
    {/if}
  {/if}
</li>
