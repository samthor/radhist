


export interface Stack {

  /**
   * Pushes this new path onto the stack. If there was an active action on top of the stack, it's
   * cleared first. This operation is always synchronous.
   */
  push(path: string): void;

  /**
   * Pushes or sets an action (depending on stuff)
   */
  setAction(path: string?): void;

  /**
   * Attempts to pop the current stack entry and remove it from forward navigation. This is usually
   * asynchronous, and you cannot pop twice (will throw).
   *
   * Throws if this stack cannot currently pop.
   */
  pop(): Promise<void>;

  /**
   * Whether the stack can be popped.
   */
  canPop(): boolean;

  /**
   * Approximates what the user would see if they triggered 'back' on their browser.
   */
  back(): void;

  depth: readonly number;

  isAction: readonly boolean;

  isReady: readonly boolean;

  ready: readonly Promise<void>;

  addListener(listener: () => void): void;

}
