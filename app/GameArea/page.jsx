import React from 'react'

const SUITS = ['♠', '♥', '♦', '♣']

const Game = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a2a1f] relative overflow-hidden font-serif">
      {/* felt texture / vignette */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 40%, rgba(20,74,54,0.9) 0%, rgba(6,28,20,1) 75%)',
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay"
        style={{
          backgroundImage:
            'repeating-linear-gradient(45deg, #fff 0px, #fff 1px, transparent 1px, transparent 3px)',
        }}
      />

      {/* gold hairline border frame */}
      <div className="absolute inset-6 border border-[#c9a227]/20 rounded-sm pointer-events-none" />

      <div className="relative flex flex-col items-center gap-8">
        {/* dealing card stack */}
        <div className="relative w-24 h-32">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="absolute inset-0 rounded-md border border-[#c9a227]/40 shadow-[0_8px_24px_rgba(0,0,0,0.5)]"
              style={{
                background: 'linear-gradient(135deg, #0f4a34 0%, #0a2a1f 100%)',
                animation: `dealCard 1.6s cubic-bezier(0.6,0,0.3,1) ${i * 0.25}s infinite`,
              }}
            >
              <div className="absolute inset-2 border border-[#c9a227]/30 rounded-sm flex items-center justify-center">
                <span
                  className="text-[#c9a227]/60 text-2xl"
                  style={{ animation: `suitCycle 1.6s steps(1) ${i * 0.25}s infinite` }}
                >
                  {SUITS[i % SUITS.length]}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* title */}
        <div className="flex flex-col items-center gap-2">
          <h1 className="text-[#e8d9a0] text-3xl tracking-[0.35em] uppercase font-semibold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
            Cassino
          </h1>
          <div className="flex items-center gap-3">
            <span className="w-8 h-px bg-[#c9a227]/50" />
            <span className="text-[#c9a227] text-xs tracking-[0.4em] uppercase font-sans">
              Dealing you in
            </span>
            <span className="w-8 h-px bg-[#c9a227]/50" />
          </div>
        </div>

        {/* status */}
        <p className="text-[#e8d9a0]/40 font-mono text-[11px] tracking-widest uppercase">
          Connecting to table
        </p>
      </div>

      
    </div>
  )
}

export default Game