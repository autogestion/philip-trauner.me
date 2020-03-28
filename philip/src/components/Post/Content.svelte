<script>
  export let post;
</script>

<style>
  .original {
    font-size: 0.75em;
  }
</style>

{#if post.id}
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
