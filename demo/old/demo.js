
import { attach } from "../../stack.js";

const stack = attach();

const selfKey = (Math.random().toString(36));
let count = 0;

// export for testing
// @ts-ignore
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
    console.info('back done', {ok});
  });
};

replace.onclick = () => {
  /** @type {string?} */
  const url = window.location.hash + '-r';
  stack.replace(url, {state: {replaced: true}});
};


const log = /** @type {HTMLElement} */ (document.getElementById('log'));
stack.addListener(() => {
  let text = '';

  text += `[h=${history.length}, d=${stack.depth}${stack.isAction ? ', action' : ''}]: ${window.location.pathname + window.location.hash}\n`;

  /** @type {{[key: string]: any}} */
  const data = {
    'state': JSON.stringify(stack.state),
  };
  if (stack.isAction) {
    data['actionState'] = JSON.stringify(stack.actionState);
  }
  data['pageForBack'] = stack.pageForBack;
  data['canPop'] = stack.canPop;
  if (stack.initial) {
    data['initial'] = stack.initial;
  }

  const parts = Object.entries(data).map(([key, value]) => `${key}=${value}`)

  text += `... ${parts.join(', ')}\n`;
  text += '\n';

  log.prepend(document.createTextNode(text));

});

