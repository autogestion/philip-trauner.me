<script>
  import { onDestroy } from "svelte";

  export let routes;
  export let curRoute;
  if ($curRoute === "/") curRoute.set("/local");

  export let updateSession;
  export let session;

  let component;

  const unsubscribe = curRoute.subscribe(value => {
    const page = routes[$curRoute];
    let objectMatch = $curRoute.match(/^\/@([^\/]+)\/object\/(.+)$/);
    let userMatch = $curRoute.match(/^\/@([^\/]+)\/?$/);
    if (page) component = page.component;
    else if (objectMatch) component = routes.object.component;
    else if (userMatch) component = routes.user.component;
    if (!component) component = routes.error.component;
  });
  onDestroy(unsubscribe);
</script>

<style>

</style>

<div class="content">
  <svelte:component
    this={component}
    {curRoute}
    {session}
    on:updatesession={updateSession} />
</div>
