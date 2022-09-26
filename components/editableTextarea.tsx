import React, { FC } from "react";
import TextareaAutosize from "react-textarea-autosize";

interface Props {
  className?: string;
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
  rows?: number;
}

const EditableTextarea: FC<Props> = ({
  className,
  placeholder,
  value,
  onChange,
  rows,
}) => {
  return (
    <TextareaAutosize
      minRows={rows || 1}
      className={
        "block leading-7 mb-1 placeholder:text-gray-400 rounded-md border-0 hover:bg-orange-50 focus:border-gray-300 focus:shadow-sm focus:border-indigo-500 focus:ring-indigo-500 " +
        (className ? className : "")
      }
      placeholder={placeholder || ""}
      value={value || ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    />
  );
};

export default EditableTextarea;
