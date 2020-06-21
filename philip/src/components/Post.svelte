<script>
  export let post, session;

  import PostContent from "./Post/Content.svelte";
  import Header from "./Post/Header.svelte";
  import Tags from "./Post/Tags.svelte";
  import Collection from "./Collection.svelte";
  import Publish from "./Publish.svelte";

  let pgi = pubgate_instance;
  let showPublish = false;
  let content = "replies";

  let inReply;
  let isReply = false;

  let isID = typeof post === 'string';
  let skip_comments;
  if (!isID && post.type.startsWith("To")){
    skip_comments = true
  }
  let tags = post.tag;

  const fetchItem = path => {
    let headers = { Accept: "application/activity+json" };
    return fetch(path, { headers })
      .then(d => d.json())
      .then(d => d);
  };


  const togglePublish = ev => {
    ev.preventDefault();
    showPublish = !showPublish;
  };

  const toggleLists = ev => {
    ev.preventDefault();
  };

  const getCount = async (item, returnAll = false) => {
    if (!item) return "n/a";
    const data = typeof item === "string" && !pgi ? await fetchItem(item): item;
    return returnAll ? data : data.totalItems;
  };

  let likes = getCount(post.likes);
  let comments = getCount(post.replies, true);
  let announces = getCount(post.shares);

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

  async function doLike(ev) {
    ev.preventDefault();
    if (!liked) {
      let recipients = post.attributedTo !== $session.user.url ? [post.attributedTo] : []
      let ap_object = {
        type: "Like",
        object: post.id,
        cc: recipients,
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
      let recipients = post.attributedTo !== $session.user.url ? [post.attributedTo] : []
      let ap_object = {
        type: "Announce",
        object: post.id,
        cc: recipients,
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
    <a href="{post}">{post}</a>
{:else}
    <Header {post}/>
    <Tags {tags} />
    <PostContent {post} />
    <div>
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
          <button class="btn btn-dark ra_item" on:click={doLike}>
            Like{#if liked}d{/if}
          </button>
          <button class="btn btn-dark ra_item" on:click={togglePublish}>Add comment</button>
          <button class="btn btn-dark ra_item" on:click={doAnnounce}>
            Announce{#if announced}d{/if}
          </button>
        </div>
        {#if showPublish}
          <Publish reply={post} {session} />
        {/if}
      {/if}
      {#if !skip_comments}
          {#await comments then collection}
            {#if collection.totalItems}
              <div class="comments">
                <Collection {collection} {session} {content}/>
              </div>
            {/if}
          {/await}
      {/if}
    </div>

{/if}
