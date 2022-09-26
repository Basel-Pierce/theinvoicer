import React, { FC, useState } from "react";

export interface SelectOption {
  value: string;
  text: string;
}

interface Props {
  className?: string;
  options?: SelectOption[];
  placeholder?: string;
  value?: string;
  onChange?: (value: string) => void;
}

const EditableSelect: FC<Props> = ({
  className,
  options,
  placeholder,
  value,
  onChange,
}) => {
  const [isEditing, setIsEditing] = useState<boolean>(false);

  return (
    <>
      {isEditing ? (
        <select
          className={"select " + (className ? className : "")}
          value={value}
          onChange={onChange ? (e) => onChange(e.target.value) : undefined}
          onBlur={() => setIsEditing(false)}
          autoFocus={true}
        >
          {options?.map((option) => (
            <option key={option.text} value={option.value}>
              {option.text}
            </option>
          ))}
        </select>
      ) : (
        <input
          readOnly={true}
          type="text"
          className={
            "block leading-7 mb-1 placeholder:text-gray-400 rounded-md border-0 hover:bg-orange-50 focus:border-gray-300 focus:shadow-sm focus:border-indigo-500 focus:ring-indigo-500 " +
            (className ? className : "")
          }
          value={value || ""}
          placeholder={placeholder || ""}
          onFocus={() => setIsEditing(true)}
        />
      )}
    </>
  );
};

export default EditableSelect;
