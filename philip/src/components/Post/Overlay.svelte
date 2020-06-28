<script>
  import UserLink from "./UserLink.svelte";

  export let label;
  export let data;

  let items = [];
  let avatar;

  if (data) {
    //console.debug("rendering overlay", label, data);
    items = data.first ? data.first.orderedItems : data.orderedItems;
  }
</script>

<style>
  .overlay {
    -font: 3em;
  }
  .reaction-tooltip {
    display: none;
  }
  .overlay:hover .reaction-tooltip {
    display: block;
    position: absolute;
    -top: 100px;
    -bottom: 100px;
    border: solid 1px black;
  }
</style>

<div class="overlay">
  {label}
  {#if items.length}
    <div class="reaction-tooltip">
      {#each items as item}
        <UserLink id={item.actor} />
      {/each}
    </div>
  {/if}
</div>
