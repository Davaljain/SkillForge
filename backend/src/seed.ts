import "dotenv/config";
import mongoose from "mongoose";
import { Career, Skill, Question } from "./models/index";

const CAREERS: Record<string, [string, number][]> = {
  "Full Stack Developer":   [["HTML/CSS",65],["JavaScript",75],["React",70],["Node.js",70],["SQL",60],["Git",65],["REST APIs",65]],
  "Frontend Developer":     [["HTML/CSS",80],["JavaScript",80],["React",80],["Git",60],["REST APIs",50]],
  "Backend Developer":      [["JavaScript",65],["Node.js",80],["SQL",75],["Git",65],["REST APIs",75]],
  "Data Analyst":           [["SQL",80],["Python",65],["Git",40]],
  "Data Scientist":         [["Python",80],["SQL",60],["Git",50]],
  "AI/ML Engineer":         [["Python",80],["SQL",50],["Git",55]],
  "DevOps Engineer":        [["Git",75],["Docker",70],["SQL",40],["Node.js",50]],
  "Cybersecurity Engineer": [["Git",60],["SQL",55],["Node.js",45]],
  "Android Developer":      [["Java",75],["Git",60],["SQL",45]],
};

type Q = { skill: string; prompt: string; options: string[]; answer: number; explanation: string; difficulty?: string };
const q = (skill:string,prompt:string,options:string[],answer:number,explanation:string,difficulty="easy"): Q =>
  ({skill,prompt,options,answer,explanation,difficulty});

const QUESTIONS: Q[] = [
  q("JavaScript","What does `console.log(typeof null)` print?",["null","object","undefined","number"],1,"A historical quirk: typeof null is 'object'."),
  q("JavaScript","Output of `[1,2,3].map(x=>x*2)`?",["[1,2,3]","[2,4,6]","6","undefined"],1,"map() returns a new array with each element transformed."),
  q("JavaScript","What does `2 + '2'` evaluate to?",["4","'22'","NaN","Error"],1,"The number is coerced to a string, then concatenated."),
  q("JavaScript","Which keyword declares a block-scoped reassignable variable?",["var","let","const","function"],1,"let is block-scoped and can be reassigned; const cannot."),
  q("JavaScript","What does `Array.isArray([].slice(0))` return?",["true","false","undefined","Error"],0,"slice(0) returns a shallow copy array, so isArray is true.","medium"),
  q("JavaScript","Predict: `console.log([1,2]+[3,4])`",["'1,23,4'","[1,2,3,4]","NaN","Error"],0,"Arrays coerce to strings then concatenate: '1,2'+'3,4'.","hard"),
  q("JavaScript","What is a closure?",["A loop construct","A function retaining its outer scope","A type of class","An error handler"],1,"A closure is a function that remembers variables from its enclosing scope.","medium"),
  q("JavaScript","Which method removes the last element of an array?",["shift()","pop()","splice()","slice()"],1,"pop() removes and returns the last element."),
  q("React","Which hook stores component state?",["useRef","useEffect","useState","useMemo"],2,"useState returns a [value, setter] pair."),
  q("React","When does useEffect with [] dependency array run?",["Every render","Once after mount","Never","On unmount only"],1,"Empty deps array makes the effect run once after first render."),
  q("React","What does useRef NOT do?",["Persist mutable value across renders","Trigger re-render on change","Access a DOM node","Store a timer id"],1,"Updating a ref does NOT cause a re-render.","medium"),
  q("React","Debug: list renders a key warning. Fix?",["Add unique key prop to each item","Wrap in Fragment","Use useEffect","Add PropTypes"],0,"React needs a stable unique key to reconcile list items.","medium"),
  q("React","What does useMemo primarily optimize?",["Network requests","Expensive recalculations","CSS rendering","Event listeners"],1,"useMemo memoizes a computed value to avoid recalculating on every render.","medium"),
  q("React","What is prop drilling?",["Passing props through many nested components","A debugging technique","A CSS pattern","State management"],0,"Prop drilling means passing data through intermediate components that don't need it.","easy"),
  q("Node.js","Which module creates an HTTP server natively?",["fs","http","path","os"],1,"The built-in http module provides HTTP server functionality."),
  q("Node.js","What does npm install read to resolve versions?",["package.json","tsconfig.json",".env","README.md"],0,"package.json (and package-lock.json) define dependencies and versions."),
  q("Node.js","Which is true about Node's event loop?",["Single-threaded JS execution","New thread per request","Cannot do async I/O","Blocks on every network call"],0,"JS execution is single-threaded; I/O is offloaded non-blocking.","medium"),
  q("Node.js","What does process.env hold?",["Browser cookies","Environment variables","Command history","System RAM"],1,"process.env contains environment variables set on the OS or in .env files."),
  q("SQL","Which clause filters grouped rows?",["WHERE","HAVING","ORDER BY","LIMIT"],1,"HAVING filters result sets after GROUP BY."),
  q("SQL","Which JOIN returns unmatched left rows with NULLs?",["INNER JOIN","LEFT JOIN","CROSS JOIN","SELF JOIN"],1,"LEFT JOIN keeps all left-table rows even when no match exists.","medium"),
  q("SQL","What does a PRIMARY KEY guarantee?",["Uniqueness and non-null","Faster INSERTs","Automatic backups","Encrypted storage"],0,"A primary key uniquely identifies each row and cannot be null."),
  q("SQL","What does SELECT DISTINCT do?",["Sorts rows","Removes duplicate rows","Filters NULL","Joins tables"],1,"DISTINCT removes duplicate rows from the result set."),
  q("Git","Which command creates a branch and switches to it?",["git branch x","git checkout -b x","git merge x","git init x"],1,"checkout -b (or switch -c in newer Git) creates and checks out a branch."),
  q("Git","What does git rebase do vs merge?",["Rewrites history onto new base","Deletes branch","Only works on remotes","Never causes conflicts"],0,"Rebase replays commits onto another base instead of a merge commit.","medium"),
  q("Git","What does git stash do?",["Deletes uncommitted changes","Saves uncommitted work temporarily","Pushes to remote","Resets HEAD"],1,"stash saves your working-directory changes without committing them."),
  q("HTML/CSS","Which CSS property creates a flex container?",["position","display","float","align"],1,"display: flex enables flexbox on a container."),
  q("HTML/CSS","Which HTML element is best for primary navigation?",["<div>","<nav>","<span>","<section>"],1,"<nav> is the semantic landmark element for navigation."),
  q("HTML/CSS","What does `box-sizing: border-box` change?",["Border color","Width includes padding and border","Font size","Z-index"],1,"border-box includes padding and border in the element's declared width.","medium"),
  q("Python","What is `len({1,1,2})`?",["3","2","1","Error"],1,"Sets discard duplicates, so {1,1,2} has two elements."),
  q("Python","What does `[x*2 for x in range(3)]` produce?",["[0,2,4]","[0,1,2]","[2,4,6]","Error"],0,"range(3) yields 0,1,2; doubled gives 0,2,4.","easy"),
  q("Python","What is the output of `print(type([]))`?",["<class 'tuple'>","<class 'list'>","<class 'dict'>","<class 'set'>"],1,"[] is a list literal.","easy"),
  q("REST APIs","Which HTTP method is idempotent and retrieves data?",["POST","PUT","GET","PATCH"],2,"GET is safe and idempotent — repeated calls return the same result without side effects."),
  q("REST APIs","What HTTP status code means 'resource created'?",["200","201","204","400"],1,"201 Created is returned when a new resource is successfully created."),
  q("REST APIs","What does CORS stand for?",["Cross-Origin Resource Sharing","Create Object Response Syntax","Client Object Request Service","Core Runtime Schema"],0,"CORS controls which origins can access resources on a server.","medium"),
  q("Docker","What is a Docker image?",["A running container","A read-only template to create containers","A virtual machine","A config file"],1,"An image is a read-only blueprint; running it creates a container."),
  q("Docker","What does docker-compose up do?",["Builds a single image","Starts services defined in docker-compose.yml","Pushes to registry","Runs tests"],1,"docker-compose up starts all services in the compose file."),
  q("Java","Which keyword prevents a class from being subclassed?",["static","final","abstract","private"],1,"The final keyword on a class prevents inheritance.","medium"),
  q("Java","What is the entry point of a Java program?",["run()","start()","main()","init()"],2,"public static void main(String[] args) is the standard entry point."),
];

async function main() {
  const uri = process.env.MONGODB_URI ?? "mongodb://localhost:27017/skillforge";
  await mongoose.connect(uri);
  console.log("Connected to MongoDB");

  // Clear existing seed data
  await Promise.all([Career.deleteMany({}), Skill.deleteMany({}), Question.deleteMany({})]);

  // Upsert all skills
  const skillMap: Record<string, mongoose.Types.ObjectId> = {};
  const allSkillNames = [...new Set([...Object.values(CAREERS).flat().map(([n]) => n), ...QUESTIONS.map(q => q.skill)])];
  for (const name of allSkillNames) {
    const s = await Skill.findOneAndUpdate({ name }, { name }, { upsert: true, new: true });
    skillMap[name] = s._id as mongoose.Types.ObjectId;
  }
  console.log(`Seeded ${Object.keys(skillMap).length} skills`);

  // Insert careers with embedded skill refs
  for (const [name, skillList] of Object.entries(CAREERS)) {
    const skills = skillList.map(([sName, req], i) => ({ skillId: skillMap[sName], skillName: sName, required: req, order: i }));
    await Career.findOneAndUpdate({ name }, { name, skills }, { upsert: true, new: true });
  }
  console.log(`Seeded ${Object.keys(CAREERS).length} careers`);

  // Insert questions
  const questionDocs = QUESTIONS.map(({ skill, ...rest }) => ({
    ...rest, skillId: skillMap[skill], skillName: skill,
  }));
  await Question.insertMany(questionDocs);
  console.log(`Seeded ${questionDocs.length} questions`);

  await mongoose.disconnect();
  console.log("Seed complete ✓");
}
main().catch(e => { console.error(e); process.exit(1); });
