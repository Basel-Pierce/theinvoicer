import React, { FC } from "react";

interface Props {
  className?: string;
  children?: React.ReactNode;
}

const Page: FC<Props> = ({ className, children }) => {
  return (
    <div className={"page " + (className ? className : "")}>{children}</div>
  );
};

export default Page;
