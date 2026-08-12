import { redirect } from "next/navigation";
import { supabaseServer } from "@/shared/lib/supabase/server";
import { getServerLang } from "@/shared/lib/lang-cookie.server";
import { getMyProjects } from "@/features/projects/services/project.service";
import { Level2GamesTestPage } from "@/features/level2/components/Level2GamesTestPage";

export default async function Level2GamesPage() {
  const supabase = supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login?redirectedFrom=/level2/games");

  // Temporary test-harness need only: LessonReflectionForm needs a real
  // project to write into. Not project selection UX — just the first
  // one, for verifying the component against the real database.
  const projects = await getMyProjects(supabase, user.id);

  return (
    <Level2GamesTestPage
      initialLang={getServerLang()}
      testProjectId={projects[0]?.id ?? null}
      testProjectName={projects[0]?.name ?? null}
    />
  );
}
