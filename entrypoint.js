
import { attachStack } from "./stack";

const stack = attachStack();

let selfKey = (Math.random().toString(36));
let count = 0;

go.onclick = () => {
  const page = selfKey + '.' + (++count);
  stack.push('#' + page);
  document.title = page;
};

pop.onclick = () => {
  stack.pop().then(() => {
    console.info('pop done');
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


const log = /** @type {HTMLElement} */ (document.getElementById('log'));
stack.addListener(() => {
  log.textContent += `stack depth (depth=${stack.depth}, hist=${window.history.length}, action=${stack.isAction}): ${window.location.pathname + window.location.hash}\n`;
});



// window.addEventListener('popstate', (event) => {
//   log.textContent += `popstate (stack=${stack.depth}): now ${window.location.toString()}\n`;
// });