import React from "react"

export declare namespace InlineCode {
  export interface Props {}
}

const InlineCode: React.FC<React.PropsWithChildren<InlineCode.Props>> = ({ children }) => (
  <span className="font-mono text-rose-400">{children}</span>
)

InlineCode.displayName = "InlineCode"

export default InlineCode
