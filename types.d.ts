/*
 * Copyright 2021 Sam Thorogood.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */


/**
 * Attaches to the History API, taking over its functionality.
 *
 * This is idempotent; calling it many times will give you back the same instance.
 */
export default function attachStack(): Stack;


export interface Stack {

  /**
   * Adds a listener for this stack. Listeners added immediately after this object was attached
   * will always be invoked for the initial state (asynchronously via microtask).
   */
  addListener(listener: () => void): void;

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
   * asynchronous, and you cannot pop again during the async action (will throw). This first closes
   * any current action.
   *
   * Returns false if this could not actually pop (i.e., canPop would return false).
   */
  pop(): Promise<boolean>;

  /**
   * Performs an improved 'back'. Pops any current action in favour of an actual browser back.
   * Returns false if this could not move because the site would close.
   */
  back(): Promise<boolean>;

  /**
   * Returns the URL that would be loaded if the back method was invoked. (The browser's back
   * button might not restore the same page.) Null if this cannot go back.
   */
  pageForBack: readonly string?;

  /**
   * Returns the URL that would be loaded if the user clicks 'back'. Null if this would leave the
   * site.
   */
  pageForUserBack: readonly string?;

  /**
   * Whether the stack can be popped.
   */
  canPop: readonly boolean;

  /**
   * Is this object ready to use?
   */
  isReady: readonly boolean;

  /**
   * Resolves asynchronously once this object is set up. In practice this only takes time if the
   * reloads a page that was previously an action, as this must be cleared.
   */
  ready: readonly Promise<void>;

  /**
   * The current depth (how many pages deep are they) into your site.
   */
  depth: readonly number;

  /**
   * Is this currently an action state?
   */
  isAction: readonly boolean;

  /**
   * Any current history state added via push.
   */
  state: readonly any;

  /**
   * The action state. Only available if isAction is true from a previous call to setAction.
   */
  actionState: readonly any;

  /**
   * Is this the initial state, and why was it caused?
   *
   *   - 'restore': a user has opened us after being on another site via History
   *   - 'new': a brand new encouter with this user
   *
   */
  initial: readonly '' | 'restore' | 'new';

}
