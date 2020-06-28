<script>
  import Post from "./Post.svelte";

  import { fetchLocal } from "../utils";

  export let curRoute;
  export let session;
  let pgi = pubgate_instance;
  let id = $curRoute.match(/^\/@([^\/]+)\/object\/(.+)$/)[2];
  let route = pgi ? $curRoute + "?cached=1" : $curRoute;
  let showComments = true

  $: object = fetchLocal(base_url + route);
</script>

{#await object}
  So you want to see object {id}?
{:then post}
  <Post {post} {session} {showComments} />
{/await}
