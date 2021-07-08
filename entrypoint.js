
import { attachStack } from "./stack";

const stack = attachStack();

let selfKey = (Math.random().toString(36));
let count = 0;

window._stack = stack;

go.onclick = () => {
  const page = selfKey + '.' + (++count);
  stack.push('#' + page, {state: {count}});
  document.title = page;
};

pop.onclick = () => {
  stack.pop().then((ok) => {
    console.info('pop done', {ok});
  });
};

action.onclick = () => {
  stack.setAction(Math.random());
};

back.onclick = () => {
  stack.back().then((ok) => {
    console.warn('back done', {ok});
  });
};

replace.onclick = () => {
  /** @type {string?} */
  const url = window.location.hash + '-r';
  stack.replace(url, {state: {replaced: true}});
};


const log = /** @type {HTMLElement} */ (document.getElementById('log'));
stack.addListener(() => {
  log.textContent += `[h=${history.length}, d=${stack.depth}${stack.isAction ? ', action' : ''}]: ${window.location.pathname + window.location.hash} (state=${JSON.stringify(stack.state)}${stack.isAction ? `, actionState=${JSON.stringify(stack.actionState)}` : ''})\n`;
});



// window.addEventListener('popstate', (event) => {
//   log.textContent += `popstate (stack=${stack.depth}): now ${window.location.toString()}\n`;
// });