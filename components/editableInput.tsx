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
        "block leading-7 mb-1 placeholder:text-gray-400 rounded-md border-0 hover:bg-orange-50 focus:border-gray-300 focus:shadow-sm focus:border-indigo-500 focus:ring-indigo-500 " +
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
