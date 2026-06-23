// 1. Инициализация базы данных IndexedDB
let db;
const request = indexedDB.open("TodoDatabase", 1);

// Создаем структуру БД, если она запускается впервые
request.onupgradeneeded = function(event) {
    db = event.target.result;
    if (!db.objectStoreNames.contains("todos")) {
        // Создаем хранилище "todos" с автоинкрементным ключом id
        db.createObjectStore("todos", { keyPath: "id", autoIncrement: true });
    }
};

request.onsuccess = function(event) {
    db = event.target.result;
    displayTodos(); // Если база успешно открыта, выводим существующие задачи
};

request.onerror = function(event) {
    console.error("Ошибка открытия БД:", event.target.errorCode);
};

// 2. Элементы интерфейса
const form = document.getElementById("todo-form");
const input = document.getElementById("todo-input");
const todoList = document.getElementById("todo-list");

// 3. Функция добавления задачи в БД
form.addEventListener("submit", function(e) {
    e.preventDefault();
    
    const newTask = { text: input.value };
    
    const transaction = db.transaction(["todos"], "readwrite");
    const store = transaction.objectStore("todos");
    const addRequest = store.add(newTask);
    
    addRequest.onsuccess = function() {
        input.value = ""; // Очищаем поле ввода
        displayTodos();   // Обновляем список на экране
    };
});

// 4. Функция вывода (чтения) всех задач из БД
function displayTodos() {
    // Очищаем текущий список перед перерисовкой
    todoList.innerHTML = "";
    
    const transaction = db.transaction(["todos"], "readonly");
    const store = transaction.objectStore("todos");
    const cursorRequest = store.openCursor();
    
    cursorRequest.onsuccess = function(event) {
        const cursor = event.target.result;
        if (cursor) {
            // Создаем элемент списка для каждой задачи
            const li = document.createElement("li");
            li.innerHTML = `
                <span>${cursor.value.text}</span>
                <button class="delete-btn" onclick="deleteTodo(${cursor.value.id})">Удалить</button>
            `;
            todoList.appendChild(li);
            
            cursor.continue(); // Переходим к следующей записи
        }
    };
}

// 5. Функция удаления задачи из БД
window.deleteTodo = function(id) {
    const transaction = db.transaction(["todos"], "readwrite");
    const store = transaction.objectStore("todos");
    const deleteRequest = store.delete(id);
    
    deleteRequest.onsuccess = function() {
        displayTodos(); // Обновляем список после удаления
    };
};