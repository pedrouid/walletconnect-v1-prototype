import React, { Component } from "react";
import PropTypes from "prop-types";
import styled from "styled-components";
import QrReader from "react-qr-reader";

const SQRCodeScannerContainer = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 5;
  margin: 0 auto !important;
  background: rgb(0, 0, 0);
`;

const SQRCodeScannerWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  max-width: 600px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
`;

const SCloseButton = styled.div`
  transition: all 0.2s ease-in-out;
  width: 25px;
  height: 25px;
  position: absolute;
  z-index: 10;
  top: 15px;
  right: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: rotate(45deg);
  &:hover {
    opacity: 0.5;
  }
`;

const SFirstLine = styled.div`
  position: absolute;
  width: 90%;
  border: 1px solid rgb(255, 255, 255);
`;

const SSecondLine = styled(SFirstLine)`
  transform: rotate(90deg);
`;

const CloseButton = () => (
  <SCloseButton>
    <SFirstLine />
    <SSecondLine />
  </SCloseButton>
);

class QRCodeScanner extends Component {
  constructor() {
    super();
    this.state = {
      delay: 500
    };
    this.stopRecording.bind(this);
    this.handleScan.bind(this);
    this.handleError.bind(this);
    this.onClose.bind(this);
  }
  stopRecording() {
    this.setState({ delay: false });
  }
  handleScan(data) {
    if (data) {
      const validate = this.props.onValidate(data);
      if (validate.result) {
        this.stopRecording();
        this.props.onScan(validate.data);
      } else {
        validate.onError();
      }
    }
  }
  handleError(error) {
    console.error(error);
    this.props.onError(error);
  }
  onClose() {
    this.stopRecording();
    this.props.onClose();
  }
  componentWillUnmount() {
    this.stopRecording();
  }
  render() {
    return (
      <SQRCodeScannerContainer>
        <CloseButton onClick={this.onClose} />
        <SQRCodeScannerWrapper>
          <QrReader
            delay={this.state.delay}
            onError={this.handleError}
            onScan={this.handleScan}
            style={{ width: "100%" }}
          />
        </SQRCodeScannerWrapper>
      </SQRCodeScannerContainer>
    );
  }
}

QRCodeScanner.propTypes = {
  onScan: PropTypes.func.isRequired,
  onError: PropTypes.func.isRequired,
  onClose: PropTypes.func.isRequired,
  onValidate: PropTypes.func.isRequired
};

export default QRCodeScanner;
