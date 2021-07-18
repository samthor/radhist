Radical HTML history library.
Inspired by [this tweetstorm](https://twitter.com/samthor/status/1412331912048254979).

The History API has a few limitations, and isn't well-suited to building app-like experiences on the web.
This has been [discussed in length](https://github.com/WICG/app-history), but as of mid-2021, has no serious movement from browser vendors.

# Usage

This replaces the History API (it still exists, but you shouldn't use it&mdash;`radhist` takes over).
Published on NPM.

```js
import attach from 'radhist';

const stack = attach();  // idempotent, will always return the same instance

// nb. You must not use the History API at this point; radhist handles all
// 'popstate' events and pushes carefully-crafted history state.

stack.addListener(() => {
  console.info('current URL', window.location, 'state', stack.state);
  if (stack.isAction) {
    console.info('...action state', stack.actionState);
  }
});

someButton.onclick = () => {
  stack.push('/new/path');

  // or, optionally:
  const state = { 'optional': state };
  const title = 'optional title';
  stack.push('#hash', { state, title });
};

backButton.onclick = () => {
  // pop the current page, removing it from stack (preventing user forward)
  if (stack.canPop) {
    stack.pop();
  }
};

openConfirmDialogButton.onclick = () => {
  // set an 'action state' (read on below)
  stack.setAction({ optional: 'state' });
};
```

# Library Features

This library adds a new _concept_, and a related capability.
But first, an example from Twitter (about Twitter)!
This library helps you implement this behavior, whether user-initated or programatically:

<video src="https://storage.googleapis.com/hwhistlr.appspot.com/assets/stackanimation.mp4" width="960" height="480"></video>

In the example, the user pops the third "retweet" state.
Because we have two buffer states, it can actually pop again and restore a 'new' middle state&mdash;removing the ability to press Forward in the user's browser.
Read on for what `radhist` can do. ⬇️📖

## Action State

This library lets you set an Action State.
It cannot change the current page's URL.

Setting this lets the user perform a temporary action that is not retained within the History API, yet still (usually^) allows the user to close it via the browser's Back button.

An example of this might be&mdash;you want to show a confirm modal, and allow the user to close it natively, but it won't reappear if the user reloads the site or sends its URL to a friend.

If the user closes the state, its entry is removed from the underlying History API.
They can't go Forward again and bring it back&mdash;this works via the mechanism described above, plus a few corner cases (site reload, the user pressing Back to go back many entries).

<small>^If you set an action state without any 'buffer' of History API entries, pressing Back will also leave the site.
This is similar to Twitter and Slack and other places that this library inspires, because there's no buffer of pages to work with.</small>

## Pop Capability

Much of the above is implemented via supporting the 'pop' capability.
If your history API has at least three entries, you can pop the current page and ensure that the user cannot hit Forward in their browser.

This works just like the video above suggests&mdash;technically, it goes back two pages and pushes the same page.
However, this library hides this implementation and simply calls you once.