import "dotenv/config"
import express from "express"
import cors from "cors"
import { fileURLToPath } from "url"
import path from "path"
import { readFileSync, writeFileSync } from "node:fs";

const usersPath = "./data/users.json"
const exercisesPath = "./data/exercises.json"

function saveData(pathData, data){
  const stringifyData = JSON.stringify(data)
  writeFileSync(pathData, stringifyData)
}

function getData(pathData){
  const data = readFileSync(pathData)
  return JSON.parse(data)
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors({optionsSuccessStatus: 200}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get("/", (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
})

app.get("/api/users", (req, res) => {
  const users = getData(usersPath)
  return res.json(users)
})

app.post("/api/users", (req, res) => {
  const { username } = req.body
  const user = {
    username: username,
    _id: crypto.randomUUID()
  }
  const users = getData(usersPath)
  users.push(user)
  saveData(usersPath, users)
  return res.json(user)
})

app.post("/api/users/:id/exercises", (req, res) => {
  const { id } = req.params
  const { description, duration }  = req.body
  let { date } = req.body
  const users = getData(usersPath)
  const user = users.find(user => user._id == id)
  if(user === undefined){
    return res.status(403).json({ error: "User not found" })
  }
  if(date === undefined || date.length === 0){
    date = new Date()
    date = date.toDateString()
  } else {
    date = new Date(date)
    if(date.toString() === "Invalid Date" ){
      return res.json({ error: "Invalid Date" })
    }
    date = date.toDateString();
  }
  const exercise = {
    username: user.username,
    description: description,
    duration: Number(duration),
    date: date,
    _id: user._id
  }
  const exercises = getData(exercisesPath)
  exercises.push(exercise)
  saveData(exercisesPath, exercises)
  return res.json(exercise)
})

app.get("/api/users/:id/logs", (req, res) => {
  const { id } = req.params
  let { from, to, limit } = req.query
  from = from === undefined 
    ? new Date(0)
    : new Date(from)
  to = to === undefined 
    ? new Date()
    : new Date(to)
  if(limit === undefined){
    limit = Infinity
  }
  const users = getData(usersPath)
  const user = users.find(user => user._id == id)
  if(user === undefined){
    return res.status(403).json({ error: "User not found" })
  }
  const allExercises = getData(exercisesPath)
  const userExercises = allExercises.filter(e => e.username === user.username)

  res.json({
    username: user.username,
    count: userExercises.length,
    _id: user._id,
    log: userExercises
          .filter(ue => {
            const ueDate = new Date(ue.date)
            return ueDate >= from && ueDate <= to
          })
          .map(ue => ({
            description: ue.description,
            duration: ue.duration,
            date: ue.date
          }))
          .slice(0, limit)
  })
})

const PORT = process.env.PORT ?? 3000

app.listen(PORT, () => {
  console.log(`App is listening on http://127.0.0.1:${PORT}`)
})
