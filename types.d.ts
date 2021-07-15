

export default function attachStack(): Stack;


export interface Stack {

  /**
   * Pushes this new path onto the stack. If there was an active action on top of the stack, it's
   * cleared first. This operation is always synchronous.
   */
  push(path: string, arg?: {state?: any, title?: string}): void;

  /**
   * Sets this to action mode, normally pushing something to the browser's real history stack.
   * Does not change the current URL.
   *
   * This operates specially if the stack is at its top. It instead replaces the current history
   * entry, so a user going Back with their browser will close the current page. This is a
   * limitation of the History API.
   *
   * Also, if the stack is at its top, any forward state will also be retained (it can't be cleared
   * via a pushState, because then we can't clear the action later). However, going forward and
   * then back to the action will remove/clear the action in favor of the original page.
   */
  setAction(state: any): void;

  /**
   * Replaces the current stack entry with a new URL. This funtions the same whether this is
   * currently an action or not.
   */
  replace(path: string?, arg?: {state?: any}): void;

  /**
   * Attempts to pop the current stack entry and remove it from forward navigation. This is usually
   * asynchronous, and you cannot pop again during the async action (will throw).
   *
   * Returns false if this could not actually pop (i.e., canPop would return false).
   */
  pop(): Promise<boolean>;

  /**
   * Performs an improved 'back'. Clears any current action in favour of an actual browser back.
   * Returns false if this could not move because the site would close.
   */
  back(): Promise<boolean>;

  /**
   * Returns the URL that would be loaded if the back method was invoked. (The browser's back
   * button might not restore the same page.)
   */
  pageForBack: readonly string?;

  /**
   * Whether the stack can be popped.
   */
  canPop: readonly boolean;

  isReady: readonly boolean;

  ready: readonly Promise<void>;

  depth: readonly number;

  isAction: readonly boolean;

  state: readonly any;

  actionState: readonly any;

  /**
   * Is this the initial state, and why was it caused?
   *
   *   - 'restore': a user has opened us after being on another site via History
   *   - 'new': a brand new encouter with this user
   *
   */
  initial: readonly '' | 'restore' | 'new';

  addListener(listener: () => void): void;

}
