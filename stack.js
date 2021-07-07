
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
 * }}
 * @type {never}
 */
var StackState;


/**
 * @implements {types.Stack}
 */
class StackImpl {
  #depth = 0;
  #duringPop = false;

  /** @type {string?} */
  #url = null;

  /** @type {Set<() => void>} */
  #listeners = new Set();

  constructor() {
    window.addEventListener('popstate', this.#popstate);
    Promise.resolve().then(() => {
      this.#popstate();
    });
  }

  get depth() {
    return this.#depth;
  }

  #announce = () => {
    this.#listeners.forEach((listener) => listener());
  };

  /**
   * @param {PopStateEvent?} event
   */
  #popstate = (event = null) => {
    // we have a new state; it's either in the past and ours, or in the future and ours
    // in theory the stack code should never push a new state object, so blank === new

    const state = hist.state;

    if ((typeof state?.depth !== 'number')) {
      ++this.#depth;
      const state = { depth: this.#depth, prevUrl: this.#url };
      hist.replaceState(state, '', null);
    } else {
      this.#depth = state.depth;
    }

    const l = window.location;
    this.#url = l.pathname + l.search + l.hash;

    if (!this.#duringPop) {
      this.#announce();
    }
  };

  /**
   * @param {string} path
   */
  push(path) {
    if (path.startsWith('#')) {
      window.location.assign(path);
    } else {
      hist.pushState(null, '', path);
      this.#popstate();
    }

  }

  /**
   */
  pop() {
    if (this.#depth <= 2) {
      throw new Error('TODO');
    }
    if (this.#duringPop) {
      throw new Error(`don't call pop twice in same frame`);
    }

    this.#duringPop = true;

    /** @type {Promise<void>} */
    const p = new Promise((resolve, reject) => {
      const target = hist.state.prevUrl;
      if (typeof target !== 'string') {
        throw new Error(`not sure what page to go to`);
      }

      const expectedDepth = this.#depth - 2;

      // Don't do this in a Promise; we don't want to wait (?).
      const handler = () => {
        try {
          if (hist.state?.depth !== expectedDepth) {
            throw new Error(`expected depth -2`);
          }

          // We're back two pages; now push what we actually want (doesn't trigger popstate).
          hist.pushState(null, '', target);

          // Announce the final state by pretending popstate was called.
          this.#duringPop = false;
          this.#popstate();
        } catch (e) {
          reject(e);
        }
        resolve();
      };

      // Going forward or back isn't sync. We have to wait for the popstate handler to be called.
      // This handler will run after our already installed handler.
      window.addEventListener('popstate', handler, {once: true});
      hist.go(-2);
    });

    return p.finally(() => {
      this.#duringPop = false;
    });
  }

  back() {
    hist.back();
  }

  /**
   * @param {() => void} listener
   */
  addListener(listener) {
    this.#listeners.add(listener);
  }

}
