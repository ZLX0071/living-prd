export function shell({ active = '', content = '', nav } = {}) {
  const links = nav || [
    { href: './components.html', label: '组件', pageId: 'components' },
    { href: './states.html', label: '状态', pageId: 'states' },
  ];
  const navHtml = links.map((link) => `<a class="button${link.pageId === active ? ' primary' : ''}" href="${link.href}" data-nav="${link.pageId}">${link.label}</a>`).join('');
  return `<div class="app-shell"><header class="topbar"><div class="wordmark">▲ 面试陪练</div><nav>${navHtml}</nav></header>${content}</div>`;
}

export function mount(content) {
  document.querySelector('#app').innerHTML = content;
}

document.addEventListener('click', (event) => {
  const target = event.target.closest('[data-nav]');
  if (!target || window.parent === window) return;
  window.parent.postMessage({ type: 'living-prd:navigate', pageId: target.dataset.nav }, window.location.origin);
});
