"use client"

import "reveal.js/dist/reveal.css"
import "reveal.js/dist/theme/black.css"
import "./atom-one-dark.css"
import React from "react"
import RevealJS from "reveal.js"
import EffectDaysIcon from "./EffectDaysIcon"
// @ts-expect-error
import RevealHighlight from "reveal.js/plugin/highlight/highlight.esm.js"
// @ts-expect-error
import RevealMath from "reveal.js/plugin/math/math.esm.js"
// @ts-expect-error
import RevealNotes from "reveal.js/plugin/notes/notes.esm.js"
// @ts-expect-error
import RevealZoom from "reveal.js/plugin/zoom/zoom.esm.js"

export declare namespace Presentation {
  export interface Props {}
}

const Presentation: React.FC<React.PropsWithChildren<Presentation.Props>> = ({ children }) => {
  const ref = React.useRef<HTMLDivElement>(null)
  const reveal = React.useRef<Reveal.Api>()

  React.useEffect(() => {
    const isInitializing = ref.current?.classList.contains("reveal")

    if (isInitializing) {
      return
    }

    ref.current!.classList.add("reveal")

    reveal.current = new RevealJS(ref.current!, {
      hash: true,
      controls: false,
      progress: false,
      slideNumber: false,
      transition: "none",
      pdfSeparateFragments: false,
      plugins: [
        RevealHighlight,
        RevealZoom,
        RevealNotes,
        RevealMath
      ]
    })

    reveal.current.initialize().then(() => {
      // good place for event handlers and plugin setups
    })

    return () => {
      if (!reveal.current) {
        return
      }
      try {
        reveal.current!.destroy()
      } catch (e) {
        console.warn("Could not destroy RevealJS instance")
      }
    }
  }, [])

  return (
    <div ref={ref}>
      <div className="slides">
        {children}
      </div>
      <EffectDaysIcon className="bottom-0 left-4 absolute w-1/6" />
    </div>
  )
}

Presentation.displayName = "Presentation"

export default Presentation
