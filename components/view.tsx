import React, { FC } from "react";

interface Props {
  className?: string;
  children?: React.ReactNode;
}

const View: FC<Props> = ({ className, children }) => {
  return (
    <div className={"view " + (className ? className : "")}>{children}</div>
  );
};

export default View;
