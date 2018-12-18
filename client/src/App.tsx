import * as React from "react";
import styled from "styled-components";

import WalletConnect from "./lib/walletconnect";

import Card from "./components/Card";
import QRCodeDisplay from "./components/QRCodeDisplay";
import { isMobile, initWalletConnect } from "./helpers";
// import QRCodeScanner from "./components/QRCodeScanner";
import { colors } from "./styles";

const SContainer = styled.div`
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  font-size: calc(10px + 2vmin);
  color: rgb(${colors.lightBlue});
`;

interface IAppState {
  loading: boolean;
  mobile: boolean;
  walletConnector: WalletConnect | null;
}

class App extends React.Component<{}> {
  public state: IAppState;

  constructor(props: any) {
    super(props);
    this.state = {
      loading: false,
      mobile: isMobile(),
      walletConnector: null
    };
  }
  public componentDidMount(): void {
    if (!this.state.mobile) {
      this.setState({ loading: true });
      initWalletConnect()
        .then(walletConnector => {
          this.setState({ loading: false, walletConnector });
        })
        .catch(err => {
          this.setState({ loading: false });
          throw err;
        });
    }
  }
  public render() {
    const { loading, mobile, walletConnector } = this.state;
    const uri = walletConnector ? walletConnector.uri : "";
    return (
      <SContainer>
        <div>{mobile ? "Wallet" : "Dapp"}</div>
        <div>
          {mobile ? (
            <Card>{"Scan"}</Card>
          ) : (
            <Card>{!loading ? <QRCodeDisplay data={uri} /> : "loading"}</Card>
          )}
        </div>
      </SContainer>
    );
  }
}

export default App;
