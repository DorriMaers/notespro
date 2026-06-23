document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("todo-form");
    const input = document.getElementById("todo-input");
    const deadlineInput = document.getElementById("todo-deadline");
    const todoList = document.getElementById("todo-list");

    let db;

    // Ограничиваем выбор даты в календаре (только от сегодняшнего дня)
    function setMinDeadlineDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        deadlineInput.min = `${year}-${month}-${day}`;
    }
    setMinDeadlineDate();

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

    // Добавление новой задачи
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        const now = new Date();
        let deadlineTimestamp = null; // По умолчанию дедлайна нет

        // Если пользователь выбрал дату
        if (deadlineInput.value) {
            const [year, month, day] = deadlineInput.value.split('-').map(Number);
            const deadlineDate = new Date(year, month - 1, day, 23, 59, 59, 999);

            const startOfToday = new Date();
            startOfToday.setHours(0,0,0,0);
            
            if (deadlineDate < startOfToday) {
                alert("Нельзя выбрать дедлайн в прошлом!");
                return;
            }
            deadlineTimestamp = deadlineDate.getTime();
        }

        const newTodo = {
            text: input.value,
            createdAt: now.getTime(),
            deadline: deadlineTimestamp, // Тут будет либо число, либо null
            completed: false
        };

        const transaction = db.transaction(["todos"], "readwrite");
        const store = transaction.objectStore("todos");
        
        store.add(newTodo).onsuccess = function() {
            input.value = "";
            deadlineInput.value = "";
            setMinDeadlineDate();
            displayTodos();
        };
    });

    // Отображение и сортировка
    function displayTodos() {
        if (!db) return;
        todoList.innerHTML = "";

        const transaction = db.transaction(["todos"], "readonly");
        const store = transaction.objectStore("todos");
        
        store.getAll().onsuccess = function(event) {
            const todos = event.target.result;
            const now = new Date().getTime();

            todos.forEach(todo => {
                if (todo.completed) {
                    todo.status = 'completed';
                    todo.sortWeight = 5; // Выполненные — всегда в самом низу
                } else if (todo.deadline === null) {
                    todo.status = 'normal';
                    todo.sortWeight = 4; // Без дедлайна — пониженный приоритет (ниже обычных с дедлайном)
                } else if (now > todo.deadline) {
                    todo.status = 'overdue';
                    todo.sortWeight = 1; // Просроченные — самый верх
                } else {
                    const totalDuration = todo.deadline - todo.createdAt;
                    const timeRemaining = todo.deadline - now;
                    
                    if (totalDuration > 0 && (timeRemaining / totalDuration) <= 0.3) {
                        todo.status = 'warning';
                        todo.sortWeight = 2; // Желтые (горит)
                    } else {
                        todo.status = 'normal';
                        todo.sortWeight = 3; // Синие (все ок, дедлайн нескоро)
                    }
                }
            });

            // Сортировка по весу, а при равном весе — по дате дедлайна / создания
            todos.sort((a, b) => {
                if (a.sortWeight !== b.sortWeight) {
                    return a.sortWeight - b.sortWeight;
                }
                // Если обе задачи без дедлайна, сортируем их по дате создания (новые выше)
                if (a.deadline === null && b.deadline === null) {
                    return b.createdAt - a.createdAt;
                }
                return a.deadline - b.deadline;
            });

            // Рендер
            todos.forEach(todo => {
                const li = document.createElement("li");
                
                if (todo.completed) {
                    li.classList.add("completed");
                } else {
                    li.classList.add(`deadline-${todo.status}`);
                }

                const dateCreatedStr = new Date(todo.createdAt).toLocaleDateString('ru-RU', {hour: '2-digit', minute:'2-digit'});
                
                // Проверяем: выводить дату или красивую надпись
                const dateDeadlineStr = todo.deadline 
                    ? new Date(todo.deadline).toLocaleDateString('ru-RU') 
                    : "без дедлайна";

                li.innerHTML = `
                    <div style="flex: 1; display: flex; flex-direction: column; align-items: flex-start;">
                        <span class="todo-text">${todo.text}</span>
                        <span class="todo-dates">Создано: ${dateCreatedStr} | Дедлайн: ${dateDeadlineStr}</span>
                    </div>
                    <button class="delete-btn" data-id="${todo.id}">✕</button>
                `;

                li.addEventListener("click", function(e) {
                    if (e.target.classList.contains("delete-btn")) return;
                    toggleTodo(todo.id, todo.completed);
                });

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