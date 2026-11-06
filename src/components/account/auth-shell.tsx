import Image from "@/components/ui/smart-image";
import { img } from "@/config/demo-data";
import { Logo } from "@/components/ui/logo";

export function AuthShell({ eyebrow, title, children, image = "1515886657613-9f3515b0c78f" }: { eyebrow: string; title: React.ReactNode; children: React.ReactNode; image?: string }) {
  return (
    <div className="grid min-h-[calc(100svh-110px)] lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-espresso lg:block">
        <Image src={img(image, 1400)} alt="" fill priority sizes="50vw" quality={65} className="object-cover opacity-85" />
        <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-transparent to-transparent" />
        <div className="absolute bottom-12 left-12">
          <Logo variant="full" tone="light" height={150} />
          <p className="mt-6 max-w-sm font-serif text-3xl italic leading-tight text-ivory">“Everything that makes you, you.”</p>
        </div>
      </div>
      <div className="flex items-center justify-center px-5 py-16 sm:px-10">
        <div className="w-full max-w-md">
          <p className="eyebrow text-mocha">{eyebrow}</p>
          <h1 className="display mt-3 text-[clamp(2.4rem,4vw,3.6rem)]">{title}</h1>
          <div className="mt-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
