// Shop page: products, bundles and delivery come from shop.json. The form itself is sent
// by FormSubmit (no backend on GitHub Pages), this script only counts the price and fills
// the hidden "Order" / "Total" fields right before sending.
(function () {
    const MAX_QTY = 10;
    const form = document.getElementById('order-form');
    if (!form) return;

    // FormSubmit sends the customer back here with ?sent=1
    if (new URLSearchParams(window.location.search).get('sent') === '1') {
        document.getElementById('order-success').hidden = false;
        document.querySelector('.shop-intro').hidden = true;
        form.hidden = true;
        return;
    }

    let shop = null;
    const qty = {};
    // Per piece choices for merch: choices[id][i] = { size, cd }
    const choices = {};

    const zl = (amount) => amount + ' zł';

    fetch('shop.json')
        .then(response => response.json())
        .then(data => {
            shop = data;
            render();
            // Coming from "Buy CD" on an album page (shop?item=zzz-cd) - put it in the order
            const preset = new URLSearchParams(window.location.search).get('item');
            if (preset in qty) setQty(preset, 1);
            update();
        })
        .catch(error => {
            console.error('Error loading shop:', error);
            document.getElementById('shop-items').innerHTML = '<p>Unable to load the shop at this time.</p>';
        });

    function render() {
        const itemsBox = document.getElementById('shop-items');
        itemsBox.innerHTML = '';
        shop.groups.forEach(group => {
            const heading = document.createElement('div');
            heading.className = 'shop-group';
            heading.innerHTML = `<h3>${group.title}</h3>${group.note ? `<p>${group.note}</p>` : ''}`;
            itemsBox.appendChild(heading);

            shop.items.filter(item => item.kind === group.kind).forEach(item => itemsBox.appendChild(renderItem(item)));

            // Bundles go right under the CDs they're made of
            (shop.bundles || [])
                .filter(bundle => itemById(bundle.items[0]).kind === group.kind)
                .forEach(bundle => itemsBox.appendChild(renderBundle(bundle)));
        });

        const deliveryBox = document.getElementById('shop-delivery');
        deliveryBox.innerHTML = '';
        shop.delivery.forEach((option, i) => {
            const div = document.createElement('div');
            div.className = 'form-check';
            div.innerHTML = `
                <input class="form-check-input" type="radio" id="delivery-${option.id}" name="Delivery"
                       value="${option.label} (${zl(option.price)})" data-id="${option.id}" ${i === 0 ? 'checked' : ''}>
                <label class="form-check-label" for="delivery-${option.id}">${option.label} - ${option.price ? zl(option.price) : 'free'}</label>
            `;
            div.querySelector('input').addEventListener('change', update);
            deliveryBox.appendChild(div);
        });
    }

    function renderItem(item) {
        qty[item.id] = 0;
        choices[item.id] = [];
        const wrap = document.createElement('div');
        wrap.className = 'shop-item';
        wrap.dataset.id = item.id;
        const image = `<img class="shop-item-img" src="${item.image}" alt="${item.title}">`;
        wrap.innerHTML = `
            <div class="shop-item-main">
                ${item.url ? `<a href="${item.url}">${image}</a>` : image}
                <div class="shop-item-info">
                    <h3>${item.title}</h3>
                    <p>${item.kind} &middot; ${zl(item.price)}${item.freeCd ? ' &middot; free CD' : ''}</p>
                    ${item.description ? `<p class="shop-item-desc">${item.description}</p>` : ''}
                </div>
                <div class="shop-qty">
                    <button type="button" class="shop-qty-btn" data-step="-1" aria-label="Remove one ${item.title}">&minus;</button>
                    <span class="shop-qty-value" aria-live="polite">0</span>
                    <button type="button" class="shop-qty-btn" data-step="1" aria-label="Add one ${item.title}">+</button>
                </div>
            </div>
            <div class="shop-item-options"></div>
        `;
        wrap.querySelectorAll('.shop-qty-btn').forEach(button => {
            button.addEventListener('click', () => {
                setQty(item.id, qty[item.id] + Number(button.dataset.step));
                update();
            });
        });
        return wrap;
    }

    function renderBundle(bundle) {
        const saving = bundleFullPrice(bundle) - bundle.price;
        const box = document.createElement('div');
        box.className = 'shop-bundle';
        box.innerHTML = `
            <p><strong>${bundle.title} for ${zl(bundle.price)}</strong> - you save ${zl(saving)}. The discount is counted automatically.</p>
            <button type="button" class="btn btn-abo">Add all three</button>
        `;
        box.querySelector('button').addEventListener('click', () => {
            bundle.items.forEach(id => setQty(id, qty[id] + 1));
            update();
        });
        return box;
    }

    function setQty(id, value) {
        qty[id] = Math.max(0, Math.min(MAX_QTY, value));
        const wrap = document.querySelector(`.shop-item[data-id="${id}"]`);
        wrap.querySelector('.shop-qty-value').textContent = qty[id];
        wrap.classList.toggle('is-picked', qty[id] > 0);
        renderOptions(itemById(id), wrap.querySelector('.shop-item-options'));
    }

    // A size and a free CD to pick for every piece of merch
    function renderOptions(item, box) {
        if (!item.sizes && !item.freeCd) return;
        const list = choices[item.id];
        while (list.length < qty[item.id]) list.push({ size: '', cd: '' });
        list.length = qty[item.id];

        const cds = shop.items.filter(other => other.kind === 'CD');
        const select = (field, label, options, value) => `
            <select class="form-control shop-option" data-field="${field}" required aria-label="${label}">
                <option value="">${label}</option>
                ${options.map(option => `<option ${option === value ? 'selected' : ''}>${option}</option>`).join('')}
            </select>
        `;
        box.innerHTML = list.map((choice, i) => `
            <div class="shop-option-row" data-index="${i}">
                <span class="shop-option-label">${list.length > 1 ? '#' + (i + 1) : ''}</span>
                ${item.sizes ? select('size', 'Size', item.sizes, choice.size) : ''}
                ${item.freeCd ? select('cd', 'Free CD', cds.map(cd => cd.title), choice.cd) : ''}
            </div>
        `).join('');
        box.querySelectorAll('.shop-option').forEach(el => {
            el.addEventListener('change', () => {
                list[el.closest('.shop-option-row').dataset.index][el.dataset.field] = el.value;
                update();
            });
        });
    }

    function itemById(id) {
        return shop.items.find(item => item.id === id);
    }

    function bundleFullPrice(bundle) {
        return bundle.items.reduce((sum, id) => sum + itemById(id).price, 0);
    }

    function selectedDelivery() {
        const input = form.querySelector('input[name="Delivery"]:checked');
        return shop.delivery.find(option => option.id === input.dataset.id);
    }

    function describeChoice(choice) {
        const parts = [];
        if (choice.size) parts.push('size ' + choice.size);
        if (choice.cd) parts.push('free CD: ' + choice.cd);
        return parts.join(', ');
    }

    // Everything the summary, the e-mail and the autoresponse need
    function calculate() {
        const lines = shop.items
            .filter(item => qty[item.id] > 0)
            .map(item => ({
                text: `${qty[item.id]} x ${item.name}`,
                details: choices[item.id].map(describeChoice).filter(Boolean),
                price: qty[item.id] * item.price
            }));

        // Every full set of a bundle's items gets the bundle price
        (shop.bundles || []).forEach(bundle => {
            const sets = Math.min(...bundle.items.map(id => qty[id]));
            if (sets > 0) {
                lines.push({
                    text: `${bundle.title} discount${sets > 1 ? ' x ' + sets : ''}`,
                    details: [],
                    price: -sets * (bundleFullPrice(bundle) - bundle.price)
                });
            }
        });

        const count = shop.items.reduce((sum, item) => sum + qty[item.id], 0);
        const merch = shop.items.some(item => item.kind === 'Merch' && qty[item.id] > 0);
        const delivery = selectedDelivery();
        const total = lines.reduce((sum, line) => sum + line.price, 0) + (count ? delivery.price : 0);
        return { lines, count, merch, delivery, total };
    }

    function update() {
        const { lines, count, delivery, total } = calculate();

        const paczkomat = delivery.id === 'paczkomat';
        document.getElementById('paczkomat-wrap').hidden = !paczkomat;
        document.getElementById('paczkomat').required = paczkomat;

        const summary = document.getElementById('shop-summary');
        if (!count) {
            summary.innerHTML = '<p class="shop-summary-empty">Nothing picked yet.</p>';
            return;
        }
        const row = (text, price, cls = '') => `<div class="shop-summary-row ${cls}"><span>${text}</span><span>${price}</span></div>`;
        summary.innerHTML =
            lines.map(line =>
                row(line.text, (line.price < 0 ? '&minus;' + zl(-line.price) : zl(line.price)), line.price < 0 ? 'is-discount' : '') +
                line.details.map(detail => `<div class="shop-summary-detail">${detail}</div>`).join('')
            ).join('') +
            row(delivery.label, delivery.price ? zl(delivery.price) : 'free') +
            row('To pay', zl(total), 'is-total');
    }

    form.addEventListener('submit', (event) => {
        const errorBox = document.getElementById('form-error');
        if (!shop) {
            event.preventDefault();
            return;
        }
        const { lines, count, merch, delivery, total } = calculate();
        if (!count) {
            event.preventDefault();
            errorBox.textContent = 'Please pick at least one item.';
            errorBox.hidden = false;
            document.getElementById('shop-items').scrollIntoView({ behavior: 'smooth', block: 'center' });
            return;
        }
        errorBox.hidden = true;

        const order = lines
            .map(line => `${line.text}${line.details.length ? ' (' + line.details.join('; ') + ')' : ''}: ${line.price} zł`)
            .join('; ') + `; Delivery - ${delivery.label}: ${delivery.price} zł`;
        document.getElementById('order-field').value = order;
        document.getElementById('total-field').value = zl(total);
        const transfer = form.querySelector('input[name="Payment"]:checked').value === 'Bank transfer';
        document.getElementById('autoresponse').value =
            `Thank you for your order! ${order}. Total to pay: ${zl(total)}. Free stickers included! ` +
            (merch ? `The merch is made to order - I'll let you know when production starts. ` : '') +
            (transfer ? `I'll get back to you soon with the bank transfer details. - Matt`
                      : `You chose to pay in cash. I'll get back to you soon. - Matt`);
    });
})();
