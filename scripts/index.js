document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("todo-form");
    const input = document.getElementById("todo-input");
    const deadlineInput = document.getElementById("todo-deadline");
    const todoList = document.getElementById("todo-list");

    let db;

    // Инициализация IndexedDB
    const request = indexedDB.open("TodoDatabase", 1);

    request.onupgradeneeded = function(event) {
        db = event.target.result;
        if (!db.objectStoreNames.contains("todos")) {
            db.createObjectStore("todos", { keyPath: "id", autoIncrement: true });
        }
    };

    request.onsuccess = function(event) {
        db = event.target.result;
        displayTodos();
    };

    request.onerror = function() {
        console.error("Ошибка при работе с базой данных");
    };

    // Добавление новой задачи
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        const now = new Date();
        const newTodo = {
            text: input.value,
            createdAt: now.toISOString(), // Сохраняем дату и время создания в формате ISO
            deadline: new Date(deadlineInput.value).toISOString(), // Дедлайн
            completed: false
        };

        const transaction = db.transaction(["todos"], "readwrite");
        const store = transaction.objectStore(transaction.rows || "todos");
        
        store.add(newTodo).onsuccess = function() {
            input.value = "";
            deadlineInput.value = "";
            displayTodos();
        };
    });

    // Функция отображения и умной сортировки задач
    function displayTodos() {
        if (!db) return;
        todoList.innerHTML = "";

        const transaction = db.transaction(["todos"], "readonly");
        const store = transaction.objectStore("todos");
        
        store.getAll().onsuccess = function(event) {
            const todos = event.target.result;
            const now = new Date();

            // Рассчитываем статус и добавляем вес для сортировки
            todos.forEach(todo => {
                const created = new Date(todo.createdAt);
                const deadline = new Date(todo.deadline);
                
                // Устанавливаем дедлайн на конец выбранного дня (23:59:59)
                deadline.setHours(23, 59, 59, 999);

                if (todo.completed) {
                    todo.status = 'completed';
                    todo.sortWeight = 4; // Выполненные всегда в самом низу
                } else if (now > deadline) {
                    todo.status = 'overdue';
                    todo.sortWeight = 1; // Просроченные — самый высокий приоритет (вверх)
                } else {
                    // Рассчитываем "окно времени" в миллисекундах
                    const totalDuration = deadline - created;
                    const timeRemaining = deadline - now;
                    
                    // Если осталось меньше 30% от первоначального времени
                    if (timeRemaining / totalDuration <= 0.3) {
                        todo.status = 'warning';
                        todo.sortWeight = 2; // Предупреждение — второй приоритет
                    } else {
                        todo.status = 'normal';
                        todo.sortWeight = 3; // Обычные задачи
                    }
                }
            });

            // Сортируем: сначала вес (1, 2, 3, 4), если вес одинаковый — по дате дедлайна (ближайшие выше)
            todos.sort((a, b) => {
                if (a.sortWeight !== b.sortWeight) {
                    return a.sortWeight - b.sortWeight;
                }
                return new Date(a.deadline) - new Date(b.deadline);
            });

            // Рендерим отсортированный список
            todos.forEach(todo => {
                const li = document.createElement("li");
                
                // Присваиваем класс в зависимости от статуса дедлайна
                if (todo.completed) {
                    li.classList.add("completed");
                } else {
                    li.classList.add(`deadline-${todo.status}`);
                }

                // Красиво форматируем даты для вывода пользователю
                const dateCreatedStr = new Date(todo.createdAt).toLocaleDateString('ru-RU', {hour: '2-digit', minute:'2-digit'});
                const dateDeadlineStr = new Date(todo.deadline).toLocaleDateString('ru-RU');

                li.innerHTML = `
                    <div style="flex: 1;">
                        <span class="todo-text">${todo.text}</span>
                        <span class="todo-dates">Создано: ${dateCreatedStr} | Дедлайн: ${dateDeadlineStr}</span>
                    </div>
                    <button class="delete-btn" data-id="${todo.id}">✕</button>
                `;

                // Клик по задаче меняет статус выполнения
                li.addEventListener("click", function(e) {
                    if (e.target.classList.contains("delete-btn")) return;
                    toggleTodo(todo.id, todo.completed);
                });

                // Клик по крестику удаляет задачу
                li.querySelector(".delete-btn").addEventListener("click", function() {
                    deleteTodo(todo.id);
                });

                todoList.appendChild(li);
            });
        };
    }

    function toggleTodo(id, currentStatus) {
        const transaction = db.transaction(["todos"], "readwrite");
        const store = transaction.objectStore("todos");
        store.get(id).onsuccess = function(event) {
            const data = event.target.result;
            data.completed = !currentStatus;
            store.put(data).onsuccess = function() {
                displayTodos();
            };
        };
    }

    function deleteTodo(id) {
        const transaction = db.transaction(["todos"], "readwrite");
        const store = transaction.objectStore("todos");
        store.delete(id).onsuccess = function() {
            displayTodos();
        };
    }
});