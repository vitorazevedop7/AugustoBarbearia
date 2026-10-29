import { ProfileContent } from "./profile-content";

export default function ProfileLoading() {
  return (
    <ProfileContent busy>
      <p role="status" className="sr-only">
        Carregando seu perfil.
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        {[0, 1, 2].map((item) => (
          <div key={item} className="h-20 bg-line motion-safe:animate-pulse" />
        ))}
      </div>
    </ProfileContent>
  );
}
