
import { attachStack } from "./stack";

const stack = attachStack();

let selfKey = (Math.random().toString(36));
let count = 0;

go.onclick = () => {
  stack.push('#' + selfKey + '.' + (++count));
};

pop.onclick = () => {
  stack.pop();
};

action.onclick = () => {
  stack.setAction('#' + selfKey + '.' + (++count) + '-action');
};


const log = /** @type {HTMLElement} */ (document.getElementById('log'));
stack.addListener(() => {
  log.textContent += `stack depth (depth=${stack.depth}, hist=${window.history.length}, action=${stack.isAction}): ${window.location.pathname + window.location.hash}\n`;
});



// window.addEventListener('popstate', (event) => {
//   log.textContent += `popstate (stack=${stack.depth}): now ${window.location.toString()}\n`;
// });