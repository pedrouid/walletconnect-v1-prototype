import React, { Component } from "react";
import styled from "styled-components";
import { isMobile } from "./helpers/utils";

import { initWalletConnect } from "./helpers/walletconnect";
import Card from "./Card";
import QRCodeDisplay from "./components/QRCodeDisplay";
import QRCodeScanner from "./components/QRCodeScanner";
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

class App extends Component {
  state = {
    loading: false,
    mobile: isMobile(),
    walletConnector: null
  };
  componentDidMount() {
    if (!this.state.mobile) {
      this.setState({ loading: true });
      initWalletConnect()
        .then(walletConnector => {
          this.setState({ loading: false, walletConnector });
        })
        .catch(err => {
          console.error(err);
          this.setState({ loading: false });
        });
    }
  }
  render() {
    const { mobile, walletConnector } = this.state;

    return (
      <SContainer>
        <div>{mobile ? "Wallet" : "Dapp"}</div>
        <div>
          {mobile ? (
            <Card>
              <QRCodeScanner onScan />
            </Card>
          ) : (
            !!walletConnector && (
              <Card>
                <QRCodeDisplay data={walletConnector.uri} />
              </Card>
            )
          )}
        </div>
      </SContainer>
    );
  }
}

export default App;
