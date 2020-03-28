<script>
  export let tags;
</script>

<div class="tags">
  {#each tags as tag}
    {#if tag.type == 'Hashtag'}
      <a class="tag" href={tag.href}>{tag.name}</a>
    {/if}
  {/each}
</div>
