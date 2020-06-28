<script>
  import TimeLine from "./TimeLine.svelte";

  import { fetchLocal } from "../utils";
  import { createEventDispatcher } from "svelte";
  const dispatch = createEventDispatcher();

  export let curRoute;
  export let session;

  let username = "";
  let password = "";
  let summary = "";
  let avatar = "";
  let invite = "";
  let errorLogin = "";
  let errorRegister = "";

  const login = async event => {
    errorLogin = "";
    console.log("loggin in");
    const profile = await fetchLocal(base_url + "/@" + username).catch(error =>
      console.log("login failed", error)
    );
    if (!profile) {
      errorLogin = "login failed";
      return;
    }
    if (profile.error) {
      errorLogin = profile.error;
      return;
    }
    console.log("login result", profile);
    if (!profile.endpoints) {
      console.log("BUG profile.endpoints doesn't exist.");
      return;
    }
    console.log("fetching token", profile.endpoints.oauthTokenEndpoint);
    const tokenUrl = profile.endpoints.oauthTokenEndpoint;
    const body = JSON.stringify({ username, password });
    const token = await fetchLocal(tokenUrl, { method: "POST", body });

    let temp = $session;
    if (token.access_token) {
      let newSession = $session;
      newSession.user = profile;
      newSession.token = token.access_token;
      dispatch("updatesession", newSession);
    } else console.log("token result", token);
  };

  const logout = async event => dispatch("updatesession", {});
  const register = async event => {
    const icon = { type: "Image", mediaType: "image/jpeg", url: avatar };
    const profile = { type: "Person", name: username, summary, icon };
    const body = JSON.stringify({ username, password, invite, profile });
    const user = await fetchLocal(base_url + "/user", { method: "POST", body });

    if (user.profile) await login({});
    else if (user.error) errorRegister = user.error;
    else console.log("register failed:", user);
  };
</script>

{#if $session.user}
  <h2>
    <a href={$session.user.url}>{$session.user.name}</a>
    <button class="btn btn-sm pull-xs-right btn-info" on:click={logout}>
      Logout
    </button>
  </h2>
  {$session.user.summary}
  <TimeLine {curRoute} {session} />
{:else}
  <div class="form-group">
    Sign-in ( ActivityPub compatible, OAuth2 password grant )
  </div>

  <form on:submit|preventDefault={login}>
    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        type="username"
        placeholder="Username"
        bind:value={username} />
    </fieldset>
    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        type="password"
        placeholder="Password"
        bind:value={password} />
    </fieldset>
    <button
      class="btn btn-sm pull-xs-right btn-info"
      type="submit"
      disabled={!username || !password}>
      Sign in
    </button>
    <span class="text-danger">{errorLogin}</span>
  </form>
  <br />
  <br />
  or register ( PubGate only )
  <br />
  <form on:submit|preventDefault={register}>
    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        type="text"
        placeholder="Username"
        bind:value={username} />
    </fieldset>
    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        type="password"
        placeholder="Password"
        bind:value={password} />
    </fieldset>
    <fieldset class="form-group">
      <textarea
        class="form-control"
        rows="8"
        placeholder="Profile Description"
        bind:value={summary} />
    </fieldset>
    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        type="text"
        placeholder="Avatar URL"
        bind:value={avatar} />
    </fieldset>
    <fieldset class="form-group">
      <input
        class="form-control form-control-lg"
        type="text"
        placeholder="Invite code"
        bind:value={invite} />
    </fieldset>

    <button
      class="btn btn-sm pull-xs-right btn-info"
      type="submit"
      disabled={!username || !password}>
      Register
    </button>
    <span class="text-danger">{errorRegister}</span>
  </form>
{/if}
