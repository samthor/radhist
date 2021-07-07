
import * as types from './foo';


let attached = false;
const hist = window.history;


/**
 * @return {types.Stack}
 */
export function attachStack() {
  if (attached) {
    throw new Error(`can only attach once`);
  }
  attached = true;

  console.warn('h', window.history.length);

  return new StackImpl();
}


/**
 * @typedef {{
 *   depth: number,
 *   prevUrl: string | null,
 *   action?: true,
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
  #duringPop = false;

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
        p = this.pop();
      }
    } else {
      this.#depth = 1;
      const state = {prevUrl: null, depth: this.#depth};
      hist.replaceState(state, '', null);
    }

    // Regardless, trigger async so user has time to add listeners.
    this.#readyPromise = p.then(() => {
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

    let state = hist.state;
    let isLinkClick = false;

    if (state === undefined || (typeof state?.depth !== 'number')) {
      // This will happen only if a user clicked on an internal #-link.
      console.warn('internal link');
      state = {
        depth: (this.#depth + 1),
        prevUrl: this.#url,
      };
      window.history.replaceState(state, '', null);
      isLinkClick = true;
    } else {
      state = {...state};
    }

    // FIXME: popstate might actually go SEVERAL forward or back

    const jump = state.depth - this.#depth;
    const direction = (Math.sign(state.depth - this.#depth));
    if (direction === 0) {
      throw new Error(`unexpected popstate, zero move`);
    }

    console.debug('moved by', jump);

    if (this.#wasAction) {
      let backBy = -1;

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
        backBy = -2;
      }

      if (direction === -1 && jump < -1) {

        // we were in state [top, ...stuff, last, action]
        
        // e.g., [top, page0, page1, page2, action]
        
        // we might be at |page0| now, so we have to push |page1| and |page2| before going
        // back that many pages

        // ... we don't know what page1, page2 etc was - got to history to go there?!


        // jump to page2, go back, push page2, go back to page0

        // TODO: we know prevUrl (previous frame had it), can skip go back - can just go and push

        (async () => {
          console.debug('INTENDED', this.#buildUrl());

          //         debugger;
          const p1 = this.#handlePopOnce();
          hist.go(-jump - 1);
          await p1;

          const url = this.#buildUrl();

          console.warn('gone forward to', url);

          const p2 = this.#handlePopOnce();
          hist.back();
          await p2;


          const prevUrl = this.#buildUrl();
          console.warn('gone back to right before that', prevUrl, history.length);
          const depth = this.#depth - 1;
          hist.pushState({prevUrl, depth, blah: 1}, '', url);
          console.warn('pushed state', history.state, history.length, 'page now', this.#buildUrl(), 'should be', url);

          const p3 = this.#handlePopOnce();
          hist.go(jump + 1);
          await p3;
          // do we care?

          console.warn('jumped back again to intended loc', this.#buildUrl());

          this.#depth = hist.state.depth;
          this.#wasAction = false;
          this.#url = this.#buildUrl();
          this.#announce();
        })();

        return;

//        throw new Error(`TODO: jump back more than one ${jump}`);
      }

      // This is the user going back from an action. We technically should pop it.
      if (state.action) {
        throw new Error(`action popped to action?`);
      }
      this.#depth = state.depth;
      this.#wasAction = false;

      this.#handlePopOnce(() => {
        // We're at the stack entry before the intended URL. Find its URL and ensure the new state
        // points back to it.
        state.prevUrl = this.#buildUrl();

        this.#url = intendedUrl;
        hist.pushState(state, '', intendedUrl);
        this.#announce();
      });
      hist.go(backBy);
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
        return;
      }

      throw new Error(`should not back/forward into action state`);
    }
    this.#depth = state.depth;

    this.#url = intendedUrl;
    this.#announce();
  };

  #buildUrl = () => {
    const l = window.location;
    return l.pathname + l.search + l.hash;
  };

  /**
   * @param {string} path
   */
  push(path) {
    const s = /** @type {StackState} */ (hist.state);
    if (s.action) {
      this.#wasAction = false;

      if (this.#depth > 1) {
        // We can simply take over this current action; prevUrl and depth remain the same.
        const state = {...s};
        delete state.action;
        hist.replaceState(state, '', path);
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

    hist.pushState(state, '', path);
    this.#url = this.#buildUrl();
    this.#announce();
  }

  /**
   * @param {string?} path
   */
  setAction(path) {
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

    const isVirtual = (this.#depth === 1);
    if (isVirtual) {
      // This isn't a real push - we don't have enough stack to deal with it.
      // This means that later pages are still here.
      // looks like [faux, ...rest]

      const state = {...s, action: true, prevUrl: this.#url};
      hist.replaceState(state, '', path);
    } else {
      // If we have depth to go back up past this action, then really push it.
      // Remember this depth will be >=3 now.
      ++this.#depth;
      const state = {...s, action: true, prevUrl: this.#url, depth: this.#depth};
      hist.pushState(state, '', path);
    }

    this.#wasAction = true;
    this.#url = this.#buildUrl();
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
      return;
    }

    // Otherwise, we pop as normal.
    if (this.#depth <= 2) {
      // can't pop!
      throw new Error('TODO: can\'t pop without enough depth to go into');
    }
    const target = hist.state.prevUrl;
    if (typeof target !== 'string') {
      throw new Error(`not sure what page to go to`);
    }
    const expectedDepth = this.#depth - 2;

    const p = this.#handlePopOnce(() => {
      if (hist.state?.depth !== expectedDepth) {
        throw new Error(`expected depth -2, was: ${hist.state.depth} vs expected ${expectedDepth}`);
      }
      this.#depth = hist.state.depth;

      // We're back two pages; now push what we actually want (doesn't trigger popstate).
      ++this.#depth;

      const prevUrl = this.#buildUrl();
      const state = {...history.state, prevUrl, depth: this.#depth};
      hist.pushState(state, '', target);

      this.#wasAction = false;
      this.#url = this.#buildUrl();
      this.#announce();
    });

    // Going forward or back isn't sync. We have to wait for the popstate handler to be called.
    // This handler will run after our already installed handler.
    hist.go(-2);

    return p;
  };

  async back() {
    const s = /** @type {StackState} */ (hist.state);

    if (s.action) {
      return this.pop().then(() => true);
    }

    if (this.depth === 1) {
      return false;
    }

    const p = new Promise((resolve) => {
      window.addEventListener('popstate', () => resolve(true), { once: true });
    });
    hist.back();

    return p;
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


