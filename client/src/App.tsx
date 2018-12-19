import * as React from "react";
import styled from "styled-components";

import WalletConnect from "./lib/walletconnect";

import Button from "./components/Button";
import Card from "./components/Card";
import QRCodeDisplay from "./components/QRCodeDisplay";
import QRCodeScanner, {
  IQRCodeValidateResponse
} from "./components/QRCodeScanner";
import { isMobile, initWalletConnect } from "./helpers";

const SContainer = styled.div`
  margin: 0;
  padding: 0;
  width: 100%;
  height: 100%;
  padding: 30px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const STitle = styled.h1`
  margin: 10px auto 20px;
  text-align: center;
  font-size: calc(10px + 2vmin);
`;

interface IAppState {
  loading: boolean;
  mobile: boolean;
  scanner: boolean;
  walletConnector: WalletConnect | null;
}

class App extends React.Component<{}> {
  public state: IAppState;

  constructor(props: any) {
    super(props);
    this.state = {
      loading: false,
      mobile: isMobile(),
      scanner: false,
      walletConnector: null
    };
  }
  public componentDidMount(): void {
    if (!this.state.mobile) {
      this.initWalletConnect();
    }
  }

  public initWalletConnect = async (uri?: string) => {
    this.setState({ loading: true });
    try {
      const walletConnector = await initWalletConnect(uri);

      this.setState({ loading: false, walletConnector });
    } catch (error) {
      this.setState({ loading: false });

      throw error;
    }
  };

  public toggleScanner = (): void => {
    this.setState({ scanner: !this.state.scanner });
  };

  public onQRCodeValidate = (data: string): IQRCodeValidateResponse => {
    const res: IQRCodeValidateResponse = {
      error: null,
      result: null
    };
    try {
      res.result = data;
    } catch (error) {
      res.error = error;
    }

    return res;
  };

  public onQRCodeScan = (data: any): void => {
    if (typeof data === "string") {
      this.initWalletConnect(data);
    }
  };

  public onQRCodeError = (error: Error): void => {
    throw error;
  };

  public onQRCodeClose = (): void => this.toggleScanner();

  public render() {
    const { loading, mobile, walletConnector } = this.state;
    const uri = walletConnector ? walletConnector.uri : "";
    return (
      <SContainer>
        <Card maxWidth={400}>
          <STitle>{mobile ? `Wallet` : `Dapp`}</STitle>
          {mobile ? (
            <Button onClick={this.toggleScanner}>{`Scan`}</Button>
          ) : !loading ? (
            <QRCodeDisplay data={uri} />
          ) : (
            <span>{`loading`}</span>
          )}
        </Card>
        {this.state.scanner && (
          <QRCodeScanner
            onValidate={this.onQRCodeValidate}
            onScan={this.onQRCodeScan}
            onError={this.onQRCodeError}
            onClose={this.onQRCodeClose}
          />
        )}
      </SContainer>
    );
  }
}

export default App;
