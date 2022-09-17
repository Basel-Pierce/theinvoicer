import React, { FC } from "react";

interface Props {
  className?: string;
  children?: React.ReactNode;
}

const Text: FC<Props> = ({ className, children }) => {
  return (
    <span className={"span " + (className ? className : "")}>{children}</span>
  );
};

export default Text;
