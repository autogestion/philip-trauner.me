<script>
  import { getCreateObject, getHashTag, getMention } from "../utils/pubGate";
  import { getUserId, outboxPost } from "../utils";

  export let reply = null;
  export let session;
  export let curRoute;

  let inProgress = false;
  let content = "";
  let error = "";

  const hashTagMatcher = /(^|\W)(#[^#\s]+)/gi;
  const mentionMatcher = /(^|\W)@([^@\s]+)(@([^@\s]+))?/gi;

  const wrapHashTagsWithLink = text =>
    text.replace(hashTagMatcher, '$1<a href="" rel="tag">$2</a>');

  const getAllHashTags = text => text.match(hashTagMatcher) || [];
  const getAllMentions = text => [...text.matchAll(mentionMatcher)] || [];

  const wrapLinksWithTags = text =>
    text.replace(/( https?:\/\/([^\s]+))/gi, '<a href="$1">$2</a>');

  const handleSubmit = async event => {
    event.preventDefault();
    inProgress = true;

    const tags = getAllHashTags(content)
      .map(v => v.trim())
      .map(getHashTag);
    content = wrapHashTagsWithLink(wrapLinksWithTags(content));

    // parse and replace mentions
    const mentions = getAllMentions(content).map(m => {
      const orig = m[0];
      const name = m[2];
      const domain = m[4];
      const id = getUserId(name, domain);
      const wrapped = `${m[1]}<span class='h-card'><a href="${id}"' class='u-url mention'>@<span>${name}</span></a></span>`;
      content = content.replace(orig, wrapped);
      return getMention(name, id);
    });
    let ap_object = getCreateObject(content, tags.concat(mentions));
    ap_object.cc = mentions.map(m => m.href);

    if (reply) {
      ap_object.object.inReplyTo = reply.id;
      if (reply.attributedTo !== $session.user.url) {
        ap_object.cc = ap_object.cc.concat(reply.attributedTo);
      }
    }
    const body = JSON.stringify(ap_object);
    const res = await outboxPost($session, body);
    if (res.error) error = res.error;
    else if (res.Created !== "success")
      error = "Failed to create post: " + JSON.stringify(res);
    else {
      // TODO change route to show post?
      content = "";
    }
    inProgress = false;
  };
</script>

<style>
  textarea {
    width: 100%;
  }
</style>

<form on:submit={handleSubmit}>

  <fieldset class="form-group">
    <textarea
      class="form-control"
      placeholder="Write your text here"
      bind:value={content} />
  </fieldset>

  <button
    class="btn btn-sm pull-xs-right btn-info"
    disabled={!content || inProgress}>
    Publish
  </button>

</form>

<p class="text-danger">{error}</p>
