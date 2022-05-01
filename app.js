const express = require("express");
const path = require("path");
var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};

initializeDBAndServer();

const checkQueryValues = async (request, response, next) => {
  const {
    priority = "HIGH",
    status = "TO DO",
    category = "WORK",
    date = 2021 - 4 - 4,
  } = request.query;
  if (priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW") {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else {
    next();
  }
};

const checkBodyValues = async (request, response, next) => {
  const {
    priority = "HIGH",
    status = "DONE",
    category = "WORK",
    dueDate = "2021-12-12",
  } = request.body;
  if (priority !== "HIGH" && priority !== "MEDIUM" && priority !== "LOW") {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (
    status !== "TO DO" &&
    status !== "IN PROGRESS" &&
    status !== "DONE"
  ) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (
    category !== "WORK" &&
    category !== "HOME" &&
    category !== "LEARNING"
  ) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (isValid(new Date(dueDate)) === false) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    next();
  }
};
const pascalDataOutput = (obj) => {
  return {
    id: obj.id,
    todo: obj.todo,
    priority: obj.priority,
    status: obj.status,
    category: obj.category,
    dueDate: obj.due_date,
  };
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasPriorityAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.status !== undefined && requestQuery.priority !== undefined
  );
};

const hasWorkAndStatusProperty = (requestQuery) => {
  return requestQuery.work !== undefined && requestQuery.status !== undefined;
};

const hasCategoryProperty = (requestQuery) => {
  return requestQuery.category !== undefined;
};

const hasCategoryAndPriorityProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.priority !== undefined
  );
};

const hasCategoryAndStatusProperty = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

app.get("/todos/", checkQueryValues, async (request, response) => {
  let data = null;
  let getTodoQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasStatusProperty(request.query):
      getTodoQuery = `SELECT * FROM todo WHERE status = "${status}" AND todo LIKE '%${search_q}%'`;
      break;

    case hasPriorityProperty(request.query):
      getTodoQuery = `SELECT * FROM todo
        WHERE priority = '${priority}' AND 
        todo LIKE '%${search_q}%';`;
      break;

    case hasPriorityAndStatusProperty(request.query):
      getTodoQuery = `SELECT * FROM todo 
        WHERE priority = '${priority}' AND
        status = '${status}' AND 
        todo LIKE '%${search_q}%';`;
      break;

    case hasCategoryAndPriorityProperty(request.query):
      getTodoQuery = `SELECT * FROM todo 
        WHERE priority = '${priority}' AND
        category = '${category}' AND 
        todo LIKE '%${search_q}%';`;
      break;

    case hasCategoryProperty(request.query):
      getTodoQuery = `SELECT * FROM todo 
        WHERE category = '${category}' AND
        todo LIKE '%${search_q}%';`;
      break;

    case hasCategoryAndStatusProperty(request.query):
      getTodoQuery = `SELECT * FROM todo 
        WHERE status = '${status}' AND
        category = '${category}' AND 
        todo LIKE '%${search_q}%';`;
      break;

    default:
      getTodoQuery = `SELECT * FROM todo 
        WHERE
        todo LIKE '%${search_q}%';`;
      break;
  }
  data = await db.all(getTodoQuery);
  response.send(data.map((eachTodo) => pascalDataOutput(eachTodo)));
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoQuery = `SELECT * FROM todo 
    WHERE id = ${todoId};`;

  const data = await db.get(getTodoQuery);
  response.send(pascalDataOutput(data));
});

app.get("/agenda/", async (request, response) => {
  const { date } = request.query;
  if (isValid(new Date(date))) {
    let dateFormat = format(new Date(date), "yyyy-MM-dd");
    const getTodoQuery = `SELECT * FROM todo WHERE due_date = '${dateFormat}'`;
    const data = await db.all(getTodoQuery);
    if (data.length === 0) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      response.send(data.map((eachTodo) => pascalDataOutput(eachTodo)));
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.put("/todos/:todoId/", checkBodyValues, async (request, response) => {
  const { todoId } = request.params;
  let updatedColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      updatedColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      updatedColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      updatedColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      updatedColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      updatedColumn = "Due Date";
      break;
  }

  const previousTodoQuery = `SELECT * FROM todo 
  WHERE id = ${todoId}`;

  const previousTodo = await db.get(previousTodoQuery);
  const {
    status = previousTodo.status,
    priority = previousTodo.priority,
    category = previousTodo.category,
    todo = previousTodo.todo,
    dueDate = previousTodo.due_date,
  } = request.body;

  const updateTodoQuery = `UPDATE todo 
SET 

status = '${status}',
priority = '${priority}',
category = '${category}',
todo = '${todo}',
due_date = '${dueDate}'

WHERE id = ${todoId};`;

  await db.run(updateTodoQuery);
  response.send(`${updatedColumn} Updated`);
});

app.post("/todos/", checkBodyValues, async (request, response) => {
  const previousTodoQuery = `SELECT COUNT(*) AS rowCount FROM todo`;
  const dbCount = await db.get(previousTodoQuery);
  let id = dbCount.rowCount;
  const { todo, priority, status, category, dueDate } = request.body;
  const insertTodoQuery = `INSERT INTO 
todo (id,todo,category,priority,status,due_date)
VALUES (${id},'${todo}','${category}','${priority}','${status}','${dueDate}');
`;
  const dbUser = await db.run(insertTodoQuery);
  let lastid = dbUser.lastID;
  response.send("Todo Successfully Added");
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo 
    WHERE id = ${todoId}`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
