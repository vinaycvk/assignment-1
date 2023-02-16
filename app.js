const express = require("express");
const path = require("path");

var format = require("date-fns/format");
var isValid = require("date-fns/isValid");

const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const addDays = require("date-fns/addDays");

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

const convertToCamel = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    category: dbObject.category,
    priority: dbObject.priority,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

let possiblesOfPriority = ["HIGH", "MEDIUM", "LOW"];
let possiblesOfStatus = ["TO DO", "IN PROGRESS", "DONE"];
let possiblesOfCategory = ["WORK", "HOME", "LEARNING"];

const hasPriorityAndStatusProperties = (requestQuery) => {
  return (
    requestQuery.priority !== undefined && requestQuery.status !== undefined
  );
};

const hasCategoryAndStatus = (requestQuery) => {
  return (
    requestQuery.category !== undefined && requestQuery.status !== undefined
  );
};

const categoryAndPriority = (requestQuery) => {
  requestQuery.category !== undefined && requestQuery.priority !== undefined;
};

const hasPriorityProperty = (requestQuery) => {
  return requestQuery.priority !== undefined;
};

const hasStatusProperty = (requestQuery) => {
  return requestQuery.status !== undefined;
};

const hasCategory = (requestQuery) => {
  return requestQuery.category !== undefined;
};

app.get("/todos/", async (request, response) => {
  let data = null;
  let getTodosQuery = "";
  const { search_q = "", priority, status, category } = request.query;

  switch (true) {
    case hasPriorityAndStatusProperties(request.query): //if this is true then below query is taken in the code
      getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND status = '${status}'
                        AND priority = '${priority}';`;
      data = await db.all(getTodosQuery);
      response.send(data.map((each) => convertToCamel(each)));

      break;
    case hasCategoryAndStatus(request.query):
      getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                         category = '${category}'
                        AND status = '${status}';`;
      data = await db.all(getTodosQuery);
      response.send(data.map((each) => convertToCamel(each)));
      break;
    case categoryAndPriority(request.query):
      getTodosQuery = `
                    SELECT
                        *
                    FROM
                        todo 
                    WHERE
                        todo LIKE '%${search_q}%'
                        AND category = '${category}'
                        AND priority = '${priority}';`;
      data = await db.all(getTodosQuery);
      response.send(data.map((each) => convertToCamel(each)));
      break;
    case hasPriorityProperty(request.query):
      if (possiblesOfPriority.includes(priority)) {
        getTodosQuery = `
                SELECT
                    *
                FROM
                    todo 
                WHERE
                    todo LIKE '%${search_q}%'
                    AND priority = '${priority}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((each) => convertToCamel(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Priority");
      }
      break;
    case hasStatusProperty(request.query):
      if (possiblesOfStatus.includes(status)) {
        getTodosQuery = `
                SELECT
                    *
                FROM
                    todo 
                WHERE
                    todo LIKE '%${search_q}%'
                    AND status = '${status}';`;
        data = await db.all(getTodosQuery);
        response.send(data.map((each) => convertToCamel(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Status");
      }
      break;
    case hasCategory(request.query):
      if (possiblesOfCategory.includes(category)) {
        getTodosQuery = `
                SELECT
                    *
                FROM
                    todo 
                WHERE
                    todo LIKE '%${search_q}%'
                    AND category = '${category}'`;
        data = await db.all(getTodosQuery);
        response.send(data.map((each) => convertToCamel(each)));
      } else {
        response.status(400);
        response.send("Invalid Todo Category");
      }
      break;
    default:
      getTodosQuery = `
        SELECT
            *
        FROM
            todo 
        WHERE
            todo LIKE '%${search_q}%';`;
      data = await db.all(getTodosQuery);
      response.send(data.map((each) => convertToCamel(each)));
  }
});

app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const dbQuery = ` select * from todo where id = ${todoId};`;
  const dbResponse = await db.get(dbQuery);
  response.send(convertToCamel(dbResponse));
});

app.get("/agenda/", async (request, response) => {
  let { date } = request.query;
  let newDate = format(new Date(date), "yyyy-MM-dd");
  if (isValid(new Date(date))) {
    if (date === newDate) {
      const dbQuery = ` select * from todo where due_date = '${newDate}';`;
      const dbResponse = await db.get(dbQuery);
      response.send(convertToCamel(dbResponse));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } else {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

app.post("/todos/", async (request, response) => {
  const { id, todo, priority, status, category, dueDate } = request.body;

  const formatDate = format(new Date(dueDate), "yyyy-MM-dd");
  if (!possiblesOfPriority.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!possiblesOfStatus.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!possiblesOfCategory.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (dueDate !== formatDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const updateQuery = `INSERT INTO todo (id, todo, priority, status, category, due_date)
      VALUES( '${id}', '${todo}', '${priority}', '${status}', '${category}', '${dueDate}');`;
    await db.run(updateQuery);
    response.send("Todo Successfully Added");
  }
});

app.put("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  let upDateColumn = "";
  const requestBody = request.body;
  switch (true) {
    case requestBody.status !== undefined:
      upDateColumn = "Status";
      break;
    case requestBody.priority !== undefined:
      upDateColumn = "Priority";
      break;
    case requestBody.todo !== undefined:
      upDateColumn = "Todo";
      break;
    case requestBody.category !== undefined:
      upDateColumn = "Category";
      break;
    case requestBody.dueDate !== undefined:
      upDateColumn = "Due Date";
      break;
  }

  const selectTodo = `
    select * from todo where id = '${todoId}';`;

  const dbResponse = await db.get(selectTodo);

  const {
    todo = dbResponse.todo,
    priority = dbResponse.priority,
    status = dbResponse.status,
    category = dbResponse.category,
    dueDate = dbResponse.due_date,
  } = requestBody;

  const formatDate = format(new Date(dueDate), "yyyy-MM-dd");

  if (!possiblesOfPriority.includes(priority)) {
    response.status(400);
    response.send("Invalid Todo Priority");
  } else if (!possiblesOfStatus.includes(status)) {
    response.status(400);
    response.send("Invalid Todo Status");
  } else if (!possiblesOfCategory.includes(category)) {
    response.status(400);
    response.send("Invalid Todo Category");
  } else if (dueDate !== formatDate) {
    response.status(400);
    response.send("Invalid Due Date");
  } else {
    const updateQuery = `
    update todo set
    todo = '${todo}',
    category = '${category}',
    priority = '${priority}',
    status = '${status}',
    due_date = '${dueDate}' 
    where id = '${todoId}';`;

    await db.run(updateQuery);
    response.send(`${upDateColumn} Updated`);
  }
});

app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteQuery = `
    delete from todo where id = ${todoId};`;
  await db.run(deleteQuery);
  response.send("Todo Deleted");
});

module.exports = app;
