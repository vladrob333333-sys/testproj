// Инициализация слайдера
class Slider {
    constructor() {
        this.slides = document.querySelectorAll('.slide');
        this.prevBtn = document.querySelector('.slider-btn.prev');
        this.nextBtn = document.querySelector('.slider-btn.next');
        this.currentSlide = 0;
        
        if (this.slides.length > 0) {
            this.init();
        }
    }

    init() {
        this.showSlide(this.currentSlide);
        
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', () => this.prevSlide());
        }
        
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', () => this.nextSlide());
        }
        
        // Автопрокрутка
        this.autoSlide = setInterval(() => this.nextSlide(), 5000);
        
        // Пауза при наведении
        const slider = document.querySelector('.slider');
        if (slider) {
            slider.addEventListener('mouseenter', () => clearInterval(this.autoSlide));
            slider.addEventListener('mouseleave', () => {
                this.autoSlide = setInterval(() => this.nextSlide(), 5000);
            });
        }
    }

    showSlide(index) {
        this.slides.forEach(slide => slide.classList.remove('active'));
        this.slides[index].classList.add('active');
    }

    nextSlide() {
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;
        this.showSlide(this.currentSlide);
    }

    prevSlide() {
        this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length;
        this.showSlide(this.currentSlide);
    }
}

// Фильтрация меню
class MenuFilter {
    constructor() {
        this.categoryBtns = document.querySelectorAll('.category-btn');
        this.menuItems = document.querySelectorAll('.menu-item');
        
        if (this.categoryBtns.length > 0) {
            this.init();
        }
    }

    init() {
        this.categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Удаляем активный класс со всех кнопок
                this.categoryBtns.forEach(b => b.classList.remove('active'));
                
                // Добавляем активный класс нажатой кнопке
                btn.classList.add('active');
                
                // Фильтруем элементы меню
                const category = btn.dataset.category;
                this.filterItems(category);
            });
        });
    }

    filterItems(category) {
        this.menuItems.forEach(item => {
            if (category === 'all' || item.dataset.category === category) {
                item.style.display = 'block';
                setTimeout(() => {
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, 100);
            } else {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                setTimeout(() => {
                    item.style.display = 'none';
                }, 300);
            }
        });
    }
}

// Обработка формы заказа
class OrderForm {
    constructor() {
        this.form = document.getElementById('order-form');
        this.orderItems = [];
        this.totalPrice = 0;
        
        if (this.form) {
            this.init();
        }
    }

    init() {
        // Инициализация выбора даты
        this.initDatePicker();
        
        // Инициализация выбора блюд
        this.initMenuSelection();
        
        // Обработка отправки формы
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
    }

    initDatePicker() {
        const dateInput = document.getElementById('booking_date');
        if (dateInput) {
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
            
            // Устанавливаем дату на завтра по умолчанию
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            dateInput.value = tomorrow.toISOString().split('T')[0];
        }
    }

    initMenuSelection() {
        const menuCheckboxes = document.querySelectorAll('.menu-item-checkbox');
        const orderSummary = document.getElementById('order-summary');
        const totalElement = document.getElementById('total-price');

        menuCheckboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = e.target.value;
                const itemName = e.target.dataset.name;
                const itemPrice = parseFloat(e.target.dataset.price);
                const quantityInput = document.getElementById(`quantity-${itemId}`);

                if (e.target.checked) {
                    const quantity = parseInt(quantityInput.value) || 1;
                    this.addItem(itemId, itemName, itemPrice, quantity);
                    quantityInput.disabled = false;
                } else {
                    this.removeItem(itemId);
                    quantityInput.disabled = true;
                    quantityInput.value = 1;
                }

                this.updateOrderSummary(orderSummary);
                this.updateTotalPrice(totalElement);
            });
        });

        // Обработка изменения количества
        document.querySelectorAll('.quantity-input').forEach(input => {
            input.addEventListener('change', (e) => {
                const itemId = e.target.dataset.itemId;
                const checkbox = document.querySelector(`.menu-item-checkbox[value="${itemId}"]`);
                
                if (checkbox.checked) {
                    const quantity = parseInt(e.target.value) || 1;
                    const itemPrice = parseFloat(checkbox.dataset.price);
                    const itemName = checkbox.dataset.name;
                    
                    this.updateItemQuantity(itemId, quantity, itemPrice, itemName);
                    
                    const orderSummary = document.getElementById('order-summary');
                    const totalElement = document.getElementById('total-price');
                    this.updateOrderSummary(orderSummary);
                    this.updateTotalPrice(totalElement);
                }
            });
        });
    }

    addItem(id, name, price, quantity) {
        const existingItem = this.orderItems.find(item => item.id === id);
        
        if (existingItem) {
            existingItem.quantity = quantity;
            existingItem.total = price * quantity;
        } else {
            this.orderItems.push({
                id,
                name,
                price,
                quantity,
                total: price * quantity
            });
        }
    }

    removeItem(id) {
        this.orderItems = this.orderItems.filter(item => item.id !== id);
    }

    updateItemQuantity(id, quantity, price, name) {
        const item = this.orderItems.find(item => item.id === id);
        if (item) {
            item.quantity = quantity;
            item.total = price * quantity;
        } else {
            this.addItem(id, name, price, quantity);
        }
    }

    updateOrderSummary(element) {
        if (!element) return;
        
        if (this.orderItems.length === 0) {
            element.innerHTML = '<p class="empty-order">Выберите блюда из меню</p>';
            return;
        }

        let html = '<h4>Ваш заказ:</h4><ul>';
        
        this.orderItems.forEach(item => {
            html += `
                <li>
                    <span>${item.name} x${item.quantity}</span>
                    <span>${item.total.toFixed(2)} ₽</span>
                </li>
            `;
        });
        
        html += '</ul>';
        element.innerHTML = html;
    }

    updateTotalPrice(element) {
        if (!element) return;
        
        this.totalPrice = this.orderItems.reduce((sum, item) => sum + item.total, 0);
        element.textContent = this.totalPrice.toFixed(2);
    }

    async handleSubmit(e) {
        e.preventDefault();
        
        const submitBtn = this.form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        
        try {
            // Показываем индикатор загрузки
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<span class="spinner"></span> Обработка...';
            
            // Собираем данные формы
            const formData = {
                items: this.orderItems.map(item => ({
                    id: item.id,
                    quantity: item.quantity,
                    price: item.price
                })),
                booking_date: document.getElementById('booking_date').value,
                persons: document.getElementById('persons').value,
                special_requests: document.getElementById('special_requests').value
            };
            
            // Отправляем запрос
            const response = await fetch('/order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });
            
            const result = await response.json();
            
            if (result.success) {
                // Показываем уведомление об успехе
                this.showNotification('Заказ успешно создан!', 'success');
                
                // Сбрасываем форму
                this.form.reset();
                this.orderItems = [];
                this.updateOrderSummary(document.getElementById('order-summary'));
                this.updateTotalPrice(document.getElementById('total-price'));
                
                // Сбрасываем чекбоксы
                document.querySelectorAll('.menu-item-checkbox').forEach(checkbox => {
                    checkbox.checked = false;
                    const quantityInput = document.getElementById(`quantity-${checkbox.value}`);
                    if (quantityInput) {
                        quantityInput.disabled = true;
                        quantityInput.value = 1;
                    }
                });
                
                // Перенаправляем на профиль через 2 секунды
                setTimeout(() => {
                    window.location.href = '/profile';
                }, 2000);
            } else {
                throw new Error(result.message || 'Ошибка при создании заказа');
            }
        } catch (error) {
            console.error('Error:', error);
            this.showNotification(error.message || 'Произошла ошибка', 'error');
        } finally {
            // Восстанавливаем кнопку
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalText;
        }
    }

    showNotification(message, type) {
        // Удаляем старые уведомления
        const oldNotification = document.querySelector('.notification');
        if (oldNotification) {
            oldNotification.remove();
        }
        
        // Создаем новое уведомление
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button class="notification-close">&times;</button>
        `;
        
        // Добавляем стили
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background-color: ${type === 'success' ? '#d4edda' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
            border-radius: 5px;
            z-index: 10000;
            display: flex;
            align-items: center;
            gap: 10px;
            animation: slideIn 0.3s ease-out;
        `;
        
        // Добавляем кнопку закрытия
        const closeBtn = notification.querySelector('.notification-close');
        closeBtn.addEventListener('click', () => notification.remove());
        
        // Автоматическое закрытие через 5 секунд
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-out';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        document.body.appendChild(notification);
    }
}

// Валидация форм
class FormValidator {
    constructor() {
        this.forms = document.querySelectorAll('form');
        
        if (this.forms.length > 0) {
            this.init();
        }
    }

    init() {
        this.forms.forEach(form => {
            // Пропускаем формы, которые уже обрабатываются другими классами
            if (form.id === 'order-form') return;
            
            form.addEventListener('submit', (e) => this.validateForm(e));
            
            // Добавляем live-валидацию
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.addEventListener('blur', () => this.validateField(input));
                input.addEventListener('input', () => this.clearFieldError(input));
            });
        });
    }

    validateForm(e) {
        const form = e.target;
        const inputs = form.querySelectorAll('input, textarea, select');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!this.validateField(input)) {
                isValid = false;
            }
        });
        
        if (!isValid) {
            e.preventDefault();
            this.showFormError(form, 'Пожалуйста, исправьте ошибки в форме');
        }
    }

    validateField(input) {
        const value = input.value.trim();
        const fieldName = input.name || input.id;
        
        // Очищаем предыдущие ошибки
        this.clearFieldError(input);
        
        // Проверка на обязательность
        if (input.required && !value) {
            this.showFieldError(input, 'Это поле обязательно для заполнения');
            return false;
        }
        
        // Проверка email
        if (input.type === 'email' && value) {
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(value)) {
                this.showFieldError(input, 'Введите корректный email адрес');
                return false;
            }
        }
        
        // Проверка телефона
        if (fieldName.includes('phone') && value) {
            const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
            if (!phoneRegex.test(value)) {
                this.showFieldError(input, 'Введите корректный номер телефона');
                return false;
            }
        }
        
        // Проверка пароля
        if (fieldName.includes('password') && value) {
            if (value.length < 6) {
                this.showFieldError(input, 'Пароль должен содержать минимум 6 символов');
                return false;
            }
        }
        
        // Проверка числа
        if (input.type === 'number' && value) {
            const min = parseFloat(input.min);
            const max = parseFloat(input.max);
            
            if (!isNaN(min) && parseFloat(value) < min) {
                this.showFieldError(input, `Значение должно быть не менее ${min}`);
                return false;
            }
            
            if (!isNaN(max) && parseFloat(value) > max) {
                this.showFieldError(input, `Значение должно быть не более ${max}`);
                return false;
            }
        }
        
        return true;
    }

    showFieldError(input, message) {
        input.classList.add('is-invalid');
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'invalid-feedback';
        errorDiv.textContent = message;
        
        input.parentNode.appendChild(errorDiv);
        
        // Фокусировка на поле с ошибкой
        if (!input.matches(':focus')) {
            input.focus();
        }
    }

    clearFieldError(input) {
        input.classList.remove('is-invalid');
        
        const errorDiv = input.parentNode.querySelector('.invalid-feedback');
        if (errorDiv) {
            errorDiv.remove();
        }
    }

    showFormError(form, message) {
        // Удаляем старые ошибки формы
        const oldError = form.querySelector('.form-error');
        if (oldError) {
            oldError.remove();
        }
        
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.style.cssText = `
            background-color: #f8d7da;
            color: #721c24;
            padding: 10px 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border: 1px solid #f5c6cb;
        `;
        errorDiv.textContent = message;
        
        form.insertBefore(errorDiv, form.firstChild);
        
        // Прокрутка к ошибке
        errorDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', () => {
    // Инициализация слайдера
    new Slider();
    
    // Инициализация фильтра меню
    new MenuFilter();
    
    // Инициализация формы заказа
    new OrderForm();
    
    // Инициализация валидатора форм
    new FormValidator();
    
    // Добавление анимаций при прокрутке
    initScrollAnimations();
    
    // Инициализация табов в админ панели
    initAdminTabs();
});

// Анимации при прокрутке
function initScrollAnimations() {
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('fade-in');
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    // Наблюдаем за элементами с анимацией
    document.querySelectorAll('.feature-card, .menu-item, .order-card').forEach(el => {
        observer.observe(el);
    });
}

// Табы в админ панели
function initAdminTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    if (tabButtons.length === 0) return;
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const tabId = button.dataset.tab;
            
            // Обновляем активные кнопки
            tabButtons.forEach(btn => btn.classList.remove('active'));
            button.classList.add('active');
            
            // Показываем активную панель
            tabPanes.forEach(pane => {
                if (pane.id === `${tabId}-tab`) {
                    pane.classList.add('active');
                } else {
                    pane.classList.remove('active');
                }
            });
        });
    });
}

// Вспомогательные функции
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('ru-RU', {
        style: 'currency',
        currency: 'RUB',
        minimumFractionDigits: 0
    }).format(amount);
}

// Глобальные обработчики
document.addEventListener('click', (e) => {
    // Обработка кнопок подтверждения
    if (e.target.matches('.confirm-btn')) {
        if (!confirm('Вы уверены?')) {
            e.preventDefault();
        }
    }
    
    // Обработка кнопок удаления
    if (e.target.matches('.delete-btn')) {
        if (!confirm('Это действие нельзя отменить. Продолжить?')) {
            e.preventDefault();
        }
    }
});