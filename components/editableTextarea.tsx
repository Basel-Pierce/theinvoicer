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
        "input placeholder:text-slate-400 " + (className ? className : "")
      }
      placeholder={placeholder || ""}
      value={value || ""}
      onChange={onChange ? (e) => onChange(e.target.value) : undefined}
    />
  );
};

export default EditableTextarea;
