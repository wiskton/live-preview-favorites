const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '..', 'content.js'), 'utf8');

function start(hostname) {
    const listeners = new Map();
    const intervals = [];
    const element = () => ({ style: {}, children: [], appendChild(child) { this.children.push(child); } });
    const body = element();
    const context = vm.createContext({
        location: { hostname, href: `https://${hostname}/example`, pathname: '/example' },
        chrome: {
            storage: { local: { get() {}, set() {} }, onChanged: { addListener() {} } },
            i18n: { getMessage: key => key === 'favoritesLabel' ? 'FAVORITOS' : key },
        },
        document: {
            body, createElement: element,
            addEventListener(name, callback) { listeners.set(name, callback); },
        },
        setInterval(callback, delay) { intervals.push({ callback, delay }); },
        setTimeout() {}, clearTimeout() {}, console,
    });
    vm.runInContext(source, context, { filename: 'content.js' });
    return { context, listeners, intervals, body };
}

for (const hostname of ['kick.com', 'www.twitch.tv']) {
    test(`script inicializa completamente em ${hostname}`, () => {
        const { listeners, intervals, body } = start(hostname);
        assert.equal(body.children.length, 1, 'prévia inserida no DOM');
        assert.ok(listeners.has('mouseover'));
        assert.ok(listeners.has('mouseout'));
        assert.equal(listeners.has('click'), hostname === 'www.twitch.tv');
        assert.equal(intervals.length, 4, 'todos os serviços de atualização registrados');
    });
}

test('Kick alterna FAV sem arrastar e FAVORITOS com arrastar', () => {
    const { context } = start('kick.com');
    let width = 60;
    const label = { textContent: '' };
    const handle = { style: {} };
    const item = {
        style: {}, draggable: true,
        querySelector: () => null,
        querySelectorAll: selector => selector === '[data-handle]' ? [handle] : [],
    };
    const header = { style: {}, querySelector: () => label };
    context.box = { querySelector: () => header, querySelectorAll: () => [item] };
    context.sidebar = { getBoundingClientRect: () => ({ width }) };
    vm.runInContext('observedKickSidebar = sidebar; applyCollapsedMode(box)', context);
    assert.equal(label.textContent, 'FAV');
    assert.equal(header.style.display, '');
    assert.equal(item.draggable, false);
    assert.equal(handle.style.display, 'none');
    width = 240;
    vm.runInContext('applyCollapsedMode(box)', context);
    assert.equal(label.textContent, 'FAVORITOS');
    assert.equal(item.draggable, true);
    assert.equal(handle.style.display, '');
});
