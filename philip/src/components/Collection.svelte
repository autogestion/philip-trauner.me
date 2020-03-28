<script>
  import { fetchCollection } from "../utils";
  import Activity from "./Activity.svelte";
  import Post from "./Post.svelte";
  import Header from "./Post/Header.svelte";
  export let collection, session, content;

  let pgi = pubgate_instance;

  // pagination
  let homeUrl, prevUrl, nextUrl, page;

  const selectPage = async query => {
    let args = query.split("?");
    let url = args.shift(); // pull out first argument
    if (pgi) args.push("cached=1");
    collection = await fetchCollection(`${url}?${args.join("&")}`, $session);
  };

  const updatePageLinks = d => {
    let pageMatch = /page=(\d+)$/.exec(d.id);
    page = pageMatch ? parseInt(pageMatch[1]) : 1;
    homeUrl = page > 1 && d.partOf ? d.partOf : null;
    prevUrl = page > 1 ? `${homeUrl}?page=${page - 1}` : null;
    nextUrl = d.next;
    if (d.first && d.totalItems === d.first.totalItems) nextUrl = null;
    return d.first ? d.first.orderedItems : d.orderedItems;
  };

  $: posts = updatePageLinks(collection);


</script>

<ul class="post-list">
  {#each posts as post}
        <Activity {post} {session} {content}/>
  {/each}
</ul>

{#if homeUrl || prevUrl || nextUrl}
  <div class="navigation">
    {#if homeUrl}
      <span on:click={() => selectPage(homeUrl)}>First</span>
    {/if}
    {#if prevUrl}
      <span on:click={() => selectPage(prevUrl)}>Previous</span>
    {/if}
    {#if page}
      <b>{page}</b>
    {/if}
    {#if nextUrl}
      <span on:click={() => selectPage(nextUrl)}>Next</span>
    {/if}
  </div>
{/if}
