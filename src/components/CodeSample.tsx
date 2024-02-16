import classNames from "classnames"
import React from "react"

export declare namespace CodeSample {
  export interface Props {
    readonly className?: string
    readonly lineNumbers?: string | boolean
  }
}

const CodeSample: React.FC<React.PropsWithChildren<CodeSample.Props>> = ({
  children,
  className = "",
  lineNumbers = true
}) => (
  <pre className="!shadow-none !w-full">
    <code
      className={classNames(className, "language-typescript", "!flex", "!justify-center")}
      data-trim
      data-noescape
      data-line-numbers={lineNumbers}
    >
      {children}
    </code>
  </pre>
)

CodeSample.displayName = "CodeSample"

export default CodeSample
