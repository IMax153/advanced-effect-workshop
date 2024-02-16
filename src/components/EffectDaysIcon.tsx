import EffectDaysSvg from "@/assets/effect-days.svg"
import Image from "next/image"

export declare namespace EffectDaysIcon {
  export interface Props {
    readonly className?: string
  }
}

const EffectDaysIcon: React.FC<EffectDaysIcon.Props> = ({ className }) => (
  <Image
    src={EffectDaysSvg}
    alt="The Effect logo followed by the text 'Effect Days'"
    className={className}
  />
)

EffectDaysIcon.displayName = "EffectDaysIcon"

export default EffectDaysIcon
