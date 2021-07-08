
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
  const page = selfKey + '.' + (++count) + '-action';
  stack.setAction('#' + page);
  document.title = page;
};

back.onclick = () => {
  stack.back().then((ok) => {
    console.warn('back done', {ok});
  });
};

replace.onclick = () => {
  /** @type {string?} */
  const url = null; //window.location.hash + '-r';
  stack.replace(url, {state: {replaced: true}});
};


const log = /** @type {HTMLElement} */ (document.getElementById('log'));
stack.addListener(() => {
  log.textContent += `stack depth (depth=${stack.depth}, hist=${window.history.length}, action=${stack.isAction}): ${window.location.pathname + window.location.hash} (state=${JSON.stringify(stack.state)})\n`;
});



// window.addEventListener('popstate', (event) => {
//   log.textContent += `popstate (stack=${stack.depth}): now ${window.location.toString()}\n`;
// });