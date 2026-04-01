import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { ProfileWizard } from "@/components/profile/profile-wizard";

export default async function NewProfilePage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-2">🧒✨</div>
          <h1 className="text-2xl font-bold">Vertel ons over je kind</h1>
          <p className="text-sm text-muted-foreground">
            Hoe meer we weten, hoe persoonlijker de verhalen worden
          </p>
        </div>
        <ProfileWizard />
      </div>
    </div>
  );
}
