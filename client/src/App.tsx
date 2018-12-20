import * as React from "react";
import styled from "styled-components";

import WalletConnect from "./lib/walletconnect";

import Button from "./components/Button";
import Card from "./components/Card";
import QRCodeDisplay from "./components/QRCodeDisplay";
import QRCodeScanner, {
  IQRCodeValidateResponse
} from "./components/QRCodeScanner";
import { isMobile } from "./helpers";

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
  uri: string;
  peer: {
    id: string;
    meta: {
      description: string;
      url: string;
      icons: string[];
      name: string;
    };
  };
  connected: boolean;
  chainId: number;
  accounts: string[];
}

class App extends React.Component<{}> {
  public state: IAppState;

  constructor(props: any) {
    super(props);
    this.state = {
      loading: false,
      mobile: isMobile(),
      scanner: false,
      walletConnector: null,
      uri: "",
      peer: {
        id: "",
        meta: {
          description: "",
          url: "",
          icons: [],
          name: ""
        }
      },
      connected: false,
      chainId: 1,
      accounts: []
    };
  }
  public componentDidMount() {
    if (!this.state.mobile) {
      this.initWalletConnect();
    }
  }

  public initWalletConnect = async () => {
    let { uri } = this.state;

    this.setState({ loading: true });

    try {
      const node = this.generateTestNodeUrl();

      const opts = uri ? { uri } : { node };

      const walletConnector = new WalletConnect(opts);

      await walletConnector.init();

      uri = walletConnector.uri;

      await this.setState({ loading: false, walletConnector, uri });

      this.registerEvents();
    } catch (error) {
      this.setState({ loading: false });

      throw error;
    }
  };

  public generateTestNodeUrl(): string {
    const host: string = window.location.host;
    const protocol: string = window.location.href.startsWith("https")
      ? "wss"
      : "ws";
    const url: string = `${protocol}://${
      process.env.NODE_ENV === "development" ? "localhost:5000" : host
    }`;
    return url;
  }

  public registerEvents = () => {
    const { walletConnector } = this.state;

    if (walletConnector) {
      walletConnector.on("wc_sessionRequest", (error, request) => {
        if (error) {
          throw error;
        }
        this.setState({
          peer: {
            id: request.params[0],
            meta: {
              description: request.params[1].description,
              url: request.params[1].url,
              icons: request.params[1].icons,
              name: request.params[1].name
            }
          }
        });
      });

      walletConnector.on("wc_sessionStatus", (error, request) => {
        if (error) {
          throw error;
        }
        this.setState({
          connected: request.params[0],
          chainId: request.params[1],
          accounts: request.params[2]
        });
      });

      this.setState({ walletConnector });
    }
  };

  public toggleScanner = () => {
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

  public onQRCodeScan = async (data: any) => {
    const uri = typeof data === "string" ? data : "";
    if (uri) {
      await this.setState({ uri });
      await this.initWalletConnect();
      this.toggleScanner();
    }
  };

  public onQRCodeError = (error: Error) => {
    throw error;
  };

  public onQRCodeClose = () => this.toggleScanner();

  public render() {
    const {
      loading,
      mobile,
      uri,
      peer,
      scanner,
      connected,
      accounts,
      chainId
    } = this.state;
    return (
      <SContainer>
        <Card maxWidth={400}>
          <STitle>{mobile ? `Wallet` : `Dapp`}</STitle>
          {mobile ? (
            peer.meta.name ? (
              <div>
                <img src={peer.meta.icons[0]} alt={peer.meta.name} />
                <div>{peer.meta.name}</div>
                <div>{peer.meta.description}</div>
                <div>{peer.meta.url}</div>
              </div>
            ) : (
              <Button onClick={this.toggleScanner}>{`Scan`}</Button>
            )
          ) : !loading ? (
            uri ? (
              connected ? (
                <div>
                  <div>{`accounts: ${JSON.stringify(accounts, null, 2)}`}</div>
                  <div>{`chainId: ${chainId}`}</div>
                </div>
              ) : (
                <QRCodeDisplay data={uri} />
              )
            ) : (
              <span>{`missing uri`}</span>
            )
          ) : (
            <span>{`loading`}</span>
          )}
        </Card>
        {scanner && (
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
