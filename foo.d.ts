


export interface Stack {

  /**
   * Pushes this new path onto the stack. If there was an active action on top of the stack, it's
   * cleared first. This operation is always synchronous.
   */
  push(path: string): void;

  /**
   * Pushes a new action onto the stack. If the URL is unspecified, uses the current URL.
   *
   * This operates specially if the stack is at its top. It instead replaces the current history
   * entry, so a user going Back with their browser will close the current page. This is a
   * limitation of the History API.
   *
   * Also, if the stack is at its top, any forward state will also be retained (it can't be cleared
   * via a pushState, because then we can't clear the action later). However, going forward and
   * then back to the action will remove/clear the action in favor of the original page.
   */
  setAction(path: string?): void;

  /**
   * Attempts to pop the current stack entry and remove it from forward navigation. This is usually
   * asynchronous, and you cannot pop again during the async action (will throw).
   *
   * Throws if this stack cannot currently pop.
   */
  pop(): Promise<void>;

  /**
   * Whether the stack can be popped.
   */
  canPop(): boolean;

  /**
   * Performs an improved 'back'. Clears any current action in favour of an actual browser back.
   * Returns false if this could not move because the site would close.
   */
  back(): Promise<boolean>;

  depth: readonly number;

  isAction: readonly boolean;

  isReady: readonly boolean;

  ready: readonly Promise<void>;

  addListener(listener: () => void): void;

}
