export function Hero() {
  return (
    <section className="relative w-full h-112.5 flex items-center justify-start overflow-hidden bg-gray-900">
      {/* Imagem de fundo */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/Event_1.png')",
        }}
      />

      {/* Overlay escuro para contraste do texto */}
      <div className="absolute inset-0 bg-black/50"></div>

      {/* Conteúdo alinhado à esquerda */}
      <div className="relative z-10 max-w-4xl mx-8 md:mx-16 lg:mx-26 text-left text-white py-6">
        <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight drop-shadow-lg">
          Encontre experiências que acontecem perto de você
        </h1>

        <p className="mt-3 text-base sm:text-lg md:text-xl text-gray-200 max-w-xl drop-shadow">
          Acesso exclusivo aos melhores shows, festas, festivais e eventos culturais da sua cidade. Descubra sua próxima grande noite.
        </p>

        {/* Barra de busca com inputs e botão */}
        <div className="mt-6 sm:mt-8 flex flex-col sm:flex-row gap-2 sm:gap-3 max-w-2xl w-full">
          <input
            type="text"
            placeholder="Nome do evento"
            className="flex-1 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm text-white placeholder-white/80 outline-none backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] focus-visible:border-purple-300 focus-visible:ring-2 focus-visible:ring-purple-400 motion-reduce:transition-none"
          />
          <input
            type="text"
            placeholder="Cidade"
            className="flex-1 rounded-full border border-white/30 bg-white/20 px-4 py-2 text-sm text-white placeholder-white/80 outline-none backdrop-blur-sm transition-[background-color,border-color,color,box-shadow] focus-visible:border-purple-300 focus-visible:ring-2 focus-visible:ring-purple-400 motion-reduce:transition-none"
          />
          <button className="w-full rounded-full bg-purple-500 px-5 py-2 text-sm font-semibold text-white shadow-lg shadow-purple-500/30 transition-[background-color,box-shadow,transform] hover:bg-purple-600 hover:scale-[1.02] active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-purple-300 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:w-auto sm:px-6">
            Explorar eventos →
          </button>
        </div>

        <p className="mt-4 text-xs sm:text-sm text-gray-300/80">
          🔥 Mais de 500 eventos disponíveis
        </p>
      </div>
    </section>
  );
}
