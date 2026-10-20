const express = require("express");
const cors = require("cors");
const fs = require("fs/promises");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = 5000;
const DATA_FILE = path.join(__dirname, "..", "data", "courses.json");

app.use(cors());
app.use(express.json());

async function readCourses() {
  try {
    const content = await fs.readFile(DATA_FILE, "utf8");
    return JSON.parse(content);
  } catch {
    return [];
  }
}
async function saveCourses(courses) {
  await fs.writeFile(DATA_FILE, JSON.stringify(courses, null, 2), "utf8");
}

app.get("/health", (req,res)=> res.json({status:"ok", application:"CodeCraftHub"}));
app.get("/api/courses", async (req,res)=>{
  let courses = await readCourses();
  const {status, search, tag} = req.query;
  if(status) courses = courses.filter(c=>c.status===status);
  if(search) courses = courses.filter(c=> (c.title+" "+c.description).toLowerCase().includes(search.toLowerCase()));
  if(tag) courses = courses.filter(c=>c.tags.includes(tag));
  res.json(courses);
});
app.get("/api/stats", async (req,res)=>{
  const courses = await readCourses();
  res.json({
    total: courses.length,
    planned: courses.filter(c=>c.status==="planned").length,
    inProgress: courses.filter(c=>c.status==="in-progress").length,
    completed: courses.filter(c=>c.status==="completed").length
  });
});
app.get("/api/courses/:id", async (req,res)=>{
  const courses = await readCourses();
  const course = courses.find(c=>c.id===req.params.id);
  if(!course) return res.status(404).json({error:"Curso no encontrado"});
  res.json(course);
});
app.post("/api/courses", async (req,res)=>{
  if(!req.body.title) return res.status(400).json({error:"Título obligatorio"});
  const courses = await readCourses();
  const newCourse = {
    id: crypto.randomUUID(),
    title: req.body.title.trim(),
    description: req.body.description||"",
    platform: req.body.platform||"",
    url: req.body.url||"",
    level: req.body.level||"beginner",
    tags: Array.isArray(req.body.tags)?req.body.tags:[],
    status: req.body.status||"planned",
    progress: req.body.progress??0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  courses.push(newCourse);
  await saveCourses(courses);
  res.status(201).json(newCourse);
});
app.delete("/api/courses/:id", async (req,res)=>{
  const courses = await readCourses();
  const filtered = courses.filter(c=>c.id!==req.params.id);
  if(filtered.length===courses.length) return res.status(404).json({error:"No encontrado"});
  await saveCourses(filtered);
  res.status(204).send();
});

app.listen(PORT, ()=> console.log(`CodeCraftHub en http://localhost:${PORT}`));