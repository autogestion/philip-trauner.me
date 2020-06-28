<script>
  export let selectTab;
  export let curRoute;
  export let routes;
  export let path;
  let url = window.location.origin + path;
  let name = routes[path].name;

  function redirectTo(event) {
    // change current router path
    selectTab(event.target);
    const path = event.target.pathname;
    curRoute.set(path);

    // push the path into web browser history API
    window.history.pushState({ path }, "", url);
  }
</script>

<style>
  a {
    text-transform: uppercase;
    text-decoration: underline;
    padding: 1rem;
  }
</style>

<li>
  <a href={path} on:click|preventDefault={redirectTo}>{name}</a>
</li>
