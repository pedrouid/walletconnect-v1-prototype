import * as React from "react";
import styled from "styled-components";

import { IChainData } from "../helpers/types";
import Blockie from "./Blockie";

const SAccount = styled.div`
  display: flex;
  align-items: center;
`;

const SAddress = styled.p`
  font-family: monospace;
  font-size: calc(6px + 1vmin);
  font-weight: bold;
`;

interface IAccountDetailsProps {
  accounts: string[];
  chainData: IChainData;
}

const AccountDetails = (props: IAccountDetailsProps) => {
  const { chainData, accounts } = props;

  return (
    <>
      <div>
        <h6>{"Accounts"}</h6>
        {accounts.map((address: string) => (
          <SAccount key={address}>
            <Blockie size={20} address={address} />
            <SAddress>{address}</SAddress>
          </SAccount>
        ))}
      </div>
      <div>
        <h6>{"Network"}</h6>
        <p>{chainData.name}</p>
      </div>
    </>
  );
};
export default AccountDetails;
