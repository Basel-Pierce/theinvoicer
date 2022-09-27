import React, { FC } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

interface Props {
  className?: string;
  value?: string;
  selected?: Date;
  onChange?: (date: Date | [Date, Date] | null) => void;
}

const EditableCalendarInput: FC<Props> = ({
  className,
  value,
  selected,
  onChange,
}) => {
  return (
    <DatePicker
      className={
        "block w-3/4 leading-7 mb-1 placeholder:text-gray-400 rounded-md border-0 hover:bg-orange-50 focus:border-gray-300 focus:shadow-sm focus:border-indigo-500 focus:ring-indigo-500 " +
        (className ? className : "text-sm")
      }
      selected={selected}
      onChange={onChange ? (date) => onChange(date) : (date) => null}
      dateFormat="MMM dd, yyyy"
    />
  );
};

export default EditableCalendarInput;
