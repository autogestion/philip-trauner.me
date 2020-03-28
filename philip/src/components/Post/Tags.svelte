<script>
  export let tags;
</script>

{#if tags}
    <div class="tags">
      {#each tags as tag}
        {#if tag.type == 'Hashtag'}
          <a class="tag" href={tag.href}>{tag.name}</a>
        {/if}
      {/each}
    </div>
{/if}