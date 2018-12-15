import React from "react";
import styled from "styled-components";

import { colors } from "../styles";

const SCard = styled.div`
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgb(${colors.white});
  border-radius: 6px;
  padding: 20px;
  margin: 20px;
`;

const Card = ({ children, ...props }) => {
  return <SCard {...props}>{children}</SCard>;
};

export default Card;
