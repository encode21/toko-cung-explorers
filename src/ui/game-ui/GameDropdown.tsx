import { Children, isValidElement, type ComponentProps, type ReactNode } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import "./game-dropdown.css";

type Props = Omit<
  ComponentProps<typeof SelectTrigger>,
  "children" | "defaultValue" | "onChange" | "value"
> & {
  value?: string | undefined;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  children: ReactNode;
  name?: string;
  required?: boolean;
};
const optionText = (children: ReactNode): string =>
  Children.toArray(children)
    .map((child) =>
      isValidElement<{ children?: ReactNode }>(child)
        ? optionText(child.props.children)
        : String(child),
    )
    .join("");

/** Accessible game menu, with the same option declarations as the former native selects. */
export function GameDropdown({
  children,
  value,
  defaultValue,
  onValueChange,
  disabled,
  name,
  required,
  className = "",
  ...triggerProps
}: Props) {
  const options = Children.toArray(children)
    .filter(isValidElement)
    .map((child) => {
      const props = child.props as { value?: string; children?: ReactNode; disabled?: boolean };
      return {
        value: props.value ?? optionText(props.children),
        label: props.children,
        disabled: props.disabled,
      };
    });
  const initialValue = defaultValue ?? options[0]?.value;
  return (
    <Select
      {...(value === undefined ? {} : { value })}
      {...(initialValue === undefined ? {} : { defaultValue: initialValue })}
      {...(onValueChange ? { onValueChange } : {})}
      disabled={disabled ?? false}
      {...(name === undefined ? {} : { name })}
      required={required ?? false}
    >
      <SelectTrigger {...triggerProps} className={`game-dropdown ${className}`}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        className="game-dropdown-menu"
        onEscapeKeyDown={(event) => event.stopPropagation()}
        position="popper"
        sideOffset={6}
        collisionPadding={12}
      >
        {options.map((option) => (
          <SelectItem key={option.value} value={option.value} disabled={option.disabled ?? false}>
            {option.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
