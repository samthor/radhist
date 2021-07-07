


export interface Stack {

  /**
   * Pushes this new path onto the stack.
   */
  push(path: string): void;

  /**
   * Attempts to pop the current stack entry and remove it from forward navigation.
   */
  pop(): Promise<void>;

  /**
   * Approximates what the user would see if they triggered 'back' on their browser.
   */
  back(): void;

  depth: readonly number;

  addListener(listener: () => void): void;

}
