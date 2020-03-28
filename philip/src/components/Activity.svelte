<script>
  import Post from "./Post.svelte";
  import Header from "./Post/Header.svelte";
  import { xhr, ensureObject } from "../utils";

  export let post, session, content;

  let pgi = pubgate_instance;
  let postObject, isReply;
  let isReaction = false;

  if (content == "replies") {
      post.object.type = "Reply"
  } else if (["Announce", "Like"].includes(post.type) || post.object.inReplyTo) {
    postObject = pgi ? post.object : ensureObject(post.object);
    isReaction = true;
    if (postObject.inReplyTo) {
        isReply = true;
        postObject.type = "Reply"
        if (typeof postObject.inReplyTo !== 'string'){
            postObject.inReplyTo.type = "To " + postObject.inReplyTo.type
        }
    }
  }
</script>

<style>
  .reaction {
    margin-left: 30px;
  }
</style>

<li class="post">
  {#if content == "replies"}
      <div class="reaction">
        <Post post={post.object} {session}/>
      </div>
  {:else}
      <h2 id="">.</h2>
      {#if isReaction == false}
        <Post post={post.object} {session}/>
      {:else}
        {#if isReply}
          <Post post={postObject} {session}/>
            <div class="reaction">
                <Post post={post.object.inReplyTo} {session}/>
            </div>
        {:else}
          <Header {post} />
            <div class="reaction">
                <Post post={postObject} {session}/>
            </div>
        {/if}

      {/if}
  {/if}
</li>
