import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import NoteDetailPage from "@/components/NoteDetailPage";

export default async function NotePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/");

  const { id } = await params;

  return <NoteDetailPage noteId={id} user={user} />;
}
