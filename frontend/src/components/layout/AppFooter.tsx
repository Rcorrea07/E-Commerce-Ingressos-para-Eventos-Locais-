import Link from "next/link";
import { Brand } from "@/components/brand/Brand";

export function AppFooter() {
  return (
    <footer className="mt-auto border-t border-white/8 bg-black/12">
      <div className="content-grid grid gap-8 py-10 sm:grid-cols-[1fr_auto] sm:items-end">
        <div>
          <Brand />
          <p className="mt-4 max-w-md text-sm leading-6 text-muted-foreground">
            A cidade pulsa. Você vive. Descubra experiências locais e leve seu ingresso no bolso.
          </p>
        </div>
        <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
          <Link href="/#eventos" className="hover:text-white">Eventos</Link>
          <Link href="/produtor/ativar" className="hover:text-white">Área do produtor</Link>
          <Link href="/perfil" className="hover:text-white">Minha conta</Link>
        </div>
      </div>
    </footer>
  );
}
