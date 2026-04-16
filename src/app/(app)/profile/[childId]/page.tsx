import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import { calculateAge } from "@/lib/utils/age";
import { ProfileEditor } from "./client";

interface Props {
  params: Promise<{ childId: string }>;
}

export default async function ProfilePage({ params }: Props) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const { childId } = await params;

  const child = await prisma.childProfile.findFirst({
    where: { id: childId, userId: session.user.id },
    include: { _count: { select: { stories: true } } },
  });

  if (!child) notFound();

  const age = calculateAge(child.dateOfBirth);

  return (
    <div className="min-h-full px-6 py-8">
      <div className="mx-auto max-w-2xl">
        <ProfileEditor
          child={{
            id: child.id,
            name: child.name,
            dateOfBirth: child.dateOfBirth.toISOString().split("T")[0],
            age,
            gender: child.gender,
            hairColor: child.hairColor || "",
            hairStyle: child.hairStyle || "",
            eyeColor: child.eyeColor || "",
            skinColor: child.skinColor || "",
            wearsGlasses: child.wearsGlasses,
            hasFreckles: child.hasFreckles,
            interests: child.interests,
            pets: (child.pets as { name: string; type: string }[]) || [],
            friends: (child.friends as { name: string; relationship: string }[]) || [],
            favoriteThings: (child.favoriteThings as { color: string; food: string; toy: string; place: string }) || { color: "", food: "", toy: "", place: "" },
            fears: child.fears,
            mainCharacterType: child.mainCharacterType,
            mainCharacterDescription: child.mainCharacterDescription || "",
            storyCount: child._count.stories,
            approvedPreviewUrl: child.approvedPreviewUrl || null,
            hasApprovedPrompt: !!child.approvedCharacterPrompt,
          }}
        />
      </div>
    </div>
  );
}
