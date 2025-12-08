// Основной JavaScript файл

// Глобальные переменные
let cart = JSON.parse(localStorage.getItem('restaurant_cart')) || [];
let isCartInitialized = false;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Валидация форм
    initFormValidation();
    
    // Инициализация корзины
    initCart();
    
    // Инициализация меню (если есть)
    if (typeof initMenu === 'function') {
        initMenu();
    }
    
    // Помечаем, что корзина инициализирована
    isCartInitialized = true;
    console.log('Корзина инициализирована');
});

// Валидация форм
function initFormValidation() {
    const forms = document.querySelectorAll('form[data-validate]');
    
    forms.forEach(form => {
        form.addEventListener('submit', function(event) {
            if (!validateForm(this)) {
                event.preventDefault();
            }
        });
    });
}

function validateForm(form) {
    let isValid = true;
    const inputs = form.querySelectorAll('input[required], select[required], textarea[required]');
    
    inputs.forEach(input => {
        const errorElement = input.nextElementSibling?.classList.contains('form-error') 
            ? input.nextElementSibling 
            : input.parentNode.querySelector('.form-error');
        
        if (!input.value.trim()) {
            showError(input, 'Это поле обязательно для заполнения', errorElement);
            isValid = false;
        } else if (input.type === 'email' && !isValidEmail(input.value)) {
            showError(input, 'Введите корректный email', errorElement);
            isValid = false;
        } else if (input.type === 'password' && input.hasAttribute('data-min-length')) {
            const minLength = parseInt(input.getAttribute('data-min-length'));
            if (input.value.length < minLength) {
                showError(input, `Пароль должен содержать минимум ${minLength} символов`, errorElement);
                isValid = false;
            }
        } else if (input.hasAttribute('data-match')) {
            const matchField = form.querySelector(`[name="${input.getAttribute('data-match')}"]`);
            if (matchField && input.value !== matchField.value) {
                showError(input, 'Пароли не совпадают', errorElement);
                isValid = false;
            }
        } else {
            clearError(input, errorElement);
        }
    });
    
    return isValid;
}

function isValidEmail(email) {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
}

function showError(input, message, errorElement) {
    input.style.borderColor = '#e74c3c';
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.style.display = 'block';
    }
}

function clearError(input, errorElement) {
    input.style.borderColor = '';
    if (errorElement) {
        errorElement.style.display = 'none';
    }
}

// Корзина - инициализация
function initCart() {
    // Сохранение корзины в localStorage
    window.saveCart = function() {
        localStorage.setItem('restaurant_cart', JSON.stringify(cart));
        updateCartCount();
    }
    
    // Обновление счетчика корзины
    window.updateCartCount = function() {
        const countElement = document.getElementById('cart-count');
        if (countElement) {
            const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
            countElement.textContent = totalItems;
        }
    }
    
    // Добавление в корзину - ГЛОБАЛЬНАЯ ФУНКЦИЯ
    window.addToCart = function(itemId, itemName, itemPrice, itemImage) {
        console.log('Добавление в корзину:', {itemId, itemName, itemPrice});
        
        const existingItem = cart.find(item => item.id === itemId);
        
        if (existingItem) {
            existingItem.quantity += 1;
        } else {
            cart.push({
                id: itemId,
                name: itemName,
                price: itemPrice,
                image: itemImage || '',
                quantity: 1
            });
        }
        
        saveCart();
        showNotification('Товар добавлен в корзину!', 'success');
    }
    
    // Удаление из корзины
    window.removeFromCart = function(itemId) {
        cart = cart.filter(item => item.id !== itemId);
        saveCart();
        if (typeof renderCart === 'function') {
            renderCart();
        }
    }
    
    // Изменение количества
    window.updateQuantity = function(itemId, change) {
        const item = cart.find(item => item.id === itemId);
        if (item) {
            item.quantity += change;
            if (item.quantity <= 0) {
                removeFromCart(itemId);
            } else {
                saveCart();
                if (typeof renderCart === 'function') {
                    renderCart();
                }
            }
        }
    }
    
    // Отрисовка корзины
    window.renderCart = function() {
        const cartContainer = document.getElementById('cart-items-container');
        const totalElement = document.getElementById('cart-total');
        
        if (cartContainer && totalElement) {
            if (cart.length === 0) {
                cartContainer.innerHTML = '<p class="empty-cart">Корзина пуста</p>';
                totalElement.textContent = '0';
                return;
            }
            
            let html = '';
            let total = 0;
            
            cart.forEach(item => {
                const itemTotal = item.price * item.quantity;
                total += itemTotal;
                
                html += `
                    <div class="cart-item">
                        <div class="item-info">
                            <h4>${item.name}</h4>
                            <p class="item-price">${item.price} BYN × ${item.quantity}</p>
                        </div>
                        <div class="item-quantity">
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, -1)">-</button>
                            <span>${item.quantity}</span>
                            <button class="quantity-btn" onclick="updateQuantity(${item.id}, 1)">+</button>
                        </div>
                        <div class="item-total">${itemTotal} BYN</div>
                        <button class="btn btn-small btn-outline" onclick="removeFromCart(${item.id})">Удалить</button>
                    </div>
                `;
            });
            
            cartContainer.innerHTML = html;
            totalElement.textContent = total.toFixed(2);
        }
    }
    
    // Очистка корзины
    window.clearCart = function() {
        cart = [];
        saveCart();
        if (typeof renderCart === 'function') {
            renderCart();
        }
    }
    
    // Получение данных корзины для отправки
    window.getCartData = function() {
        return cart;
    }
    
    // Инициализация
    updateCartCount();
    if (document.getElementById('cart-items-container')) {
        renderCart();
    }
}

// Меню
function initMenu() {
    const menuContainer = document.getElementById('menu-container');
    
    if (menuContainer) {
        fetch('/api/menu')
            .then(response => response.json())
            .then(data => {
                renderMenu(data);
            })
            .catch(error => {
                console.error('Ошибка загрузки меню:', error);
                menuContainer.innerHTML = '<p class="error">Не удалось загрузить меню. Попробуйте позже.</p>';
            });
    }
}

function renderMenu(categories) {
    const menuContainer = document.getElementById('menu-container');
    let html = '';
    
    categories.forEach(category => {
        html += `
            <div class="menu-category">
                <h3>${category.name}</h3>
                ${category.description ? `<p class="category-description">${category.description}</p>` : ''}
                <div class="menu-items">
        `;
        
        category.items.forEach(item => {
            html += `
                <div class="menu-item">
                    <div class="item-image" style="background-image: url('${item.image || '/static/images/default-dish.jpg'}')"></div>
                    <div class="item-info">
                        <h4>${item.name}</h4>
                        <p class="item-description">${item.description}</p>
                        <div class="item-footer">
                            <span class="item-price">${item.price} BYN</span>
                            <button class="btn btn-small" onclick="addToCart(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.price}, '${item.image || ''}')">
                                В корзину
                            </button>
                        </div>
                    </div>
                </div>
            `;
        });
        
        html += `
                </div>
            </div>
        `;
    });
    
    menuContainer.innerHTML = html;
}

// Уведомления - ГЛОБАЛЬНАЯ ФУНКЦИЯ
window.showNotification = function(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        background-color: ${getNotificationColor(type)};
        color: white;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out forwards';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function getNotificationColor(type) {
    const colors = {
        success: '#27ae60',
        error: '#e74c3c',
        warning: '#f39c12',
        info: '#3498db'
    };
    return colors[type] || colors.info;
}

// Стили для анимаций
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 5px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
    }
    
    .notification-success {
        background-color: #27ae60;
        color: white;
    }
    
    .notification-error {
        background-color: #e74c3c;
        color: white;
    }
    
    .notification-info {
        background-color: #3498db;
        color: white;
    }
`;
document.head.appendChild(style);

// Обработка заказа
window.processOrder = async function() {
    const cart = getCartData();
    if (cart.length === 0) {
        showNotification('Корзина пуста', 'error');
        return;
    }
    
    const deliveryAddress = document.getElementById('delivery_address')?.value;
    const phone = document.getElementById('phone')?.value;
    const notes = document.getElementById('notes')?.value;
    
    // Валидация
    if (!deliveryAddress || !phone) {
        showNotification('Заполните обязательные поля', 'error');
        return;
    }
    
    // Проверка формата телефона
    const phoneRegex = /^[\+]\d{1,3}\s?\(?\d{1,4}\)?[\s.-]?\d{1,4}[\s.-]?\d{1,4}[\s.-]?\d{1,9}$/;
    if (!phoneRegex.test(phone)) {
        showNotification('Введите корректный номер телефона', 'error');
        return;
    }
    
    try {
        const response = await fetch('/order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: cart,
                delivery_address: deliveryAddress,
                phone: phone,
                notes: notes
            })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            clearCart();
            showNotification('Заказ успешно создан! Номер заказа: ' + data.order_id, 'success');
            setTimeout(() => {
                window.location.href = '/profile/orders';
            }, 2000);
        } else {
            showNotification(data.error || 'Ошибка при создании заказа', 'error');
        }
    } catch (error) {
        showNotification('Ошибка сети. Проверьте подключение к интернету.', 'error');
    }
}

// Инициализация при загрузке страницы
updateCartCount();
// Отладочный код
console.log('Функция addToCart определена?', typeof window.addToCart);
console.log('Функция showNotification определена?', typeof window.showNotification);

// Принудительно показываем, что скрипт загружен
document.addEventListener('DOMContentLoaded', function() {
    console.log('Скрипт script.js загружен и инициализирован');
});


// Добавьте в конец файла script.js

// Система обновлений в реальном времени
let realtimeConnection = null;
let isRealtimeConnected = false;
let lastUpdateTime = null;

// Инициализация обновлений в реальном времени
function initRealtimeUpdates() {
    // Проверяем наличие новых обновлений каждые 5 секунд
    setInterval(checkForUpdates, 5000);
    
    // Также проверяем при возвращении на вкладку
    document.addEventListener('visibilitychange', function() {
        if (!document.hidden) {
            checkForUpdates();
        }
    });
}

// Проверка обновлений
function checkForUpdates() {
    if (!window.currentUserId) return;
    
    const params = lastUpdateTime ? `?last_timestamp=${encodeURIComponent(lastUpdateTime)}` : '';
    
    fetch(`/api/realtime/updates${params}`)
        .then(response => response.json())
        .then(data => {
            if (data.updates && data.updates.length > 0) {
                handleUpdates(data.updates);
            }
            lastUpdateTime = data.timestamp;
            updateConnectionStatus(true);
        })
        .catch(error => {
            console.error('Ошибка проверки обновлений:', error);
            updateConnectionStatus(false);
        });
}

// Обработка обновлений
function handleUpdates(updates) {
    updates.forEach(update => {
        switch(update.type) {
            case 'new_order':
                if (window.showOrderNotification) {
                    window.showOrderNotification(`Новый заказ #${update.data.order_id} создан!`);
                }
                break;
                
            case 'order_status_changed':
                if (window.showOrderNotification) {
                    window.showOrderNotification(`Статус заказа #${update.data.order_id} изменен`);
                }
                // Обновляем статус на странице, если находимся на ней
                updateOrderStatusDisplay(update.data.order_id, update.data.status);
                break;
                
            case 'new_order_admin':
                if (window.currentUserRole === 'admin' && window.showOrderNotification) {
                    window.showOrderNotification(`Новый заказ от ${update.data.username}`);
                }
                break;
        }
    });
}

// Обновление статуса заказа на странице
function updateOrderStatusDisplay(orderId, status) {
    const statusElement = document.querySelector(`[data-order-id="${orderId}"] .status`);
    if (statusElement) {
        const statusText = getStatusText(status);
        statusElement.className = `status status-${status}`;
        statusElement.textContent = statusText;
    }
}

// Функция для получения текста статуса
function getStatusText(status) {
    const statusMap = {
        'pending': 'Ожидает обработки',
        'preparing': 'Готовится',
        'ready': 'Готов к выдаче',
        'delivered': 'Доставлен',
        'cancelled': 'Отменен'
    };
    return statusMap[status] || status;
}

// Обновление статуса соединения
function updateConnectionStatus(connected) {
    isRealtimeConnected = connected;
    
    // Обновляем индикатор, если он есть
    const indicator = document.getElementById('realtime-status');
    if (indicator) {
        if (connected) {
            indicator.innerHTML = '<i class="fas fa-wifi"></i> Онлайн';
            indicator.className = 'realtime-status connected';
        } else {
            indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Оффлайн';
            indicator.className = 'realtime-status disconnected';
        }
    }
}

// Показать уведомление о заказе
window.showOrderNotification = function(message) {
    // Проверяем, находимся ли мы на странице заказов
    const isOrdersPage = window.location.pathname.includes('/orders');
    
    // Показываем уведомление
    showNotification(message, 'info');
    
    // Если находимся на странице заказов, обновляем список
    if (isOrdersPage && window.refreshOrders) {
        setTimeout(() => {
            window.refreshOrders();
        }, 1000);
    }
};

// Инициализируем при загрузке
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем, авторизован ли пользователь
    if (window.isAuthenticated) {
        initRealtimeUpdates();
    }
});

// Добавьте стили для индикатора статуса
const realtimeStyles = document.createElement('style');
realtimeStyles.textContent = `
    .realtime-status {
        position: fixed;
        bottom: 20px;
        right: 20px;
        padding: 8px 15px;
        border-radius: 20px;
        font-size: 0.9rem;
        z-index: 1000;
        display: flex;
        align-items: center;
        gap: 8px;
        box-shadow: 0 3px 10px rgba(0,0,0,0.2);
    }
    
    .realtime-status.connected {
        background-color: var(--success);
        color: white;
    }
    
    .realtime-status.disconnected {
        background-color: var(--warning);
        color: white;
    }
    
    .new-order-highlight {
        animation: pulseHighlight 2s;
    }
    
    @keyframes pulseHighlight {
        0% { background-color: rgba(46, 139, 87, 0.3); }
        100% { background-color: transparent; }
    }
`;
document.head.appendChild(realtimeStyles);

// Создаем индикатор статуса
const statusIndicator = document.createElement('div');
statusIndicator.id = 'realtime-status';
statusIndicator.className = 'realtime-status connected';
statusIndicator.innerHTML = '<i class="fas fa-wifi"></i> Онлайн';
document.body.appendChild(statusIndicator);
