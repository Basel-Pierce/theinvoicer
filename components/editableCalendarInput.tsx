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
      className={"input " + (className ? className : "text-sm")}
      selected={selected}
      onChange={onChange ? (date) => onChange(date) : (date) => null}
      dateFormat="MMM dd, yyyy"
    />
  );
};

export default EditableCalendarInput;
