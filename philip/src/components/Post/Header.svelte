<script>
  export let post;

  console.log('----    header', post)
  let userId = post.hasOwnProperty("actor") ? post.actor : post.attributedTo;
  if( typeof userId !== 'string' ) {
      console.log('------     header after exract', userId, post)
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
