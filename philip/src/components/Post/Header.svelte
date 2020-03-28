<script>
  export let post;

  const userId = post.actor || post.attributedTo;
  const userName = userId.replace(/^.+\@([^/@]+)$/, "$1");
</script>

<div class="metadata">
  <a href={post.id}>{post.type}</a>
  by
  <a href={userId}>{userName}</a>
  <span class="metadata-seperator">·</span>
  <span>{post.published.replace('T', ' ').replace('Z', ' ')}</span>
</div>
