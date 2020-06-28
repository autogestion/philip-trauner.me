<script>
  import Link from "./Link.svelte";

  export let routes;
  export let curRoute;

  export let selectTab;

  export let pgi;
  export let session;
</script>

<header id="navigation">
  <ul>
    {#if pgi == true}
      <Link {curRoute} {selectTab} {routes} path="/local" />
      <Link {curRoute} {selectTab} {routes} path="/federated" />
    {/if}
    {#if $session.user}
      <Link {curRoute} {selectTab} {routes} path="/inbox" />
      <Link {curRoute} {selectTab} {routes} path="/create" />
      <Link {curRoute} {selectTab} {routes} path="/search" />
    {/if}
    <Link {curRoute} {selectTab} {routes} path="/profile" />
    <Link {curRoute} {selectTab} {routes} path="/about" />
  </ul>
</header>
