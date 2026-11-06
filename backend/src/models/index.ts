import mongoose, { Document, Schema, Types } from "mongoose";

// ── User ─────────────────────────────────────────────────────────────────────
export interface IUser extends Document {
  name: string; email: string; passwordHash: string;
  careerId?: Types.ObjectId; onboarded: boolean;
  college?: string; degree?: string; gradYear?: number; semester?: number;
  skills: { skillId: Types.ObjectId; level: number }[];
  completedModules: Types.ObjectId[];
  createdAt: Date; completedProjects: string[]; extraFocus: string[]; resumeScore?: number; githubScore?: number;
}
const UserSchema = new Schema<IUser>({
  name: { type: String, required: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  careerId: { type: Schema.Types.ObjectId, ref: "Career" },
  onboarded: { type: Boolean, default: false },
  college: String, degree: String, gradYear: Number, semester: Number,
  skills: [{ skillId: { type: Schema.Types.ObjectId, ref: "Skill" }, level: { type: Number, default: 0 }, _id: false }],
  completedModules: [{ type: Schema.Types.ObjectId, ref: "Skill" }],
  completedProjects: [String], extraFocus: [String], resumeScore: Number, githubScore: Number,
}, { timestamps: true });
export const User = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

// ── Career ───────────────────────────────────────────────────────────────────
export interface ICareer extends Document {
  name: string;
  skills: { skillId: Types.ObjectId; skillName: string; required: number; order: number }[];
}
const CareerSchema = new Schema<ICareer>({
  name: { type: String, required: true, unique: true },
  skills: [{
    skillId: { type: Schema.Types.ObjectId, ref: "Skill" },
    skillName: String, required: Number, order: Number, _id: false
  }],
});
export const Career = mongoose.models.Career || mongoose.model<ICareer>("Career", CareerSchema);

// ── Skill ─────────────────────────────────────────────────────────────────────
export interface ISkill extends Document { name: string; }
const SkillSchema = new Schema<ISkill>({ name: { type: String, required: true, unique: true } });
export const Skill = mongoose.models.Skill || mongoose.model<ISkill>("Skill", SkillSchema);

// ── Question ─────────────────────────────────────────────────────────────────
export interface IQuestion extends Document {
  skillId: Types.ObjectId; skillName: string; type: string; difficulty: string;
  prompt: string; options: string[]; answer: number; explanation: string;
}
const QuestionSchema = new Schema<IQuestion>({
  skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
  skillName: String, type: { type: String, default: "mcq" },
  difficulty: { type: String, default: "easy" }, prompt: { type: String, required: true },
  options: [String], answer: { type: Number, required: true }, explanation: { type: String, required: true },
});
export const Question = mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);

// ── Mission ───────────────────────────────────────────────────────────────────
export interface IMission extends Document {
  userId: Types.ObjectId; skillId: Types.ObjectId; skillName: string;
  title: string; date: string; done: boolean;
}
const MissionSchema = new Schema<IMission>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  skillId: { type: Schema.Types.ObjectId, ref: "Skill", required: true },
  skillName: String, title: { type: String, required: true },
  date: { type: String, required: true }, done: { type: Boolean, default: false },
});
MissionSchema.index({ userId: 1, date: 1 });
export const Mission = mongoose.models.Mission || mongoose.model<IMission>("Mission", MissionSchema);

// ── AIConversation ────────────────────────────────────────────────────────────
export interface IAIConversation extends Document {
  userId: Types.ObjectId; messages: { role: "user"|"assistant"; content: string; at: Date }[];
}
const AIConvSchema = new Schema<IAIConversation>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  messages: [{ role: { type: String, enum: ["user","assistant"] }, content: String, at: { type: Date, default: Date.now }, _id: false }],
});
export const AIConversation = mongoose.models.AIConversation || mongoose.model<IAIConversation>("AIConversation", AIConvSchema);

// ── InterviewSession ──────────────────────────────────────────────────────────
export interface IInterviewSession extends Document {
  userId: Types.ObjectId; type: string; career: string;
  turns: { question: string; answer: string; feedback: string; score: number; at: Date }[];
  overallScore?: number; status: "active"|"complete";
}
const InterviewSchema = new Schema<IInterviewSession>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true }, career: { type: String, required: true },
  turns: [{ question: String, answer: String, feedback: String, score: Number, at: { type: Date, default: Date.now }, _id: false }],
  overallScore: Number, status: { type: String, default: "active" },
}, { timestamps: true });
export const InterviewSession = mongoose.models.InterviewSession || mongoose.model<IInterviewSession>("InterviewSession", InterviewSchema);

// ── Attempt (assessment history) ─────────────────────────────────────────────
export const Attempt = mongoose.models.Attempt || mongoose.model("Attempt", new Schema({
  userId: { type: Schema.Types.ObjectId, index: true }, skillName: String, pct: Number, level: Number,
}, { timestamps: true }));
