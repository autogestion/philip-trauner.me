<script>
  export let post, session;

  import PostContent from "./Post/Content.svelte";
  import Reactions from "./Post/Reactions.svelte";
  import Header from "./Post/Header.svelte";
  import Tags from "./Post/Tags.svelte";

  console.log('---     post', post);
  let isID = typeof post === 'string';
  let tags = post.tag
</script>

{#if isID}
    <a href="{post}">{post}</a>
{:else}
    <Header {post}/>
    <Tags {tags} />
    <PostContent {post} />
    <Reactions {post} {session} />
{/if}
