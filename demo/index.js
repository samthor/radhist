import attach from '../stack.js';
import { blaps } from './content.js';

const stack = attach();

stack.addListener(() => {
  console.info('state now', stack.state, 'action', stack.isAction, 'with url', window.location.toString());
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


headerAnchorElement.addEventListener('click', (event) => {
  if (stack.isAction) {
    stack.pop();
    event.preventDefault();
  }
});


dialogElement.addEventListener('focusout', (event) => {
  if (dialogElement.hidden) {
    return;
  }

  if (event.relatedTarget instanceof HTMLElement) {
    if (dialogElement.contains(event.relatedTarget)) {
      return;
    }

    if (headerElement.contains(event.relatedTarget)) {
      // We allow focus on the header.
      return;
    }
  }

  headerAnchorElement.click();
});


dialogElement.addEventListener('click', (event) => {
  if (!(event.target instanceof HTMLElement)) {
    return;
  }
  const closest = event.target.closest('button');
  if (!closest) {
    return;
  }
  event.preventDefault();
  stack.pop();
//  headerAnchorElement.click();
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

  footerElement.textContent = `depth=${stack.depth} prev=${stack.pageForBack}`;

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

  console.warn('set action');
  stack.setAction({ retweet: id });
});