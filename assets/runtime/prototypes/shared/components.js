export function shell({ active = '', content = '' } = {}) {
  return `<div class="app-shell"><header class="topbar"><div class="wordmark">▲ Product</div><nav><a class="button" href="./components.html" data-nav="components">组件</a><a class="button" href="./states.html" data-nav="states">状态</a></nav></header>${content}</div>`;
}

export function mount(content) {
  document.querySelector('#app').innerHTML = content;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-nav]');
  if (!target || window.parent === window) return;
  window.parent.postMessage({ type: 'living-prd:navigate', pageId: target.dataset.nav }, window.location.origin);
});
