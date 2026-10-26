import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

/** Position of `value` along the control, the thumbs staying within it (edge alignment, 1rem thumbs). */
function position(value: number, min: number, max: number) {
  const ratio = max > min ? (value - min) / (max - min) : 0
  return `calc(0.5rem + (100% - 1rem) * ${ratio})`
}

function Slider({
  className,
  defaultValue,
  value,
  min = 0,
  max = 100,
  step = 1,
  thumbLabel,
  getAriaValueText,
  ticks = false,
  rangeClassName = "bg-primary",
  ...props
}: SliderPrimitive.Root.Props & {
  /** Accessible name of the thumbs. */
  thumbLabel?: string
  getAriaValueText?: SliderPrimitive.Thumb.Props["getAriaValueText"]
  /** A dot on every step, the track swelling around it: a discrete slider. */
  ticks?: boolean
  /** Color of the range, from the start to the thumb, and of the steps it covers. */
  rangeClassName?: string
}) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]
  const end = _values.length === 1 ? _values[0] : _values[_values.length - 1]
  const start = _values.length === 1 ? min : _values[0]
  const covered = (tick: number) => tick >= start && tick <= end

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex h-4 w-full touch-none items-center select-none data-disabled:opacity-50">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative h-1 w-full grow rounded-full bg-muted select-none"
        >
          <div
            data-slot="slider-range"
            className={cn("absolute inset-y-0 rounded-full", rangeClassName)}
            style={{
              left: _values.length === 1 ? 0 : position(start, min, max),
              right: `calc(100% - ${position(end, min, max)})`,
            }}
          />
        </SliderPrimitive.Track>
        {ticks &&
          Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => {
            const tick = min + index * step
            return (
              // The track swells around each step, a ring around its dot.
              <span
                key={tick}
                aria-hidden
                data-slot="slider-tick"
                className={cn(
                  "pointer-events-none absolute top-1/2 flex size-3 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full",
                  covered(tick) ? rangeClassName : "bg-muted"
                )}
                style={{ left: position(tick, min, max) }}
              >
                <span
                  className={cn(
                    "size-1 rounded-full",
                    covered(tick) ? "bg-white/90" : "bg-muted-foreground/50"
                  )}
                />
              </span>
            )
          })}
        {_values.map((_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            aria-label={thumbLabel}
            getAriaValueText={getAriaValueText}
            className="relative block size-4 shrink-0 rounded-full border border-ring bg-white shadow-sm ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
