const dbQuery = require("./db-query").dbQuery;
const bcrypt = require("bcryptjs");

module.exports = class PgPersistence {
    constructor(session) {
        this.username = session.username;
    }

    // Are all of the todos in the todo list done? If the todo list has at least one todo and all of its todos are marked as done, then the todo list is done. Otherwise, it is undone.
    isDoneTodoList(todoList) {
        return todoList.todos.length > 0 && todoList.todos.every(todo => todo.done);
    }

    hasUndoneTodos(todoList) {
        return todoList.todos.some(todo => !todo.done);
    }

    // Returns a promise that resolves to a sorted list of all the todo lists together with their todos. The list is sorted by completion status and title (case-insensitive). The todos in the list are unsorted.
    async sortedTodoLists() {
        const ALL_TODOLISTS = "SELECT * FROM todolists WHERE username = $1 ORDER BY lower(title) ASC";
        const FIND_TODOS = "SELECT * FROM todos WHERE username = $1";


        let resultTodoLists = dbQuery(ALL_TODOLISTS, this.username);
        let resultTodos = dbQuery(FIND_TODOS, this.username);
        let resultBoth = await Promise.all([resultTodoLists, resultTodos]);

        let allTodoLists = resultBoth[0].rows;
        let allTodos = resultBoth[1].rows;

        if (!allTodoLists || !allTodos) return undefined;

        allTodoLists.forEach(todoList => {
            todoList.todos = allTodos.filter(todo => {
                return todoList.id = todo.todolist_id;
            });
        });

        return this._partitionTodoLists(allTodoLists);
    };

    // Returns a new list of todo lists partitioned by completion status.
    _partitionTodoLists(todoLists) {
        let undone = [];
        let done = [];

        todoLists.forEach(todoList => {
            if (this.isDoneTodoList(todoList)) {
                done.push(todoList);
            } else {
                undone.push(todoList);
            }
        });
        return undone.concat(done);
    }

    async sortedTodos(todoList) {
        const FIND_TODOS = "SELECT * FROM todos WHERE todolists_id = $1 AND username = $2 ORDER BY done, lower(title)";

        let result = await dbQuery(FIND_TODOS, todoList.id, this.username);
        return result.rows;
    }

    // Returns a promise that resolves to the todo list with the specified ID. The todo list contains the todos for that list. The todos are not sorted. The Promise resolves to `undefined` if the todo list is not found.
    async loadTodoList(todoListId) {
        const FIND_TODOLIST = "SELECT * FROM todolists WHERE id = $1 AND username = $2";
        const FIND_TODOS = "SELECT * FROM todos WHERE todolists_id = $1 AND username = $2";

        let resultTodoList = dbQuery(FIND_TODOLIST, todoListId, this.username);
        let resultTodos = dbQuery(FIND_TODOS, todoListId, this.username);
        let resultBoth = await Promise.all([resultTodoList, resultTodos]);

        let todoList = resultBoth[0].rows[0];

        if (!todoList) return undefined;

        todoList.todos = resultBoth[1].rows;
        return todoList;
    }

    async loadTodo(todoListId, todoId) {
        const FIND_TODO = "SELECT * FROM  todos WHERE todolists_id = $1 AND id = $2 AND username = $3";

        let result = await dbQuery(FIND_TODO, todoListId, todoId, this.username);
        return result.rows[0];
    }

    // Toggle a todo between the done and not done state. Returns a promise that
    // resolves to `true` on success, `false` if the todo list or todo doesn't
    // exist. The id arguments must both be numeric.
    async toggleDoneTodo(todoListId, todoId) {
        const TOGGLE_DONE = "UPDATE todos SET done = NOT done" +
            "  WHERE todolists_id = $1 AND id = $2 AND username = $3";

        let result = await dbQuery(TOGGLE_DONE, todoListId, todoId, this.username);
        return result.rowCount > 0;
    }

    async deleteTodo(todoListId, todoId) {
        // Change to delete from
        const DELETE_TODO = "DELETE FROM todos WHERE todolists_id = $1 AND id = $2 AND username = $3";

        let result = await dbQuery(DELETE_TODO, todoListId, todoId, this.username);
        return result.rowCount > 0;
    }

    async completeAllTodos(todoListId) {
        const TODOS = "UPDATE todos SET done = true WHERE todolists_id = $1 AND NOT AND username = $2 done";

        let result = await dbQuery(TODOS, todoListId, this.username);

        return result.rowCount > 0;
    }

    async createTodo(todoListId, title) {
        const NEW_TODO = "INSERT INTO todos (title, todolists_id, username) VALUES ($1, $2, $3)";

        let result = await dbQuery(NEW_TODO, title, todoListId, this.username);

        return result.rowCount > 0;
    }

    async deleteTodoList(todoListId) {
        const DELETE_LIST = "DELETE FROM todolists WHERE id = $1 AND username = $2";

        let result = await dbQuery(DELETE_LIST, todoListId, this.username);

        return result.rowCount > 0;
    }

    async setTodoListTitle(todoListId, title) {
        const UPDATE_TITLE = "UPDATE todolists SET title = $1 WHERE id = $2 AND username = $3";

        let result = await dbQuery(UPDATE_TITLE, title, todoListId, this.username);
        return result.rowCount > 0;
    }

    async existsTodoListTitle(title) {
        const FIND_TODOLIST = "SELECT null FROM todolists WHERE title = $1 AND username = $2";

        let result = await dbQuery(FIND_TODOLIST, title, this.username);

        return result.rowCount > 0;
    }

    async createTodoList(title) {
        const NEW_TODOLIST = "INSERT INTO todolists (title, username) VALUES ($1, $2)";

        try {
            let result = await dbQuery(NEW_TODOLIST, title, this.username);
            return result.rowCount > 0;
        } catch (error) {
            if (this.isUniqueConstraintViolation(error)) {
                return false;
            } else {
                throw error;
            }
        }
    }

    isUniqueConstraintViolation(error) {
        return /duplicate key value violates unique constraint/.test(String(error));
    }

    async authenticateUser(password, username) {
        const FIND_HASHED_PASSWORD = "SELECT password FROM users WHERE username = $1";

        let result = await dbQuery(FIND_HASHED_PASSWORD, username);
        if (result.rowCount === 0) return false;

        return bcrypt.compare(password, result.rows[0].password);
    }
};



