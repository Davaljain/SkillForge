import "./globals.css";
export const metadata = { title: "SkillForge", description: "Discover your skills. Build your roadmap. Become job-ready." };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>{children}</body></html>;
}
