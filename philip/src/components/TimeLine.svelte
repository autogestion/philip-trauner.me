<script>
  export let curRoute;
  export let session;

  import { fetchCollection } from "../utils";
  import Collection from "./Collection.svelte";

  let pgi = pubgate_instance;
  let content = "timeline";

  const getTimeline = function(tab, session) {
    switch (tab) {
      case "/local":
        return pgi
          ? fetchCollection(base_url + "/timeline/local?cached=1")
          : [];
      case "/federated":
        return pgi
          ? fetchCollection(base_url + "/timeline/federated?cached=1")
          : [];
      case "/inbox":
        if (!session.user) return [];
        return pgi
          ? fetchCollection(session.user.inbox + "?cached=1", session, true)
          : fetchCollection(session.user.inbox, session);
      case "/profile":
        return pgi
          ? fetchCollection(session.user.outbox + "?cached=1")
          : fetchCollection(session.user.outbox);
      default:
        return [];
    }
  };

  $: timeline = getTimeline($curRoute, $session);
</script>

<style>
  .navigation {
  }
</style>

{#await timeline then collection}
  <Collection {collection} {session} {content}/>
{/await}
