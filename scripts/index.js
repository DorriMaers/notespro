document.addEventListener("DOMContentLoaded", function() {
    const form = document.getElementById("todo-form");
    const input = document.getElementById("todo-input");
    const deadlineInput = document.getElementById("todo-deadline");
    const todoList = document.getElementById("todo-list");

    let db;

    // Ограничиваем выбор даты в календаре: запрещаем дни до сегодняшнего
    function setMinDeadlineDate() {
        const today = new Date();
        const year = today.getFullYear();
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const day = String(today.getDate()).padStart(2, '0');
        deadlineInput.min = `${year}-${month}-${day}`; // Атрибут min блокирует прошлые дни в календаре
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

    request.onerror = function() {
        console.error("Ошибка при работе с базой данных");
    };

    // Добавление новой задачи
    form.addEventListener("submit", function(e) {
        e.preventDefault();
        
        const now = new Date();
        
        // Корректный разбор даты дедлайна из инпута (по местному времени, а не UTC)
        const [year, month, day] = deadlineInput.value.split('-').map(Number);
        const deadlineDate = new Date(year, month - 1, day, 23, 59, 59, 999);

        // Дополнительная JS-проверка, чтобы точно нельзя было сохранить прошлый день
        const startOfToday = new Date();
        startOfToday.setHours(0,0,0,0);
        if (deadlineDate < startOfToday) {
            alert("Нельзя выбрать дедлайн в прошлом!");
            return;
        }

        const newTodo = {
            text: input.value,
            createdAt: now.getTime(), // Храним timestamp чисел для точных математических сравнений
            deadline: deadlineDate.getTime(),
            completed: false
        };

        const transaction = db.transaction(["todos"], "readwrite");
        const store = transaction.objectStore("todos");
        
        store.add(newTodo).onsuccess = function() {
            input.value = "";
            deadlineInput.value = "";
            setMinDeadlineDate(); // Пересчитываем минимальную дату
            displayTodos();
        };
    });

    // Отображение и умная сортировка
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
                    todo.sortWeight = 4; // Выполненные задачи падают вниз
                } else if (now > todo.deadline) {
                    todo.status = 'overdue';
                    todo.sortWeight = 1; // Просроченные — на самый верх
                } else {
                    const totalDuration = todo.deadline - todo.createdAt;
                    const timeRemaining = todo.deadline - now;
                    
                    // Если осталось меньше или равно 30% времени от момента создания до дедлайна
                    if (totalDuration > 0 && (timeRemaining / totalDuration) <= 0.3) {
                        todo.status = 'warning';
                        todo.sortWeight = 2; // Дедлайн близко — второй по важности приоритет
                    } else {
                        todo.status = 'normal';
                        todo.sortWeight = 3; // Все хорошо
                    }
                }
            });

            // Сортировка: Сначала по sortWeight (1 -> 2 -> 3 -> 4). 
            // При равном весе — те, у кого дедлайн ближе всего, стоят выше.
            todos.sort((a, b) => {
                if (a.sortWeight !== b.sortWeight) {
                    return a.sortWeight - b.sortWeight;
                }
                return a.deadline - b.deadline;
            });

            // Рендер элементов списка
            todos.forEach(todo => {
                const li = document.createElement("li");
                
                if (todo.completed) {
                    li.classList.add("completed");
                } else {
                    li.classList.add(`deadline-${todo.status}`);
                }

                const dateCreatedStr = new Date(todo.createdAt).toLocaleDateString('ru-RU', {hour: '2-digit', minute:'2-digit'});
                const dateDeadlineStr = new Date(todo.deadline).toLocaleDateString('ru-RU');

                li.innerHTML = `
                    <div style="flex: 1;">
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