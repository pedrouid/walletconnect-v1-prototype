import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import qrImage from "qr-image";

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

class QRCodeDisplay extends Component {
  state = {
    img: ""
  };

  componentDidMount() {
    this.updateQRCodeImage();
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.data !== this.props.data) {
      this.setState({ data: this.props.data });
      this.updateQRCodeImage();
    }
  }

  updateQRCodeImage() {
    this.setState({ img: "" });
    if (this.props.data) {
      const img = qrImage.imageSync(this.props.data, { type: "svg" });
      this.setState({ img });
    }
  }
  render() {
    return this.state.img ? (
      <SQRCodeDisplay
        dangerouslySetInnerHTML={{ __html: this.state.img }}
        {...this.props}
      />
    ) : null;
  }
}

QRCodeDisplay.propTypes = {
  data: PropTypes.string.isRequired
};

export default QRCodeDisplay;
