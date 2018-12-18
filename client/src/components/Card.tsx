import * as React from "react";
import styled from "styled-components";

import { colors } from "../styles";

interface ICardProps {
  children: React.ReactNode;
}

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

const Card = (props: ICardProps) => {
  return <SCard {...props}>{props.children}</SCard>;
};

export default Card;
