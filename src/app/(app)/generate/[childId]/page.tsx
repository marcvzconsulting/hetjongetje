import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { GenerateWizard } from "@/components/generation/generate-wizard";
import { calculateAge } from "@/lib/utils/age";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function GeneratePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
  });

  if (!child) notFound();

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <div className="mb-8 text-center">
          <div className="text-4xl mb-2">✨📖</div>
          <h1 className="text-2xl font-bold">
            Nieuw verhaal voor {child.name}
          </h1>
          <p className="text-sm text-muted-foreground">
            Beantwoord een paar vragen en we maken een magisch verhaal
          </p>
        </div>
        <GenerateWizard
          child={{
            id: child.id,
            name: child.name,
            age: calculateAge(child.dateOfBirth),
            gender: child.gender,
            interests: child.interests,
            pets: child.pets as { name: string; type: string }[] | null,
            friends: child.friends as { name: string; relationship: string }[] | null,
            favoriteThings: child.favoriteThings as { color?: string; food?: string; toy?: string; place?: string } | null,
            fears: child.fears,
            mainCharacterType: child.mainCharacterType,
            mainCharacterDescription: child.mainCharacterDescription,
          }}
        />
      </div>
    </div>
  );
}
