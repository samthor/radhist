
import { attachStack } from "./stack";

const stack = attachStack();

let selfKey = (Math.random().toString(36));
let count = 0;

go.onclick = () => {
  stack.push('/' + selfKey + '.' + (++count));
};

pop.onclick = () => {
  stack.pop();
};


stack.addListener(() => {
  log.textContent += `stack depth (${stack.depth}): now ${window.location.toString()}\n`;
});



// window.addEventListener('popstate', (event) => {
//   log.textContent += `popstate (stack=${stack.depth}): now ${window.location.toString()}\n`;
// });