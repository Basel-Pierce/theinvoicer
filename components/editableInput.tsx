import React, { FC, useEffect, useRef } from "react";

interface Props {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  autoFocus?: boolean;
}

const EditableInput: FC<Props> = ({
  className,
  placeholder,
  value,
  onChange,
  autoFocus,
}) => {
  const ref = useRef<HTMLElement>(
    null
  ) as React.MutableRefObject<HTMLInputElement>;

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
    }
  }, [autoFocus]);

  return (
    <input
      type="text"
      className={
        "input placeholder:text-slate-400 " +
        (className ? className : "text-sm")
      }
      placeholder={placeholder || ""}
      value={value || ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
      ref={ref}
    />
  );
};

export default EditableInput;
