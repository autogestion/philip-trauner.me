<script>
  export let post;

  let userId = post.hasOwnProperty("actor") ? post.actor : post.attributedTo;
  // Pleroma could send actor as list
  if( typeof userId !== 'string' ) {
      userId = userId[0]
  }
  const userName = userId.replace(/^.+\@([^/@]+)$/, "$1");
</script>

<div class="metadata">
  <a href={post.id}>{post.type}</a>
  by
  <a href={userId}>{userName}</a>
  <span class="metadata-seperator">·</span>
  <span>{post.published.replace('T', ' ').replace('Z', ' ')}</span>
</div>
