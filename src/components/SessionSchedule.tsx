import React from "react"

export declare namespace SessionSchedule {
  export interface Props {
    readonly title: string
    readonly from: string
    readonly to: string
    readonly objectives: ReadonlyArray<React.ReactNode>
    readonly project: string
  }
}

const SessionSchedule: React.FC<SessionSchedule.Props> = ({
  from,
  objectives,
  project,
  title,
  to
}) => (
  <div>
    <div className="px-4 sm:px-0">
      <p className="prose-2xl">{title}</p>
    </div>
    <div className="border-t border-gray-100">
      <dl>
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="prose-xl">Time</dt>
          <dd className="prose-xl mt-1 sm:col-span-2 sm:mt-0">{from} - {to}</dd>
        </div>
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="prose-xl">Goals</dt>
          <dd className="prose-xl mt-1 sm:col-span-2 sm:mt-0">
            <ul className="!ml-0 list-outside">
              {objectives.map((objective, index) => (
                <li key={`Objective:${index}`} className="prose-xl !mt-0">{objective}</li>
              ))}
            </ul>
          </dd>
        </div>
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="prose-xl">Session Project</dt>
          <dd className="prose-xl mt-1 sm:col-span-2 sm:mt-0">{project}</dd>
        </div>
      </dl>
    </div>
  </div>
)

SessionSchedule.displayName = "SessionSchedule"

export default SessionSchedule
