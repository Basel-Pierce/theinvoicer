import React, { FC } from "react";

interface Props {
  children?: React.ReactNode;
}

const Document: FC<Props> = ({ children }) => {
  return <>{children}</>;
};

export default Document;
