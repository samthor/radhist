
import * as types from './foo';


/** @type {StackImpl?} */
let impl = null;

const hist = window.history;


/**
 * @return {types.Stack}
 */
export function attachStack() {
  if (impl === null) {
    impl = new StackImpl();
  }
  return impl;
}


/**
 * @typedef {{
 *   depth: number,
 *   action?: true,
 *   state?: any,
 *   prevUrl: string | null,
 *   prevState?: any,
 * }}
 * @type {never}
 */
var StackState;


/**
 * @implements {types.Stack}
 */
class StackImpl {
  #url;
  #depth;
  #wasAction = false;
  /** @type {any} */
  #userState = null;

  #duringPop = false;

  // Stored when we have an action on top of the stack, in case the user goes far backwards.
  /** @type {StackState?} */
  #priorActionState = null;

  /** @type {string?} */
  #priorActionUrl = null;

  #isReady = false;

  /** @type {Promise<void>} */
  #readyPromise;

  /** @type {Set<() => void>} */
  #listeners = new Set();

  constructor() {
    window.addEventListener('popstate', this.#popstate);

    this.#url = this.#buildUrl();

    let p = Promise.resolve();

    if (hist.state) {
      const s = /** @type {StackState} */ (hist.state);
      this.#depth = s.depth;

      if (s.action) {
        // Reload should remove any pending action: it's transient.
        // This will be async if on the stack, sync otherwise.
        this.#wasAction = true;
        p = this.pop().then(() => {});  // make void
      }
    } else {
      this.#depth = 1;
      const state = {prevUrl: null, depth: this.#depth};
      hist.replaceState(state, '', null);
    }

    // Regardless, trigger async so user has time to add listeners.
    this.#readyPromise = p.then(() => {
      if (this.#wasAction || hist.state.action) {
        throw new Error(`can't start as action`);
      }

      // We might announce earlier, so we only properly set it here.
      this.#announce = () => {
        this.#listeners.forEach((listener) => listener());
      };
      this.#isReady = true;
      this.#announce();
    });
  }

  get isReady() {
    return this.#isReady;
  }

  get ready() {
    return this.#readyPromise;
  }

  get depth() {
    return this.#depth;
  }

  get isAction() {
    if (Boolean(hist.state?.action) !== this.#wasAction) {
      throw 1;
    }
    return Boolean(hist.state?.action);
  }

  get state() {
    /** @type {StackState} */
    const s = hist.state;
    if (s?.action) {
      // actions have no state (this might be 0th stack entry state)
      return undefined;
    }
    return this.#userState;
  }

  // nb. intentionally empty until replaced in ctor
  #announce = () => {};

  /**
   * @param {PopStateEvent} event
   */
  #popstate = (event) => {
    if (this.#duringPop) {
      return;
    }
    const intendedUrl = this.#buildUrl();

    // we have a new state; it's either in the past and ours, or in the future and ours
    // in theory the stack code should never push a new state object, so blank === new

    /** @type {StackState} */
    let state = hist.state;
    let isLinkClick = false;

    if (state === undefined || (typeof state?.depth !== 'number')) {
      // This will happen only if a user clicked on an internal #-link.
      state = {
        depth: (this.#depth + 1),
        prevUrl: this.#url,
      };
      if (this.#userState) {
        state.prevState = this.#userState;
      }
      window.history.replaceState(state, '', null);
      isLinkClick = true;
    } else {
      state = {...state};
    }

    const jump = state.depth - this.#depth;
    const direction = (Math.sign(state.depth - this.#depth));
    if (direction === 0) {
      throw new Error(`unexpected popstate, zero move`);
    }

    if (this.#wasAction) {
      if (this.#priorActionState === null || this.#priorActionUrl === null) {
        throw new Error(`action forward/back without previous state`);
      }

      if (direction === +1) {
        // This is a link forward from an action. Pop the action and replace the link.

        if (this.#depth === 1) {
          // This is a link forward from a fake action stack (or a move forward in history at any
          // jump size), we can't pop the first. This is fine, because on return, we remove the
          // action.
          // TODO: if the action had a special title, uhhhhh
          this.#depth = state.depth;
          this.#wasAction = false;
          this.#url = intendedUrl;
          this.#userState = undefined;

          this.#announce();
          return;
        }

        // We expect this to be a history entry already known.
        if (!isLinkClick) {
          throw new Error(`forward but had known state?!`);
        }
        if (jump !== 1) {
          throw new Error(`should not jump forward moer than one`);
        }

        // we have [...stuff, action, new]: pop two, add new
        state.depth--;

        this.#handlePopOnce(() => {
          // We're at the stack entry before the intended URL. Find its URL and ensure the new state
          // points back to it.
          state.prevUrl = this.#buildUrl();
          this.#userState = null;

          this.#depth = state.depth;
          this.#wasAction = false;
          this.#url = intendedUrl;
          hist.pushState(state, '', intendedUrl);
          this.#announce();
        });
        hist.go(-2);
        return;
      }

      // The user has gone back 1-n pages from a valid action. The stack looked like:
      //    [top, page0, page1, page2, action*]
      //
      // And now it might look like;
      //    [top, page0*, page1, page2, action]
      //
      // To solve this, we:
      //   (a) go forward to 2 behind the action (page1)
      //   (b) push page2
      //   (c) go back to where the user intended
      //
      // Note that we might already be at (a) or (c), so we check first.
      (async () => {
        // (a) go forward to 2 behind the action (we might already be here)
        const jumpTwoBack = (-jump - 2);
        if (jumpTwoBack !== 0) {
          const p1 = this.#handlePopOnce();
          hist.go(jumpTwoBack);
          await p1;
        }

        // (b) push page2, replacing it
        const prevUrl = this.#buildUrl();
        const depth = hist.state.depth + 1;
        /** @type {StackState} */
        const state = {prevUrl, depth};

        // We use priorActionState here because the user can only go back like this in normal
        // operation, where the user went forward to an action in the same browser window.
        if (this.#priorActionState?.state) {
          state.state = this.#priorActionState.state;
        }
        if (hist.state.state) {
        }
        hist.pushState(state, '', this.#priorActionUrl);

        // (c) go back to where the user intended (might already be here)
        const userJump = jump + 1;  // jump is -ve, so this is one closer
        if (userJump !== 0) {
          const p2 = this.#handlePopOnce();
          hist.go(userJump);
          await p2;
        }

        this.#setUserState(hist.state.state);
        this.#depth = hist.state.depth;
        this.#wasAction = false;
        this.#url = this.#buildUrl();
        this.#announce();
      })();
      return;
    }

    // This is a normal browser back/forward which we don't care about, including one that is many
    // steps (i.e., through the history UI). Announce it.

    if (state.action) {
      // Special-case going back to the initial faux action.
      if (direction === -1 && state.depth === 1) {
        this.#depth = 1;
        const url = state.prevUrl;
        state.prevUrl = null;
        delete state.action;
        hist.replaceState(state, '', url);
        this.#announce();
        // TODO: restore userState
        return;
      }

      throw new Error(`should not back/forward into action state`);
    }
    this.#depth = state.depth;
    this.#setUserState(state.state);

    this.#url = intendedUrl;
    this.#announce();
  };

  #buildUrl = () => {
    const l = window.location;
    return l.pathname + l.search + l.hash;
  };

  /**
   * @param {any} raw
   */
  #setUserState = (raw) => {
    if (raw && typeof raw === 'object') {
      const s = JSON.stringify(raw);
      this.#userState = Object.freeze(JSON.parse(s));
    } else {
      this.#userState = raw;
    }
  };

  /**
   * @param {string} path
   * @param {{state?: any, title?: string}} arg
   */
  push(path, arg = {}) {
    if (this.#duringPop) {
      throw new Error(`can't push during another op`);
    }

    const s = /** @type {StackState} */ (hist.state);
    const prevState = s.state;
    this.#setUserState(arg.state);

    if (s.action) {
      this.#wasAction = false;

      if (this.#depth > 1) {
        // We can simply take over this current action; prevUrl and depth remain the same.
        const state = {...s};
        delete state.action;
        if (arg.state) {
          state.state = arg.state;
        }
        if (prevState) {
          state.prevState = prevState;
        }
        hist.replaceState(state, arg.title ?? '', path);
        if (arg.title) {
          document.title = arg.title;
        }
        this.#url = this.#buildUrl();
        this.#announce();
        return;
      }

      // We have no depth. This action has taken over the top entry.
      // Clear it, then push our new regular path.
      const url = s.prevUrl;
      const state = {...s, prevUrl: null};
      delete state.action;
      hist.replaceState(state, '', url);
    }

    ++this.#depth;
    const state = {...s, depth: this.#depth, prevUrl: this.#url};
    delete state.action;  // in case this was an action
    if (arg.state) {
      state.state = arg.state;
    }
    if (prevState) {
      state.prevState = prevState;
    }
    hist.pushState(state, arg.title ?? '', path);
    if (arg.title) {
      document.title = arg.title;
    }
    this.#url = this.#buildUrl();
    this.#announce();
  }

  /**
   * @param {string?} path
   */
  setAction(path) {
    if (this.#duringPop) {
      throw new Error(`can't setAction during another op`);
    }

    const s = /** @type {StackState} */ (hist.state);

    // We're already an action. Just replace ourselves. We don't care whether this was a real
    // stack entry or not.
    if (s?.action) {
      if (!this.#wasAction) {
        throw new Error(`state.action !=== store.action`);
      }
      hist.replaceState(s, '', path);
      this.#url = this.#buildUrl();
      this.#announce();
      return;
    }

    const priorActionUrl = this.#buildUrl();
    this.#priorActionState = {...s};
    this.#priorActionUrl = priorActionUrl;

    const prevState = s.state;

    const isVirtual = (this.#depth === 1);
    if (!isVirtual) {
      ++this.#depth;
    }

    // generate new/virtual state
    const state = {...s, action: true, prevUrl: priorActionUrl, depth: this.#depth};
    if (prevState) {
      state.prevState = prevState;
    }
    delete state.state;

    if (isVirtual) {
      // This isn't a real push - we don't have enough stack to deal with it.
      // This means that later pages are still here.
      // looks like [faux, ...rest]
      hist.replaceState(state, '', path);
    } else {
      // If we have depth to go back up past this action, then really push it.
      // Remember this depth will be >=3 now.
      hist.pushState(state, '', path);
    }
    // nb. we don't clear #userState here - actions don't have it anyway and we need it for links

    this.#wasAction = true;
    this.#url = this.#buildUrl();  // after state replacement
    this.#announce();
  }

  canPop() {
    const s = /** @type {StackState} */ (hist.state);
    return s.action || this.#depth > 2;
  }

  #maybeClearFakeAction = () => {
    const s = /** @type {StackState} */ (hist.state);

    if (!s.action || this.#depth > 1) {
      return false;
    }

    // not really popping - just return to previous state
    const url = s.prevUrl;
    const state = {...s, prevUrl: null};
    delete state.action;

    if (state.prevState) {
      state.state = state.prevState;
      delete state.prevState;
    }

    hist.replaceState(state, '', url);
    this.#wasAction = false;

    this.#url = this.#buildUrl();
    return true;
  }

  async pop() {
    if (this.#duringPop) {
      throw new Error(`don't call pop twice in same frame`);
    }

    if (this.#maybeClearFakeAction()) {
      this.#announce();
      return true;
    }

    if (this.#depth <= 2) {
      // can't pop!
      return false;
    }

    // Otherwise, we pop as normal. This can include an action.
    const target = hist.state.prevUrl;
    if (typeof target !== 'string') {
      throw new Error(`not sure what page to go to`);
    }
    const expectedDepth = this.#depth - 2;

    const beforePopHistoryState = {...hist.state};

    const p = this.#handlePopOnce(() => {
      if (hist.state?.depth !== expectedDepth) {
        throw new Error(`expected depth -2, was: ${hist.state.depth} vs expected ${expectedDepth}`);
      }
      this.#depth = hist.state.depth;

      // TODO: need to store previousState in stack

      // We're back two pages; now push what we actually want (doesn't trigger popstate).
      ++this.#depth;

      const prevUrl = this.#buildUrl();
      /** @type {StackState} */
      const state = {prevUrl, depth: this.#depth};
      if (hist.state.state) {
        state.prevState = hist.state.state;
      }
      if (beforePopHistoryState.prevState) {
        state.state = beforePopHistoryState.prevState;
      }
      this.#setUserState(state.state);

      hist.pushState(state, '', target);

      this.#wasAction = false;
      this.#url = this.#buildUrl();
      this.#announce();
    });

    // Going forward or back isn't sync. We have to wait for the popstate handler to be called.
    // This handler will run after our already installed handler.
    hist.go(-2);

    return p.then(() => true);
  };

  /**
   * @param {string?} path
   * @param {{state?: any}} arg
   */
  replace(path, arg = {}) {
    if (this.#duringPop) {
      throw new Error(`can't replaceState during another op`);
    }

    if (hist.state.action && 'state' in arg) {
      throw new Error(`can't set state for action`);
    }

    const s = {...hist.state};
    if ('state' in arg) {
      s.state = arg.state;
      this.#setUserState(s.state);
    }

    hist.replaceState(s, '', path);
    this.#url = this.#buildUrl();
    this.#announce();
  }

  async back() {
    if (this.#duringPop) {
      throw new Error(`can't back during another op`);
    }

    const s = /** @type {StackState} */ (hist.state);

    if (s.action) {
      return this.pop().then(() => true);
    }

    if (this.depth === 1) {
      return false;
    }

    // TODO: this could be 'hist.back' + listener, because we want to be the browser here
    const p = this.#handlePopOnce();
    hist.back();
    return p.then(() => {
      const s = /** @type {StackState} */ (hist.state);

      this.#depth = s.depth;
      this.#setUserState(s.state);
      this.#url = this.#buildUrl();

      this.#announce();
      return true;
    });
  }

  /**
   * @param {() => void} listener
   */
  addListener(listener) {
    this.#listeners.add(listener);
  }

  /**
   * Runs a handler once, on `popstate`. This should be followed by an asynchronous call to the
   * History API which'll trigger this.
   *
   * @param {() => void} handler
   */
  #handlePopOnce = (handler = () => {}) => {
    if (this.#duringPop) {
      throw new Error(`can't nest handling pop`);
    }
    this.#duringPop = true;

    /** @type {Promise<void>} */
    const p = new Promise((resolve, reject) => {
      const internalHandler = () => {
        this.#duringPop = false;
        try {
          handler();
        } catch (e) {
          reject(e);
        }
        resolve();
      };
      window.addEventListener('popstate', internalHandler, { once: true });
    });

    return p;
  };
}


