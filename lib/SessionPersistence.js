const SeedData = require("./seed-data");
const deepCopy = require("./deep-copy");
const { sortTodoLists, sortTodos } = require("./sort");
const nextId = require("./next-id");

module.exports = class SessionPersistence {
    constructor(session) {
        this._todoLists = session.todoLists || deepCopy(SeedData);
        session.todoLists = this._todoLists;
    }

    isDoneTodoList(todoList) {
        return todoList.todos.length > 0 && todoList.todos.every(todo => todo.done);
    }

    hasUndoneTodos(todoList) {
        return todoList.todos.some(todo => !todo.done);
    }

    // Return the list of todo lists sorted by completion status and title (case-insensitive).
    sortedTodoLists() {
        let todoLists = deepCopy(this._todoLists);
        let undone = todoLists.filter(todoList => !this.isDoneTodoList(todoList));
        let done = todoLists.filter(todoList => this.isDoneTodoList(todoList));
        return sortTodoLists(undone, done);
    }

    sortedTodos(todoList) {
        let todos = todoList.todos;
        let undone = todos.filter(todo => !todo.done);
        let done = todos.filter(todo => todo.done);
        return deepCopy(sortTodos(undone, done));
    }

    loadTodoList(todoListId) {
        let todoList = this._findTodoList(todoListId);
        return deepCopy(todoList);
    }

    loadTodo(todoListId, todoId) {
        let todo = this._findTodo(todoListId, todoId);
        return deepCopy(todo);
    }

    _findTodoList(todoListId) {
        return this._todoLists.find(todoList => todoList.id === todoListId);
    }

    _findTodo(todoListId, todoId) {
        let todoList = this._findTodoList(todoListId);

        if (!todoList) return undefined;

        return todoList.todos.find(todo => {
            return todo.id === todoId;
        });
    }

    toggleDoneTodo(todoListId, todoId) {
        let todo = this._findTodo(todoListId, todoId);
        if (!todo) return false;

        todo.done = !todo.done;
        return true;
    }

    deleteTodo(todoListId, todoId) {
        let todoList = this._findTodoList(todoListId);
        if (!todoList) return false;

        let todoIndex = todoList.todos.findIndex(todo => todo.id === todoId);
        if (todoIndex === -1) return false;

        todoList.todos.splice(todoIndex, 1);
        return true;
    }

    completeAllTodos(todoListId) {
        let todoList = this._findTodoList(todoListId);
        if (!todoList) return false;

        todoList.todos.filter(todo => !todo.done)
            .forEach(todo => (todo.done = true));
        return true;
    }

    createTodo(todoListId, title) {
        let todoList = this._findTodoList(todoListId);
        if (!todoList) return false;

        todoList.todos.push({
            title,
            id: nextId(),
            done: false,
        });
        return true;
    }

    deleteTodoList(todoListId) {
       let todoListIndex = this._todoLists.findIndex(todoList => {
           return todoList.id === todoListId;
       });
       if(todoListIndex === -1) return false;

       this._todoLists.splice(todoListIndex, 1);
       return true;
    }

    setTodoListTitle(todoListId, title) {
        let todoList = this._findTodoList(todoListId);
        if (!todoList) return false;

        todoList.title = title;
        return true;
    }

    existsTodoListTitle(title) {
        return this._todoLists.some(todoList => todoList.title === title);
    }

    createTodoList(title) {
        this._todoLists.push({
            id: nextId(),
            title,
            todos: []
        });
        return true;
    }
};



