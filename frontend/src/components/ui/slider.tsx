import { Slider as SliderPrimitive } from "@base-ui/react/slider"
import { cn } from "cn"

/** Position of `value` along the control, the thumbs staying within it (edge alignment, 0.75rem thumbs). */
function position(value: number, min: number, max: number) {
  const ratio = max > min ? (value - min) / (max - min) : 0
  return `calc(0.375rem + (100% - 0.75rem) * ${ratio})`
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
  range = "start",
  rangeClassName,
  ...props
}: SliderPrimitive.Root.Props & {
  /** Accessible name of the thumbs. */
  thumbLabel?: string
  getAriaValueText?: SliderPrimitive.Thumb.Props["getAriaValueText"]
  /** A dot on every step: a discrete slider. */
  ticks?: boolean
  /** Side of a single thumb filled by the range. */
  range?: "start" | "end"
  rangeClassName?: string
}) {
  const _values = Array.isArray(value)
    ? value
    : Array.isArray(defaultValue)
      ? defaultValue
      : [min, max]
  const single = _values.length === 1 ? _values[0] : null
  const filled = (tick: number) =>
    single !== null && (range === "start" ? tick <= single : tick >= single)

  return (
    <SliderPrimitive.Root
      className={cn("data-horizontal:w-full data-vertical:h-full", className)}
      data-slot="slider"
      defaultValue={defaultValue}
      value={value}
      min={min}
      max={max}
      step={step}
      thumbAlignment="edge"
      {...props}
    >
      <SliderPrimitive.Control className="relative flex w-full touch-none items-center select-none data-disabled:opacity-50 data-vertical:h-full data-vertical:min-h-40 data-vertical:w-auto data-vertical:flex-col">
        <SliderPrimitive.Track
          data-slot="slider-track"
          className="relative grow overflow-hidden rounded-full bg-muted select-none data-horizontal:h-1 data-horizontal:w-full data-vertical:h-full data-vertical:w-1"
        >
          {range === "end" && single !== null ? (
            <div
              data-slot="slider-range"
              className={cn("absolute inset-y-0 right-0 bg-primary", rangeClassName)}
              style={{ left: position(single, min, max) }}
            />
          ) : (
            <SliderPrimitive.Indicator
              data-slot="slider-range"
              className={cn("bg-primary select-none data-horizontal:h-full data-vertical:w-full", rangeClassName)}
            />
          )}
        </SliderPrimitive.Track>
        {ticks &&
          Array.from({ length: Math.floor((max - min) / step) + 1 }, (_, index) => {
            const tick = min + index * step
            return (
              <span
                key={tick}
                aria-hidden
                data-slot="slider-tick"
                className={cn(
                  "pointer-events-none absolute top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full",
                  filled(tick) ? "bg-background/80" : "bg-muted-foreground/40"
                )}
                style={{ left: position(tick, min, max) }}
              />
            )
          })}
        {Array.from({ length: _values.length }, (_, index) => (
          <SliderPrimitive.Thumb
            data-slot="slider-thumb"
            key={index}
            aria-label={thumbLabel}
            getAriaValueText={getAriaValueText}
            className="relative block size-3 shrink-0 rounded-full border border-ring bg-white ring-ring/50 transition-[color,box-shadow] select-none after:absolute after:-inset-2 hover:ring-3 focus-visible:ring-3 focus-visible:outline-hidden active:ring-3 disabled:pointer-events-none disabled:opacity-50"
          />
        ))}
      </SliderPrimitive.Control>
    </SliderPrimitive.Root>
  )
}

export { Slider }
