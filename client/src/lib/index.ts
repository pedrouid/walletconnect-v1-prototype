import Connector from "./connector";
import { IWalletConnectOptions } from "./types";
import * as cryptoLib from "./webCrypto";

class WalletConnect extends Connector {
  constructor(opts: IWalletConnectOptions) {
    super(cryptoLib, opts);
  }
}

export default WalletConnect;
