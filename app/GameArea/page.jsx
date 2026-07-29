
import React from 'react'
const Game = () => {






  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 relative overflow-hidden">
      {/* ambient glow */}
      <div className="absolute w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl animate-pulse" />

      <div className="relative flex flex-col items-center gap-6">
        {/* spinner ring */}
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-cyan-500/20" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-400 animate-spin" />
        </div>

        <h1 className="text-cyan-300 font-mono text-xl tracking-[0.3em] uppercase animate-pulse drop-shadow-[0_0_10px_rgba(34,211,238,0.7)]">
          Starting Game
        </h1>

        {/* animated dots */}
        <div className="flex gap-1 font-mono text-cyan-400 text-2xl -mt-4">
          <span className="animate-bounce [animation-delay:-0.3s]">.</span>
          <span className="animate-bounce [animation-delay:-0.15s]">.</span>
          <span className="animate-bounce">.</span>
        </div>

        {/* progress bar */}
        <div className="w-64 h-2 bg-zinc-800 rounded-full overflow-hidden border border-cyan-500/30">
          <div className="h-full bg-cyan-400 rounded-full animate-[loading_1.8s_ease-in-out_infinite] shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
        </div>

        <p className="text-zinc-500 font-mono text-xs tracking-widest uppercase">
          Connecting to server
        </p>
      </div>

      <style>{`
        @keyframes loading {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  )
}

export default Game