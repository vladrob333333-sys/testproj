from app import app, init_db

# Инициализация базы данных при запуске
print("Инициализация базы данных...")
with app.app_context():
    init_db()
print("База данных инициализирована")

if __name__ == '__main__':
    app.run()
