import * as React from "react";
import styled from "styled-components";
import * as qrImage from "qr-image";

const SQRCodeDisplay = styled.div`
  width: 100%;
  margin: 0 auto;
  display: flex;
  justify-content: center;
  align-items: center;
  & svg {
    width: 100%;
  }
`;

interface IQRCodeDisplayState {
  img: string;
}

interface IQRCodeDisplayProps {
  data: string;
}

class QRCodeDisplay extends React.Component<IQRCodeDisplayProps> {
  public state: IQRCodeDisplayState;

  constructor(props: IQRCodeDisplayProps) {
    super(props);
    this.state = {
      img: ""
    };
  }

  public componentDidMount() {
    this.updateQRCodeImage();
  }

  public componentDidUpdate(prevProps: IQRCodeDisplayProps) {
    if (prevProps.data !== this.props.data) {
      this.setState({ data: this.props.data });
      this.updateQRCodeImage();
    }
  }

  public updateQRCodeImage() {
    this.setState({ img: "" });
    if (this.props.data) {
      const img = qrImage.imageSync(this.props.data, { type: "svg" });
      this.setState({ img });
    }
  }
  public render() {
    const { img } = this.state;
    return img ? (
      <SQRCodeDisplay
        dangerouslySetInnerHTML={{ __html: img }}
        {...this.props}
      />
    ) : null;
  }
}

export default QRCodeDisplay;
