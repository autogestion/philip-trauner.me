<script>
  import Header from "./Header.svelte";
  import Tags from "./Tags.svelte";

  export let post;
  export let customType;
  if (customType) post.type = customType;
</script>

<style>
  .original {
    font-size: 0.75em;
  }
</style>

{#if post.id}
  <Header {post} />
  {#if post.tag}
    <Tags tags={post.tag} />
  {/if}

  <p>
    {@html post.content}
  </p>
  {#if post.attachment}
    {#each post.attachment as attachment}
      {#if attachment.type === 'Document' && attachment.mediaType.startsWith('image')}
        <img src={attachment.url} alt="image" />
      {/if}
    {/each}
  {/if}
{:else}
  <a class="original" href={post}>Original post</a>
{/if}
