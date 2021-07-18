import attach from '../stack.js';
import { blaps } from './content.js';

const stack = attach();

stack.addListener(() => {
  refresh();
});



const mainElement = /** @type {HTMLElement} */ (document.querySelector('main'));
const footerElement = /** @type {HTMLElement} */ (document.querySelector('footer'));
const dialogElement = /** @type {HTMLElement} */ (document.querySelector('.dialog'));
const headerElement = /** @type {HTMLElement} */ (document.querySelector('header'));
const headerAnchorElement = /** @type {HTMLAnchorElement} */ (headerElement.querySelector('a'));
const headerPageElement = /** @type {HTMLElement} */ (headerElement.querySelector('.page'));


function dialogHasFocus() {
  return document.activeElement === dialogElement || dialogElement.contains(document.activeElement);
}


// Steal the top link. If it's clicked while the action is open, just close the action.
// This remains a link because perhaps we want to open it in a new tab.
headerAnchorElement.addEventListener('click', (event) => {
  if (stack.isAction) {
    stack.pop();
    event.preventDefault();
  }
});


dialogElement.addEventListener('focusout', (event) => {
  if (dialogElement.hidden) {
    // If we were already closed then prevent this from popping twice.
    return;
  }

  // Don't close if we are focused within the dialog or the header.
  if (event.relatedTarget instanceof HTMLElement) {
    if (dialogElement.contains(event.relatedTarget)) {
      return;
    }
    if (headerElement.contains(event.relatedTarget)) {
      return;
    }
  }

  headerAnchorElement.click();
});


// Button handler for "yes" and "no" buttons.
dialogElement.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }
  const closest = event.target.closest('button');
  if (!closest) {
    return;
  }
  event.preventDefault();
  headerAnchorElement.click();
});


/**
 * @param {(typeof blaps[0])|undefined} blap
 */
function renderBlap(blap, only = false) {
  const classPart = only ? 'class="only"' : '';
  if (!blap) {
    return `
<section ${classPart}>
  <h2><span>?</span></h2>
  <p><em>Unknown blap!</em></p>
</section>
    `;
  }

  // nb. This does absolutely zero escaping.
  return `
<section data-id="${blap.id}" ${classPart}>
  <h2><span>${blap.by}</span></h2>
  <p><a href="#${blap.id}">${blap.content}</a></p>
  <div class="actions">
    <button class="retweet">🔄 Retweet</button>
  </div>
</section>
  `;
}


function refresh() {
  mainElement.textContent = '';
  footerElement.textContent = '';

  const blapId = window.location.hash.substr(1);
  if (blapId) {
    const blap = blaps.find(({ id }) => blapId === id);
    mainElement.innerHTML = renderBlap(blap, true);
    headerPageElement.textContent = 'Blap';
  } else {
    const parts = blaps.map((blap) => renderBlap(blap));
    mainElement.innerHTML = parts.join('');
    headerPageElement.textContent = '';
  }

  dialogElement.toggleAttribute('hidden', !stack.isAction);
  if (stack.isAction) {
    if (!dialogHasFocus()) {
      dialogElement.focus();
    }
  }

  // Render information about the current state.

  /** @type {string[]} */
  const dots = [];

  let backAction = 'Close the site (first in history)';
  const pageForUserBack = stack.pageForUserBack;
  if (pageForUserBack !== null) {
    if (stack.isAction) {
      backAction = 'Pop the top action';
    } else {
      backAction = `Load <code>${pageForUserBack}</code>`;
    }
  }
  dots.push(`User going "Back" will: <span>${backAction}</span>`);

  if (stack.initial) {
    dots.push(`This is the initial page due to: <span>${stack.initial}</span>`);
  }

  if (stack.isAction) {
    dots.push(`Reload will clear action`);
  }

  footerElement.innerHTML = dots.map((s) => `<li>${s}</li>`).join('');
}

document.body.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }
  const closest = event.target.closest('button.retweet');
  if (!closest) {
    return;
  }

  const closestId = closest.closest('[data-id]');
  const id = closestId?.getAttribute('data-id');
  if (!id) {
    return;
  }

  stack.setAction({ retweet: id });
});